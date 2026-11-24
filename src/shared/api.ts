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
    musicbrainz: {
        match: (track: SpotifyTrack) => Promise<Recording | null>;
    };
    playlists: {
        list: () => Promise<Playlist[]>;
        create: (name: string) => Promise<Playlist>;
        rename: (id: number, name: string) => Promise<void>;
        delete: (id: number) => Promise<void>;
        entries: (id: number) => Promise<PlaylistEntry[]>;
        add: (playlistId: number, entry: NewPlaylistEntry) => Promise<number>;
        remove: (playlistId: number, entryId: number) => Promise<void>;
        move: (playlistId: number, entryId: number, to: number) => Promise<void>;
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
    recordingMbid: string | null;
};

export type Recording = {
    mbid: string;
    title: string;
    artists: string[];
    length: number | null;
    isrcs: string[];
    score?: number;
};

export type Playlist = {
    id: number;
    name: string;
    createdAt: number;
    count: number;
};

export type PlaylistEntry = {
    id: number;
    position: number;
    recordingMbid: string | null;
    title: string;
    artists: string[];
    album: string | null;
    duration: number | null;
    isrc: string | null;
    sources: Record<string, string>;
};

export type NewPlaylistEntry = Omit<PlaylistEntry, "id" | "position">;
