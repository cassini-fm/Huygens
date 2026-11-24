<script setup lang="ts">
import { computed, ref } from "vue";
import { next, playback, previous, seek, setVolume, toggle } from "@/playback/player";
import IconPause from "~icons/lucide/pause";
import IconPlay from "~icons/lucide/play";
import IconSkipBack from "~icons/lucide/skip-back";
import IconSkipForward from "~icons/lucide/skip-forward";
import IconVolume from "~icons/lucide/volume-2";

const { current, paused, position, volume, error } = playback;
const seeking = ref<number | null>(null);

function time(ms: number): string {
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const cover = computed(() => (current.value?.cover ? `url("${current.value.cover}")` : "none"));

function onSeek(event: Event) {
    if (!current.value) return;
    void seek(Number((event.target as HTMLInputElement).value));
    seeking.value = null;
}

function onSeekInput(event: Event) {
    seeking.value = Number((event.target as HTMLInputElement).value);
}

function onVolume(event: Event) {
    void setVolume(Number((event.target as HTMLInputElement).value));
}

function onVolumeInput(event: Event) {
    void setVolume(Number((event.target as HTMLInputElement).value), false);
}
</script>

<template>
    <footer class="player-bar">
        <div class="now">
            <span class="cover" :style="{ backgroundImage: cover }"></span>
            <span v-if="current" class="text">
                <span class="title">{{ current.title }}</span>
                <span class="artist">{{ current.artists.join(", ") }}</span>
            </span>
            <span v-else>Nothing playing</span>
        </div>

        <div class="center">
            <div class="controls">
                <button type="button" aria-label="Previous" @click="previous" :disabled="!current"><IconSkipBack /></button>
                <button type="button" :aria-label="paused ? 'Play' : 'Pause'" class="play" @click="toggle" :disabled="!current">
                    <IconPlay v-if="paused" />
                    <IconPause v-else />
                </button>
                <button type="button" aria-label="Next" @click="next" :disabled="!current"><IconSkipForward /></button>
            </div>
            <div class="progress">
                <span class="time">{{ time(position) }}</span>
                <input id="seek" aria-label="Seek bar" type="range" min="0" :max="current?.duration || 0" step="1" :value="position" @change="onSeek" :disabled="!current" :style="{ '--fill': position / (current?.duration || 1) }" />
                <span class="time">{{ time(current?.duration || 0) }}</span>
            </div>
            <span v-if="error" class="error">{{ error }}</span>
        </div>

        <label class="volume" aria-label="Volume">
            <IconVolume />
            <input type="range" min="0" max="1" step="0.01" :value="volume" @change="onVolume" @input="onVolumeInput" :style="{ '--fill': volume }" />
        </label>
    </footer>
</template>

<style scoped lang="scss">
.player-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: center;
    gap: 1.5rem;
    height: 5.75rem;
    padding: 0 1.25rem;
    background: transparent;
}

.now {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    color: var(--muted);
}

.cover {
    width: 3.5rem;
    height: 3.5rem;
    flex: none;
    border-radius: 0.25rem;
    background: var(--raised) center / cover no-repeat;
}

.text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
}

.title, .artist {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.title {
    font-weight: 600;
    color: var(--text);
}

.artist {
    font-size: 0.8rem;
}

.center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.controls {
    display: flex;
    align-items: center;
    gap: 1rem;

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        color: var(--text);
    }

    svg {
        width: 1.25rem;
        height: 1.25rem;
    }

    .play {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: var(--text);
        color: var(--background);

        svg {
            width: 1.125rem;
            height: 1.125rem;
        }
    }

    :deep(svg path) {
        fill: currentColor;
    }
}
.progress {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    max-width: 36rem;
    font-size: 0.75rem;
    color: var(--muted);

    input {
        --track: var(--accent);
        flex: 1;
    }
}

.error {
    font-size: 0.75rem;
}

.volume {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    justify-self: end;
    width: 10rem;

    svg {
        flex: none;
        width: 1.125rem;
        height: 1.125rem;
    }

    input {
        width: 100%;
    }
}

input[type="range"] {
    --fill: 0;
    appearance: none;
    height: 0.25rem;
    margin: 0;
    border-radius: 0.125rem;
    background: linear-gradient(to right, var(--text) calc(var(--fill) * 100%), var(--border) 0);
    cursor: pointer;

    &::-webkit-slider-thumb {
        appearance: none;
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 50%;
        background: var(--text);
        opacity: 0;
        transition: opacity 0.15s;

        &:hover {
            opacity: 1;
        }
    }

    &:disabled {
        cursor: default;
        opacity: 0.5;

        &::-webkit-slider-thumb {
            opacity: 0;
        }
    }
}
</style>
