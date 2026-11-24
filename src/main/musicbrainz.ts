import type { Recording, SpotifyTrack } from "../shared/api.js";

const BASE = "https://musicbrainz.org/ws/2";

type RawRecording = {
    id: string;
    title: string;
    length: number | null;
    score?: number;
    isrcs?: string[];
    "artist-credit": { name: string }[];
};

export type MusicBrainz = ReturnType<typeof createMusicBrainz>;

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .replace(/\s*[([].*?[)\]]/g, "")
        .replace(/\s+-\s+.*$/, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function toRecording(raw: RawRecording): Recording {
    return {
        mbid: raw.id,
        title: raw.title,
        artists: raw["artist-credit"].map((a) => a.name),
        length: raw.length ?? null,
        isrcs: raw.isrcs ?? [],
        score: raw.score,
    };
}

function quote(text: string): string {
    return `"${text.replace(/[\\"]/g, "\\$&")}"`;
}

export function createMusicBrainz(userAgent: string, fetcher: typeof fetch = fetch, gap = 1100) {
    let queue: Promise<unknown> = Promise.resolve();
    let last = 0;

    function request<T>(path: string): Promise<T | null> {
        const run = queue.then(async () => {
            const wait = last + gap - Date.now();
            if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
            last = Date.now();
            const res = await fetcher(`${BASE}${path}`, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`MusicBrainz request failed: ${res.status} ${res.statusText}`);
            return (await res.json()) as T;
        });
        queue = run.catch(() => undefined);
        return run;
    }
    return {
        async byIsrc(isrc: string): Promise<Recording[]> {
            const body = await request<{ recordings: RawRecording[] }>(`/isrc/${encodeURIComponent(isrc)}?inc=artist-credits+isrc&fmt=json`);
            return body?.recordings.map(toRecording) ?? [];
        },
        async search(title: string, artist: string): Promise<Recording[]> {
            const query = `recording:${quote(title)} AND artist:${quote(artist)}`;
            const body = await request<{ recordings: RawRecording[] }>(`/recording?query=${encodeURIComponent(query)}&inc=artist-credits+isrc&fmt=json`);
            return body?.recordings.map(toRecording) ?? [];
        },
    };
}

export async function matchRecording(mb: MusicBrainz, track: SpotifyTrack): Promise<Recording | null> {
    const closeLength = (recording: Recording) => recording.length === null || Math.abs(recording.length - track.duration) <= 5000;
    const sameTitle = (recording: Recording) => normalize(recording.title) === normalize(track.name);
    const sharesArtist = (recording: Recording) => recording.artists.some((artist) => track.artists.some((other) => normalize(artist) === normalize(other)));

    if (track.isrc) {
        const byIsrc = (await mb.byIsrc(track.isrc)).filter(closeLength);
        const best = byIsrc.find((recording) => sameTitle(recording) && sharesArtist(recording)) ?? byIsrc[0];
        if (best) return best;
    }

    const found = await mb.search(track.name, track.artists[0] ?? "");
    return found.find((recording) => (recording.score ?? 0) >= 90 && closeLength(recording) && sameTitle(recording) && sharesArtist(recording)) ?? null;
}

export function isSpotifyTrack(value: unknown): value is SpotifyTrack {
    if (typeof value !== "object" || value === null) return false;
    const track = value as Record<string, unknown>;
    return (
        typeof track.uri === "string" &&
        typeof track.name === "string" &&
        Array.isArray(track.artists) &&
        track.artists.every((artist) => typeof artist === "string") &&
        typeof track.duration === "number" &&
        (track.isrc === null || typeof track.isrc === "string")
    );
}
