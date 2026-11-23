import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { SpotifyTrack } from "../shared/api.js";

export const REDIRECT_PORT = 8888;
export const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
const SCOPES = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";
const LOGIN_TIMEOUT = 5 * 60 * 1000;

export type SpotifyTokens = { accessToken: string; refreshToken: string; expiresAt: number };
export type SpotifyUser = { id: string; name: string };

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

export class SpotifyError extends Error {}

export function pkcePair(): { verifier: string; challenge: string } {
    const verifier = randomBytes(64).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
}

export function authorizeUrl(clientId: string, challenge: string, state: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: "S256",
        code_challenge: challenge,
        state
    });
    return `https://accounts.spotify.com/authorize?${params}`;
}

function waitForCode(state: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new SpotifyError("Login timed out"), null), LOGIN_TIMEOUT);
        function finish(error: Error | null, code: string | null) {
            clearTimeout(timer);
            server.close();
            if (error || !code) reject(error ?? new SpotifyError("Login failed"));
            else resolve(code);
        }
        const server = createServer((req, res) => {
            const url = new URL(req.url ?? "/", REDIRECT_URI); 
            if (url.pathname !== "/callback") {
                res.writeHead(404).end();
                return;
            }
            const code = url.searchParams.get("code");
            const ok = code !== null && url.searchParams.get("state") === state;
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(ok ? "Logged in. You can close this tab." : "Login failed. Please try again.");
            finish(ok ? null : new SpotifyError(url.searchParams.get("error") ?? "Unknown error"), code);
        });
        server.on("error", (error) => finish(error, null));
        server.listen(REDIRECT_PORT, "127.0.0.1");
    });
}

async function tokenRequest(body: Record<string, string>, fetcher: typeof fetch): Promise<TokenResponse> {
    const response = await fetcher("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body)
    });
    if (!response.ok) throw new SpotifyError(`Token request failed: ${response.status} ${response.statusText}`);
    return (await response.json()) as TokenResponse;
}

function toTokens(data: TokenResponse, previousRefreshToken?: string): SpotifyTokens {
    const refreshToken = data.refresh_token ?? previousRefreshToken;
    if (!refreshToken) throw new SpotifyError("No refresh token received");
    return { accessToken: data.access_token, refreshToken, expiresAt: Date.now() + data.expires_in * 1000 };
}

export async function login(clientId: string, open: (url: string) => Promise<void>, fetcher: typeof fetch = fetch): Promise<SpotifyTokens> {
    const { verifier, challenge } = pkcePair();
    const state = randomBytes(16).toString("hex");
    const codePromise = waitForCode(state);
    await open(authorizeUrl(clientId, challenge, state));
    const code = await codePromise;
    const data = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI, client_id: clientId, code_verifier: verifier }, fetcher);
    return toTokens(data);
}

export async function refresh(clientId: string, refreshToken: string, fetcher: typeof fetch = fetch): Promise<SpotifyTokens> {
    const data = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }, fetcher);
    return toTokens(data, refreshToken);
}

export async function currentUser(accessToken: string, fetcher: typeof fetch = fetch): Promise<SpotifyUser> {
    const response = await fetcher("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new SpotifyError(`Current user request failed: ${response.status} ${response.statusText}`);
    const me = (await response.json()) as { id: string; display_name: string | null };
    return { id: me.id, name: me.display_name ?? me.id };
}

type RawTrack = {
    uri: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string; width: number }[] };
    duration: number;
    external_ids?: { isrc?: string };
}

function toTrack(raw: RawTrack): SpotifyTrack {
    const images = [...raw.album.images].sort((a, b) => a.width - b.width);
    const cover = images.find((image) => image.width >= 512) ?? images.at(-1);
    return {
        uri: raw.uri,
        name: raw.name,
        artists: raw.artists.map((artist) => artist.name),
        album: raw.album.name,
        cover: cover?.url ?? null,
        duration: raw.duration,
        isrc: raw.external_ids?.isrc ?? null
    };
}

export async function searchTracks(token: string, query: string, fetcher: typeof fetch = fetch): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams({ q: query, type: "track", limit: "10" });
    const res = await fetcher(`https://api.spotify.com/v1/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new SpotifyError(`Spotify search failed: ${res.status} ${res.statusText}`);
    const body = (await res.json()) as { tracks: { items: RawTrack[] } };
    return body.tracks.items.map(toTrack);
}
