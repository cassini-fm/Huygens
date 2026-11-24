import { describe, expect, it, vi } from "vitest";
import type { SpotifyTrack } from "../shared/api.js";
import { createMusicBrainz, matchRecording } from "./musicbrainz.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function fakeFetch(handler: (url: string) => Response) {
    return vi.fn(async (url: string | URL | Request) => handler(String(url))) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const track: SpotifyTrack = {
    uri: "spotify:track:123",
    name: "Test Track (Official Video) - Remastered",
    artists: ["Test Artist"],
    album: "Test Album",
    cover: null,
    duration: 123456,
    isrc: "US1234567890",
};

const recording = (id: string, title: string, length: number, extra = {}) => ({
    id,
    title,
    length,
    "artist-credit": [{ name: "Test Artist" }],
    ...extra,
});

describe("createMusicBrainz", () => {
    it("sends the user agent and treats 404 as no results", async () => {
        const fetcher = fakeFetch(() => json({ error: "Not found" }, 404));
        const mb = createMusicBrainz("Huygens/test", fetcher, 0);
        expect(await mb.byIsrc("XX")).toEqual([]);
        const [, init] = fetcher.mock.calls[0]!;
        expect(init.headers["User-Agent"]).toBe("Huygens/test");
    });

    it("waits between requests", async () => {
        const times: number[] = [];
        const fetcher = fakeFetch(() => {
            times.push(Date.now());
            return json({ recordings: [] });
        });
        const mb = createMusicBrainz("Huygens/test", fetcher, 100);
        await Promise.all([mb.search("a", "b"), mb.search("c", "d")]);
        expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(95); //? Allow some leeway for timing issues
    });
});

describe("matchRecording", () => {
    it("uses the ISRC match and prefers the same title", async () => {
        const fetcher = fakeFetch(() => json({ recordings: [recording("live", "Test Track (live)", 200_000), recording("studio", "Test Track", 123456) ] }));
        const mb = createMusicBrainz("Huygens/test", fetcher, 0);
        expect((await matchRecording(mb, track))?.mbid).toBe("studio");
    });

    it("falls back to search and rejects weak results", async () => {
        const fetcher = fakeFetch((url) => url.includes("/isrc/") ? json({}, 404) : json({ recordings: [recording("weak", "Test Track (live)", 123456, { score: 60 }), recording("other", "other track", 200_000, { score: 100 }) ] }));
        const mb = createMusicBrainz("Huygens/test", fetcher, 0);
        expect(await matchRecording(mb, track)).toBeNull();
    });

    it("accepts a strong search result", async () => {
        const fetcher = fakeFetch((url) => url.includes("/isrc/") ? json({}, 404) : json({ recordings: [recording("strong", "Test Track", 123456, { score: 100 }) ] }));
        const mb = createMusicBrainz("Huygens/test", fetcher, 0);
        expect((await matchRecording(mb, track))?.mbid).toBe("strong");
    });
})
