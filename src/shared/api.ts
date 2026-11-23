export const themes = ["enceladus", "huygens"] as const;

export type ThemeName = (typeof themes)[number];
export type ThemeMode = "system" | "light" | "dark";

export type Settings = {
    volume: number;
    theme: ThemeName;
    mode: ThemeMode;
};

export type PlayerApi = {
    version: () => Promise<string>;
    settings: {
        get: () => Promise<Settings>;
        set: (changes: Partial<Settings>) => Promise<Settings>;
    };
    sources: {
        list: () => Promise<MusicSource[]>;
        reorder: (ids: number[]) => Promise<void>;
        remove: (id: number) => Promise<void>;
    };
    spotify: {
        connect: (clientId: string) => Promise<MusicSource>;
        token: (id: number) => Promise<string>;
    };
};

export type SourceKind = "spotify";

export type MusicSource = {
    id: number;
    kind: SourceKind;
    name: string;
    url: string;
    username: string;
    position: number;
};

export type NewMusicSource = Omit<MusicSource, "id" | "position"> & { password: string };
