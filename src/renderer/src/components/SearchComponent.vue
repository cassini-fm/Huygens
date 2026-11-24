<script setup lang="ts">
import { onMounted, ref, toRaw, watch } from "vue";
import type { MusicSource, SpotifyTrack } from "@shared/api.js";
import { playTracks } from "@/playback/player";
import { rememberMbid } from "@/playback/listens";

const query = ref("");
const results = ref<SpotifyTrack[]>([]);
const error = ref("");
const source = ref<MusicSource | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;
let latest = 0;

watch(query, (text) => {
    clearTimeout(timer);
    timer = setTimeout(() => search(text), 300);
});

async function search(text: string) {
    if (source.value === null || !text.trim()) {
        results.value = [];
        return;
    }

    const id = ++latest;
    try {
        const found = await window.player.spotify.search(source.value.id, text);
        if (id === latest) {
            results.value = found;
            error.value = "";
        }
    } catch {
        if (id === latest) error.value = "Search failed";
    }
}

function play(index: number) {
    const track = results.value[index];
    if (source.value === null || !track) return;
    playTracks(source.value, [track.uri]);
    window.player.musicbrainz.match(toRaw(track)).then((recording) => recording && rememberMbid(track.uri, recording.mbid)).catch((err) => console.error("MusicBrainz match failed:", err));
    query.value = "";
    results.value = [];
}

function time(ms: number): string {
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

onMounted(async () => {
    const sources = await window.player.sources.list();
    source.value = sources.find((source) => source.kind === "spotify") ?? null;
});
</script>

<template>
    <section class="search">
        <input type="text" placeholder="Search Spotify" aria-label="Search" v-model="query" :disabled="source === null" @keydown.esc="query = ''" autofocus />
        <p v-if="source === null" class="hint">Connect Spotify in Settings to search.</p>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="!results.length && query" class="hint">No results found.</p>
        <ol v-if="results.length" class="results">
            <li v-for="(track, index) in results" :key="track.uri" @dblclick="play(index)">
                <img :src="track.cover ?? ''" alt="Cover" width="40" height="40" />
                <span class="title">{{ track.name }}</span>
                <span class="artists">{{ track.artists.join(", ") }}</span>
                <span class="album">{{ track.album }}</span>
                <span class="time">{{ time(track.duration) }}</span>
            </li>
        </ol>
    </section>
</template>

<style scoped lang="scss">
.search {
    position: relative;
}

.results {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    z-index: 10;
    max-height: 24vh;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    background: var(--raised);
    border: 1px solid var(--border);
    border-radius: 0.25rem;
}
</style>
