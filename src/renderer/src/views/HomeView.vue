<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { MusicSource, RecentTrack } from "@shared/api.js";
import { playTracks } from "@/playback/player.js";
import { rememberMbid } from "@/playback/listens.js";

const recent = ref<RecentTrack[]>([]);
const spotify = ref<MusicSource | null>(null);

function play(track: RecentTrack) {
    if (!spotify.value) return;
    if (track.recordingMbid) rememberMbid(track.trackId, track.recordingMbid);
    void playTracks(spotify.value, [track.trackId]);
}

onMounted(async () => {
    spotify.value = (await window.player.sources.list()).find((source) => source.kind === "spotify") ?? null;
    recent.value = await window.player.listens.recent(10);
});
</script>

<template>
    <section class="home">
        <h1>Home</h1>
        <section class="block">
            <p v-if="!recent.length" class="hint">Tracks you play will appear here.</p>
            <div v-else class="grid">
                <button v-for="track in recent" :key="track.trackId" class="card" @click="play(track)">
                    <span class="cover" :style="{ backgroundImage: track.cover ? `url('${track.cover}' }` : 'none' }"></span>
                    <span class="title">{{ track.title }}</span>
                    <span class="artists">{{ track.artists.join(", ") }}</span>
                </button>
            </div>
        </section>
    </section>
</template>

<style scoped lang="scss">
.home {
    display: flex;
    flex-direction: column;
    gap: 2.75rem;
    padding: 2.25rem 3rem 3rem;
}

.block {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 1.25rem;
}

.card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.5rem;
    margin: -0.5rem;
    border-radius: 0.5rem;
    text-align: left;
    
    &:hover {
        background: var(--surface);
    }
}

.cover {
    aspect-ratio: 1;
    margin-bottom: 0.25rem;
    border-radius: 0.25rem;
    background: var(--raised) center / cover no-repeat;
}

.title, .artists {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.title {
    font-weight: 600;
}

.artists {
    font-size: 0.8rem;
    color: var(--muted);
}
</style>
