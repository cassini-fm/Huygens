export type Settings = {
    volume: number;
};

export type PlayerApi = {
    version: () => Promise<string>;
    settings: {
        get: () => Promise<Settings>;
        set: (changes: Partial<Settings>) => Promise<Settings>;
    };
};

export type SourceKind = "";

export type MusicSource = {
    id: number;
    kind: SourceKind;
    name: string;
    url: string;
    username: string;
    position: number;
};

export type NewMusicSource = Omit<MusicSource, "id" | "position"> & { password: string };
