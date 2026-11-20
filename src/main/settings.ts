import type { Settings } from "../shared/api.js";
import type { Database } from "./db.js";

const defaults: Settings = {
    volume: 0.5
};

export function readSettings(db: Database): Settings {
    const rows = db.prepare("select key, value from settings;").all() as { key: string; value: string }[];
    const stored = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));
    return { ...defaults, ...stored };
}

export function writeSettings(db: Database, changes: Partial<Settings>): Settings {
    const save = db.prepare("insert into settings (key, value) values (@key, @value) on conflict(key) do update set value = excluded.value;");
    for (const [key, value] of Object.entries(changes)) {
        if (key in defaults && value !== undefined) {
            save.run({ key, value: JSON.stringify(value) });
        }
    }
    return readSettings(db);
}
