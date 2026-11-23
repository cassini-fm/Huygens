import { watch } from "vue";
import { next, playback, previous, seek, toggle } from "./player.js";

export function setupMediaSession(): void {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;

    watch(playback.current, (track) => {
        session.metadata = track ? new MediaMetadata({
            title: track.title,
            artist: track.artists.join(", "),
            album: track.album,
            artwork: track.cover ? [{ src: track.cover, sizes: "640x640", type: "image/jpeg" }] : [],
        }) : null;
    }, { immediate: true });

    watch([playback.current, playback.paused], ([track, paused]) => {
        const playbackState = paused ? "paused" : "playing";
        session.playbackState = track ? playbackState : "none";
        if (track && track.duration > 0) {
            session.setPositionState({
                duration: track.duration / 1000,
                position: Math.min(playback.position.value, track.duration) / 1000,
                playbackRate: 1,
            });
        }
    }, { immediate: true });

    session.setActionHandler("play", () => {
        if (playback.paused.value) void toggle();
    });
    session.setActionHandler("pause", () => {
        if (!playback.paused.value) void toggle();
    });
    session.setActionHandler("previoustrack", () => void previous());
    session.setActionHandler("nexttrack", () => void next());
    session.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) void seek(details.seekTime * 1000);
    });
}
