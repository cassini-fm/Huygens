import { describe, expect, it } from "vitest";
import { openDatabase } from "./db.js";
import type { Cipher } from "./secrets.js";
import { addSource, listSources, readPassword, removeSource, reorderSources } from "./sources.js";

function fakeCipher(stale = false): Cipher & { encrypted: number } {
    const cipher = {
        encrypted: 0,
        encrypt: async (plain: string) => {
            cipher.encrypted++;
            return new TextEncoder().encode(`encrypted:${plain}`);
        },
        decrypt: async (data: Uint8Array) => ({ plain: new TextDecoder().decode(data).slice("encrypted:".length), stale }),
    };
    return cipher;
}

const fakeSource = { kind: "" as const, name: "test", url: "https://example.com", username: "testuser", password: "testpass" };

describe("sources", () => {
    it("adds sources at the end and lists them in order", async () => {
        const db = openDatabase(":memory:");
        const cipher = fakeCipher();
        const first = await addSource(db, cipher, fakeSource);
        const second = await addSource(db, cipher, { ...fakeSource, name: "second" });
        expect([first.position, second.position]).toEqual([0, 1]);
        expect(listSources(db).map((source) => source.name)).toEqual(["test", "second"]);
    });

    it("never stores or lists the plain password", async () => {
        const db = await openDatabase(":memory:");
        const { id } = await addSource(db, fakeCipher(), fakeSource);
        const row = db.prepare("select secret from sources where id = ?").get(id) as { secret: Uint8Array };
        expect(new TextDecoder().decode(row.secret)).not.toBe("testpass");
        expect(JSON.stringify(listSources(db))).not.toContain("testpass");
    });

    it("reads the password back and reencrypts a stale one", async () => {
        const db = openDatabase(":memory:");
        const cipher = fakeCipher(true);
        const { id } = await addSource(db, cipher, fakeSource);
        expect(await readPassword(db, cipher, id)).toBe("testpass");
        expect(cipher.encrypted).toBe(2);
        expect(await readPassword(db, cipher, 999)).toBeNull();
    });

    it("reorders and removes sources", async () => {
        const db = openDatabase(":memory:");
        const cipher = fakeCipher();
        const a = await addSource(db, cipher, { ...fakeSource, name: "a" });
        const b = await addSource(db, cipher, { ...fakeSource, name: "b" });
        const c = await addSource(db, cipher, { ...fakeSource, name: "c" });
        reorderSources(db, [c.id, a.id, b.id]);
        expect(listSources(db).map((source) => source.name)).toEqual(["c", "a", "b"]);
        removeSource(db, a.id);
        expect(listSources(db).map((source) => source.name)).toEqual(["c", "b"]);
    });
});
