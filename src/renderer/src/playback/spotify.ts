const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const API = "https://api.spotify.com/v1";

let sdk: Promise<void> | undefined;
let failConnect: (error: Error) => void = () => {};

function loadSDK(): Promise<void> {
    sdk ??= new Promise((resolve, reject) => {
        window.onSpotifyWebPlaybackSDKReady = () => resolve();
        const element = document.createElement("script");
        element.src = SDK_URL;
        element.onerror = () => {
            sdk = undefined;
            reject(new Error("Failed to load the Spotify player"));
        };
        document.head.append(element);
    });
    return sdk;
}

export type SpotifyPlayback = {
    player: Spotify.Player;
    play: (uris: string[]) => Promise<void>;
    disconnect: () => void;
};

export async function connectSpotifyPlayback(sourceId: number, name = "Player"): Promise<SpotifyPlayback> {
    await loadSDK();
    const token = () => window.player.spotify.token(sourceId);
    const player = new Spotify.Player({
        name,
        volume: 1,
        getOAuthToken: (callback) => { token().then(callback, (e) => failConnect(e instanceof Error ? e : new Error(String(e)))) },
    });
    const deviceId = await new Promise<string>((resolve, reject) => {
        failConnect = reject;
        player.addListener("ready", ({ device_id }) => resolve(device_id));
        for (const event of ["initialization_error", "authentication_error", "account_error", "playback_error"] as const) {
            player.addListener(event, ({ message }) => reject(new Error(message)));
        }
        player.connect().then((ok) => {
            if (!ok) reject(new Error("Failed to connect to the Spotify player"));
        }, reject);
    });

    async function api(method: string, path: string, body: unknown) {
        const response = await fetch(`${API}${path}`, {
            method,
            headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`Spotify API request failed: ${response.status} ${response.statusText}`);
    }

    return {
        player,
        play: async (uris) => {
            await api("PUT", "/me/player", { device_ids: [deviceId], play: false });
            await api("PUT", `/me/player/play?device_id=${deviceId}`, { uris });
        },
        disconnect: () => player.disconnect(),
    };
}
