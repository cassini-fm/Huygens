<script setup lang="ts">
import { onMounted, ref, toRaw, watch } from "vue";
import type { MusicSource, SpotifyTrack } from "@shared/api.js";
import { playTracks } from "@/playback/player";
import { rememberMbid } from "@/playback/listens";
import IconSearch from "~icons/lucide/search";

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
        <label class="field">
            <IconSearch aria-hidden="true" />
            <input type="text" placeholder="Search Spotify" aria-label="Search" v-model="query" :disabled="source === null" @keydown.esc="query = ''" autofocus />
        </label>
        <p v-if="source === null" class="hint">Connect Spotify in Settings to search.</p>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="!results.length && query" class="hint">No results found.</p>
        <ol v-if="results.length" class="results">
            <li v-for="(track, index) in results" :key="track.uri" @dblclick="play(index)">
                <img v-if="track.cover" :src="track.cover" alt="Cover" width="40" height="40" />
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
    width: 20rem;
    max-width: 100%;
}

.field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 2.5rem;
    padding: 0 0.9rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: var(--surface);
    color: var(--muted);

    &:focus-within {
        border-color: var(--accent);
    }

    svg {
        flex: none;
        width: 1rem;
        height: 1rem;
    }

    input {
        flex: 1;
        min-width: 0;
        border: 0;
        background: none;
        color: var(--text);
        font: inherit;
    }
}

.hint, .error {
    margin-top: 0.5rem;
}

.results {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    z-index: 20;
    width: 36vh;
    max-height: 50vh;
    overflow-y: auto;
    list-style: none;
    padding: 0.25rem;
    background: var(--raised);
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.5);

    li {
        display: grid;
        grid-template-columns: 2.5rem minmax(0, 1fr) minmax(0, 0.8fr) auto;
        align-items: center;
        gap: 0.9rem;
        padding: 0.4rem 0.5rem;
        border-radius: 0.25rem;

        &:hover {
            background: var(--surface);
        }
    }

    img {
        border-radius: 0.125rem;
        object-fit: cover;
    }
}

.text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.title, .artists, .album {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.title {
    font-weight: 60;
}

.artists, .album, .time {
    font-size: 0.8rem;
    color: var(--muted);
}

</style>
