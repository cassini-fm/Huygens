import type { MusicSource } from "../shared/api.js";
import type { Database } from "./db.js";
import type { Cipher } from "./secrets.js";
import { addSource, readPassword, writePassword } from "./sources.js";
import { currentUser, login, refresh, SpotifyError, type SpotifyTokens } from "./spotify.js";

type Stored = { clientId: string; refreshToken: string };

const EXPIRY_MARGIN = 60 * 1000;
const cache = new Map<number, SpotifyTokens>();
const inflight = new Map<number, Promise<SpotifyTokens>>();

export async function connectSpotify(db: Database, cipher: Cipher, clientId: string, open: (url: string) => Promise<void>, fetcher: typeof fetch = fetch): Promise<MusicSource> {
    const tokens = await login(clientId, open, fetcher);
    const user = await currentUser(tokens.accessToken, fetcher);
    const stored: Stored = { clientId, refreshToken: tokens.refreshToken };
    const source = await addSource(db, cipher, { kind: "spotify", name: user.name, url: "https://api.spotify.com", username: user.id, password: JSON.stringify(stored) });
    cache.set(source.id, tokens);
    return source;
}

export function forgetSpotify(id: number): void {
    cache.delete(id);
}

async function renew(db: Database, cipher: Cipher, id: number, fetcher: typeof fetch = fetch): Promise<SpotifyTokens> {
    const plain = await readPassword(db, cipher, id);
    if (!plain) throw new SpotifyError("No stored credentials for this source");
    const stored = JSON.parse(plain) as Stored;
    const tokens = await refresh(stored.clientId, stored.refreshToken, fetcher);
    if (tokens.refreshToken !== stored.refreshToken) {
        await writePassword(db, cipher, id, JSON.stringify({ ...stored, refreshToken: tokens.refreshToken }));
    }
    cache.set(id, tokens);
    return tokens;
}

export async function getSpotifyToken(db: Database, cipher: Cipher, id: number, fetcher: typeof fetch = fetch): Promise<string> {
    const cached = cache.get(id);
    if (cached && cached.expiresAt - EXPIRY_MARGIN > Date.now()) return cached.accessToken;
    let pending = inflight.get(id);
    if (!pending) {
        pending = renew(db, cipher, id, fetcher).finally(() => inflight.delete(id));
        inflight.set(id, pending);
    }
    return (await pending).accessToken;
}
