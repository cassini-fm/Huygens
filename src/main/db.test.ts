import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./db";
import { readSettings, writeSettings } from "./settings";

describe("database", () => {
    it("creates the tables and records the schema version", () => {
        const db = openDatabase(":memory:");
        const tables = db.prepare("select name from sqlite_master where type='table' order by name;").all() as { name: string }[];
        expect(tables.map((row) => row.name)).toEqual(["listens", "settings"]);
        expect(db.prepare("pragma user_version;").get()).toEqual({ user_version: 1 });
        db.close();
    });

    it("keeps the data when the file is opened again", () => {
        const path = join(mkdtempSync(join(tmpdir(), "player-")), "player.db");
        const first = openDatabase(path);
        writeSettings(first, { volume: 0.1 });
        first.close();

        const second = openDatabase(path);
        expect(readSettings(second)).toEqual({ volume: 0.1 });
        expect(second.prepare("pragma user_version;").get()).toEqual({ user_version: 1 });
        second.close();
    });
});

describe("settings", () => {
    it("falls back to the defaults", () => {
        expect(readSettings(openDatabase(":memory:"))).toEqual({ volume: 0.5 });
    });

    it("saves changes and ignores unknown keys", () => {
        const db = openDatabase(":memory:");
        writeSettings(db, { volume: 0.1 });
        expect(readSettings(db)).toEqual({ volume: 0.1 });
        writeSettings(db, { volume: 0.2, unknown: "ignored" } as never);
        expect(readSettings(db)).toEqual({ volume: 0.2 });
        db.close();
    });
});
