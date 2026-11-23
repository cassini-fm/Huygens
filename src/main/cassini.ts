import type { StoredListen } from "./listens.js";

function spotifyUrl(uri: string | null): string | undefined {
    const id = uri?.startsWith("spotify:track:") ? uri.slice("spotify:track:".length) : undefined;
    return id ? `https://open.spotify.com/track/${id}` : undefined;
}

export function toPayload(listen: StoredListen, version: string) {
    return {
        listened_at: listen.playedAt,
        track_metadata: {
            artist_name: listen.artists.join(", "),
            track_name: listen.track,
            release_name: listen.album ?? undefined,
            additional_info: {
                artist_names: listen.artists,
                duration_ms: listen.duration ?? undefined,
                isrc: listen.isrc ?? undefined,
                spotify_url: spotifyUrl(listen.trackId),
                media_player: "Huygens",
                submission_client: "Huygens",
                submission_client_version: version,
            },
        },
    };
}

export async function submitListen(baseUrl: string, token: string, listens: StoredListen[], version: string, fetcher: typeof fetch = fetch): Promise<void> {
    if (listens.length === 0) return;
    const res = await fetcher(`${baseUrl}/1/submit-listens`, {
        method: "POST",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listen_type: "import", payload: listens.map((listen) => toPayload(listen, version)) }),
    });
    if (!res.ok) throw new Error(`Cassini sync failed: ${res.status} ${res.statusText}`);
}
