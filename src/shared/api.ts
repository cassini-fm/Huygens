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
        search: (sourceId: number, query: string) => Promise<SpotifyTrack[]>;
    };
    listens: {
        record: (listen: NewListen) => Promise<number>;
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

export type SpotifyTrack = {
    uri: string;
    name: string;
    artists: string[];
    album: string;
    cover: string | null;
    duration: number;
    isrc: string | null;
}

export type NewListen = {
    playedAt: number;
    artists: string[];
    track: string;
    trackId: string | null;
    album: string | null;
    duration: number | null;
    isrc: string | null;
    source: string;
};
