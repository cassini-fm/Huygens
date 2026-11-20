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
