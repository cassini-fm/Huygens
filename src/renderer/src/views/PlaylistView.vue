<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import IconPlay from "~icons/lucide/play";
import IconEllipsis from "~icons/lucide/ellipsis";
import IconListMusic from "~icons/lucide/list-music";
import IconX from "~icons/lucide/x";
import type { MusicSource, PlaylistEntry } from "@shared/api.js";
import { deletePlaylist, library, refreshPlaylists } from "@/library/playlists.js";
import { playTracks } from "@/playback/player.js";

const router = useRouter();
const props = defineProps<{ id: string }>();
const menuOpen = ref(false);
const confirming = ref(false);
const playlistId = computed(() => Number(props.id));
const playlist = computed(() => library.playlists.value.find((item) => item.id === playlistId.value) ?? null);
const playableCount = computed(() => entries.value.filter(playable).length);
const missing = computed(() => entries.value.length - playableCount.value);
const totalTime = computed(() => {
    const minutes = Math.round(entries.value.reduce((sum, entry) => sum + (entry.duration ?? 0), 0) / 60000);
    return minutes === 0 ? "" : minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
});
const entries = ref<PlaylistEntry[]>([]);
const spotify = ref<MusicSource | null>(null);

async function load() {
    if (!playlist.value) return;
    entries.value = await window.player.playlists.entries(playlistId.value);
}

function playable(entry: PlaylistEntry): boolean {
    return spotify.value !== null && entry.sources.spotify !== undefined;
}

function play(entry: PlaylistEntry) {
    if (!spotify.value || !playable(entry)) return;
    const queue = entries.value.filter(playable);
    playTracks(spotify.value, queue.map((item) => item.sources.spotify!), queue.indexOf(entry));
}

async function remove(entry: PlaylistEntry) {
    await window.player.playlists.remove(playlistId.value, entry.id);
    await load();
    await refreshPlaylists();
}

function time(ms: number | null): string {
    if (ms === null) return "";
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function closeMenu(event: FocusEvent) {
    const wrapper = event.currentTarget as HTMLElement;
    if (wrapper.contains(event.relatedTarget as Node | null)) return;
    menuOpen.value = false;
    confirming.value = false;
}

function toggleMenu() {
    menuOpen.value = !menuOpen.value;
    if (!menuOpen.value) confirming.value = false;
}

async function confirmDelete() {
    if (!confirming.value) {
        confirming.value = true;
        return;
    }
    const id = playlistId.value;
    await router.push("/");
    await deletePlaylist(id);
}

watch(playlistId, load, { immediate: true });

onMounted(async () => {
    spotify.value = (await window.player.sources.list()).find((source) => source.kind === "spotify") ?? null;
});
</script>

<template>
    <section v-if="playlist" class="playlist-page">
        <header class="hero">
            <div class="cover" aria-hidden="true"><IconListMusic /></div>
            <div class="info">
                <h1 class="name">{{ playlist.name }}</h1>
                <p class="summary">{{ playlist.count }} {{ playlist.count === 1 ? "track" : "tracks" }}<template v-if="entries.length && totalTime"> - {{ totalTime }}</template></p>
            </div>
        </header>
        <div class="body">
            <div class="actions">
                <button type="button" class="play" aria-label="Play playlist" :disabled="!playableCount"><IconPlay /></button>
                <div class="more" @focusout="closeMenu">
                    <button type="button" class="icon" aria-label="More options" :aria-expanded="menuOpen" @click="toggleMenu"><IconEllipsis /></button>
                    <div v-if="menuOpen" class="menu" role="menu">
                        <button type="button" role="menuitem" class="danger" @click="confirmDelete">{{ confirming ? "Click again to delete" : "Delete Playlist" }}</button>
                    </div>
                </div>
            </div>
            <p v-if="missing" class="notice">{{ missing }} {{ missing === 1 ? "track isn't" : "tracks aren't" }} available on any of your sources.</p>
            <p v-if="!entries.length" class="hint">This playlist is empty.</p>
            <template v-else>
                <div class="row head" aria-hidden="true">
                    <span class="index">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span class="time">Time</span>
                </div>
                <ol class="tracks">
                    <li v-for="(entry, index) in entries" :key="entry.id" class="row" :class="{ unavailable: !playable(entry) }" @dblclick="play(entry)">
                        <span class="index">{{  index + 1 }}</span>
                        <span class="meta">
                            <span class="title">{{ entry.title }}</span>
                            <span class="artists">{{ entry.artists.join(", ") }}</span>
                        </span>
                        <span class="album">{{ entry.album }}</span>
                        <span class="time">{{ time(entry.duration) }}</span>
                        <button type="button" class="remove" :aria-label="`Remove ${entry.title}`" @click="remove(entry)"><IconX /></button>
                    </li>
                </ol>
            </template>
        </div>
    </section>
</template>

<style scoped lang="scss">
.playlist-page {
    display: flex;
    flex-direction: column;
}

.hero {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 2rem;
    padding: 3rem 3rem 1.75rem;
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 15%, var(--background)), var(--background));
}

.body {
    padding: 0 3rem 3rem;
}

.cover {
    display: grid;
    place-items: center;
    flex: none;
    width: 12rem;
    height: 12rem;
    border-radius: 0.25rem;
    background: var(--raised);
    color: var(--muted);
    box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.45);

    svg {
        width: 4rem;
        height: 4rem;
    }
}

.info {
    display: flex;
    flex-direction: column;
    flex: 1 1 20rem;
    gap: 0.9rem;
    min-width: 0;

    h1 {
        font-size: 3.75rem;
        line-height: 0.95;
        letter-spacing: -0.05em;
        overflow-wrap: anywhere;
    }
}

.summary {
    color: var(--muted);
}

.actions {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem 0;
}

.play {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-text);
    transition: transform 0.15s ease-in-out;

    &:not(:disabled):hover {
        transform: scale(1.05);
    }

    :deep(svg) {
        width: 1.5rem;
        height: 1.5rem;
        margin-left: 0.1rem;
    }

    :deep(path) {
        fill: currentColor;
    }
}

.more {
    position: relative;
}

.icon {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    color: var(--muted);

    &:hover {
        color: var(--text);
    }

    svg {
        width: 1.5rem;
        height: 1.5rem;
    }
}

.menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    z-index: 10;
    min-width: 12rem;
    padding: 0.25rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: var(--raised);
    box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.5);

    button {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border-radius: 0.25rem;
        text-align: left;

        &:hover {
            background: var(--surface);
        }
    }

    .danger {
        color: var(--error);
    }
}

.notice {
    margin-bottom: 1.25rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: var(--surface);
}

.row {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1.4fr) minmax(0, 1fr) 4rem 2rem;
    align-items: center;
    gap: 1rem;
    margin: 0 -0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;

    &.head {
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
        border-radius: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
    }

    &:not(.head):hover {
        background: var(--surface);

        .remove {
            opacity: 1;
        }
    }

    &.unavailable .title {
        color: var(--muted);
    }
}

.tracks {
    display: flex;
    flex-direction: column;
    list-style: none;
}

.index, .time {
    text-align: right;
    color: var(--muted);
}

.meta {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.title, .artists, .album {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.title {
    font-size: 0.95rem;
    font-weight: 600;
}

.artists, .album {
    color: var(--muted);
}

.artists {
    font-size: 0.8rem;
}

.remove {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: var(--muted);
    opacity: 0;

    &:hover, &:focus-visible {
        opacity: 1;
        color: var(--text);
    }

    svg {
        width: 1rem;
        height: 1rem;
    }
}
</style>
