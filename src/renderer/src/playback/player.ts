import { readonly, ref } from "vue";
import type { MusicSource } from "@shared/api.js"
import { connectSpotifyPlayback, type SpotifyPlayback } from "./spotify.js";
import { addHeard, startCandidate } from "./listens.js";

export type NowPlaying = {
    title: string;
    artists: string[];
    album: string;
    cover?: string;
    duration: number;
    sourceId: number;
};

type Saved = { uris: string[]; index: number; position: number; now: NowPlaying };

const current = ref<NowPlaying | null>(null);
const paused = ref(true);
const position = ref(0);
const volume = ref(1);
const error = ref("");
const SAVED_KEY = "huygens:playback";

let spotify: SpotifyPlayback | undefined;
let ticker: number | undefined;
let currentUri: string | null = null;
let queue: string[] = [];
let pending: Saved | null = null;

export function gain(level: number): number {
    const clamped = Math.min(1, Math.max(0, level));
    return clamped === 0 ? 0 : Math.pow(clamped, 2.5); //todo find a better volume curve
}

function stopTicker() {
    if (ticker !== undefined) window.clearInterval(ticker);
    ticker = undefined;
}

function tick() {
    stopTicker();
    let last = performance.now();
    ticker = window.setInterval(() => {
        const now = performance.now();
        const elapsed = now - last;
        last = now;
        if (paused.value || !current.value) return;
        position.value = Math.min(current.value.duration, position.value + elapsed);
        addHeard(elapsed);
    }, 250);
}

async function spotifyPlayback(sourceId: number): Promise<SpotifyPlayback> {
    if (spotify) return spotify;
    const playback = await connectSpotifyPlayback(sourceId, "Huygens");
    playback.player.addListener("player_state_changed", (state) => {
        if (!state) {
            current.value = null;
            paused.value = true;
            currentUri = null;
            stopTicker();
            return;
        }
        pending = null;
        const track = state.track_window.current_track;
        if (track.uri !== currentUri) {
            currentUri = track.uri;
            startCandidate({
                playedAt: Math.floor(Date.now() / 1000),
                artists: track.artists.map((artist) => artist.name),
                track: track.name,
                trackId: track.uri,
                album: track.album.name,
                duration: state.duration,
                isrc: null,
                source: "spotify",
                recordingMbid: null,
            });
            position.value = 0;
            window.setTimeout(async () => {
                const fresh = await playback.player.getCurrentState();
                if (fresh?.track_window.current_track.uri === currentUri) position.value = fresh.position;
            }, 500);
        } else {
            position.value = state.position;
        }
        current.value = {
            title: track.name,
            artists: track.artists.map((artist) => artist.name),
            album: track.album.name,
            cover: track.album.images[0]?.url,
            duration: state.duration,
            sourceId,
        };
        paused.value = state.paused;
        tick();
        save();
    });
    playback.player.addListener("playback_error", ({ message }) => (error.value = message));
    await playback.player.setVolume(gain(volume.value));
    spotify = playback;
    return playback;
}

export async function playTracks(source: MusicSource, uris: string[], start: number = 0): Promise<void> {
    error.value = "";
    try {
        if (source.kind !== "spotify") throw new Error("Unsupported source kind");
        const playback = await spotifyPlayback(source.id);
        queue = uris;
        await playback.play(uris, start);
    } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
    }
}

export async function toggle(): Promise<void> {
    if (pending && spotify) {
        const saved = pending;
        pending = null;
        try {
            await spotify.play(saved.uris, saved.index, saved.position);
        } catch (err) {
            pending = saved;
            error.value = err instanceof Error ? err.message : String(err);
        }
        return;
    }
    await spotify?.player.togglePlay();
}

export async function seek(ms: number): Promise<void> {
    position.value = ms;
    if (pending) pending.position = ms;
    await spotify?.player.seek(ms);
}

export async function setVolume(level: number, save: boolean = true): Promise<void> {
    volume.value = Math.min(1, Math.max(0, level));
    await spotify?.player.setVolume(gain(volume.value));
    if (save) await window.player.settings.set({ volume: volume.value });
}

export async function loadVolume(): Promise<void> {
    const settings = await window.player.settings.get();
    volume.value = settings.volume;
    await spotify?.player.setVolume(gain(volume.value));
}

export const playback = {
    current: readonly(current),
    paused: readonly(paused),
    position: readonly(position),
    volume: readonly(volume),
    error: readonly(error),
};

export async function next(): Promise<void> {
    const state = await spotify?.player.getCurrentState();
    if (!spotify || !state) return;
    if (state.track_window.next_tracks.length > 0) {
        await spotify.player.nextTrack();
    } else {
        await spotify.player.pause();
        await seek(0);
    }
}

export async function previous(): Promise<void> {
    const state = await spotify?.player.getCurrentState();
    if (!spotify || !state) return;
    if (state.position > 5000 || state.track_window.previous_tracks.length === 0) {
        await seek(0);
    } else {
        await spotify.player.previousTrack();
    }
}

export async function initPlayback(): Promise<void> {
    const sources = await window.player.sources.list();
    const source = sources.find((source) => source.kind === "spotify");
    if (!source) return;
    try {
        await spotifyPlayback(source.id);
        const saved = loadSaved();
        if (saved && !current.value) {
            pending = saved;
            queue = saved.uris;
            current.value = saved.now;
            position.value = saved.position;
            paused.value = true;
            if (sessionStorage.getItem("huygens:playing") === "true") await toggle();
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
    }
}

import.meta.hot?.dispose(() => spotify?.disconnect());

function save() {
    if (!current.value || !currentUri) return;
    const uris = queue.includes(currentUri) ? queue : [currentUri];
    const saved: Saved = { uris, index: uris.indexOf(currentUri), position: position.value, now: current.value };
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    sessionStorage.setItem("huygens:playing", String(!paused.value));
}

function loadSaved(): Saved | null {
    try {
        return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
    } catch {
        return null;
    }
}

window.addEventListener("beforeunload", save);
