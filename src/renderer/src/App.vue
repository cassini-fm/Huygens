<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import IconHouse from "~icons/lucide/house";
import IconPlus from "~icons/lucide/plus";
import IconSettings from "~icons/lucide/settings";
import { setupMediaSession } from "@/playback/mediaSession.js";
import { initPlayback, loadVolume } from "@/playback/player.js";
import { library, newPlaylist, refreshPlaylists } from "@/library/playlists.js";
import TrackSearch from "@/components/SearchComponent.vue";
import PlayerBar from "@/components/PlayerBar.vue";

const router = useRouter();
const version = ref("");
const creating = ref(false);
const newName = ref("");
const nameField = ref<HTMLInputElement | null>(null);

async function startCreating() {
    creating.value = true;
    await nextTick();
    nameField.value?.focus();
}

async function createPlaylist() {
    const name = newName.value.trim();
    creating.value = false;
    newName.value = "";
    if (!name) return;
    const playlist = await newPlaylist(name);
    await router.push(`/playlist/${playlist.id}`);
}

onMounted(async () => {
    setupMediaSession();
    const settings = await window.player.settings.get();
    document.documentElement.dataset.theme = settings.theme;
    await loadVolume();
    await refreshPlaylists();
    version.value = await window.player.version();
    await initPlayback();
});
</script>

<template>
    <div class="layout">
        <header class="titlebar">
            <TrackSearch class="search" />
        </header>
        <nav class="sidebar">
            <RouterLink to="/">
                <IconHouse />
                Home
            </RouterLink>
            <RouterLink to="/settings">
                <IconSettings />
                Settings
            </RouterLink>
            <div class="playlists">
                <div class="heading">
                    <span>Playlists</span>
                    <button class="add" aria-label="New Playlist" @click="startCreating"><IconPlus /></button>
                </div>
                <input type="text" v-if="creating" ref="nameField" v-model="newName" class="new-name" placeholder="Playlist name" aria-label="New Playlist Name" @keydown.enter="createPlaylist" @keydown.esc="creating = false" @blur="createPlaylist" />
                <RouterLink v-for="playlist in library.playlists.value" :key="playlist.id" :to="`/playlist/${playlist.id}`" class="playlist">
                    <span class="cover" aria-hidden="true"></span>
                    <span class="info">
                        <span class="name">{{ playlist.name }}</span>
                        <span class="meta">{{ playlist.count }} {{  playlist.count === 1 ? "track" : "tracks" }}</span>
                    </span>
                </RouterLink>
            </div>
            <span class="version">v{{ version }}</span>
        </nav>
        <div class="column">
            <main class="content">
                <RouterView />
            </main>
        </div>
        <PlayerBar class="bar" />
    </div>
</template>

<style scoped lang="scss">
.layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-rows: 3rem minmax(0, 1fr) auto;
    height: 100vh;
}

.titlebar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    padding: 0 calc(100% - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100%)) 0 18rem;
    -webkit-app-region: drag;
}

.search {
    -webkit-app-region: no-drag;
}

.sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-height: 0;
    padding: 1.5rem 1rem 1.25rem;
    
    & > a {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 0.5rem;
        font-size: 0.9rem;
        font-weight: 500;
    }

    a {
        text-decoration: none;
        border-radius: 0.25rem;

        &.router-link-active {
            background: var(--surface);
        }
    }

    & > a svg {
        width: 1.25rem;
        height: 1.25rem;
    }
}

nav {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;

    a {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 0.5rem;
        font-size: 0.9rem;
    }
}

.add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 0.5rem;
    background: none;
    color: var(--muted);
    
    &:hover {
        color: var(--text);
        background: var(--surface);
    }

    svg {
        width: 1.125rem;
        height: 1.125rem;
    }
}

.new-name {
    background: var(--surface);
    color: var(--text);
    margin: 0 0.5rem;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    font: inherit;
    font-size: 0.9rem;

    &:focus {
        outline: none;
        border-color: var(--accent);
    }
}

.playlist {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;

    &:hover {
        background: var(--surface);
    }

    &.router-link-active .name {
        color: var(--accent);
    }
}

.cover {
    flex: none;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.25rem;
    background: var(--raised);
}


.info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9rem;
    font-weight: 500;
}

.meta {
    font-size: 0.75rem;
    color: var(--muted);
}

.version {
    color: var(--muted);
    font-size: 0.75rem;
    padding: 0.9rem 0.5rem 0;
    border-top: 1px solid var(--border);
}

.content {
    overflow: auto;
    flex: 1;
}

.bar {
    grid-column: 1 / -1;
}

.column {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: var(--background);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    border-right: 0;
    border-bottom: 0;
    border-top-left-radius: 0.5rem;
}

.playlists {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1.5rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    padding: 0 0.5rem 0.5rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
}

</style>
