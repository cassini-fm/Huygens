import { type Settings, type ThemeMode, type ThemeName, themes } from "../shared/api.js";
import type { Database } from "./db.js";

const defaults: Settings = {
    volume: 0.5,
    theme: "enceladus",
    mode: "system",
};

const valid: { [key in keyof Settings]: (value: unknown) => boolean } = {
    volume: (value) => typeof value === "number" && value >= 0 && value <= 1,
    theme: (value) => themes.includes(value as ThemeName),
    mode: (value) => ["system", "light", "dark"].includes(value as ThemeMode),
}

export function readSettings(db: Database): Settings {
    const rows = db.prepare("select key, value from settings;").all() as { key: string; value: string }[];
    const stored = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));
    return { ...defaults, ...stored };
}

export function writeSettings(db: Database, changes: Partial<Settings>): Settings {
    const save = db.prepare("insert into settings (key, value) values (@key, @value) on conflict(key) do update set value = excluded.value;");
    for (const [key, value] of Object.entries(changes)) {
        if (key in valid && valid[key as keyof Settings](value)) {
            save.run({ key, value: JSON.stringify(value) });
        }
    }
    return readSettings(db);
}
