import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./db.js";
import { recordListen } from "./listens.js";

describe("recordListen", () => {
    it("stores a listen with artists as JSON", () => {
        const db = new DatabaseSync(":memory:");
        migrate(db);
        const id = recordListen(db, {
            playedAt: 1234567890,
            artists: ["Artist 1", "Artist 2"],
            track: "Track Name",
            trackId: "spotify:track:123",
            album: "Album Name",
            duration: 18000,
            isrc: null,
            source: "spotify",
        });
        const row = db.prepare("select * from listens where id = ?").get(id) as { artists: string, synced_at: number | null };
        expect(JSON.parse(row.artists)).toEqual(["Artist 1", "Artist 2"]);
        expect(row.synced_at).toBeNull();
    });
});
