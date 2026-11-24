<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { MusicSource } from "@shared/api";

const sources = ref<MusicSource[]>([]);
const clientId = ref("");
const error = ref("");
const loading = ref(false);

async function load() {
    sources.value = await window.player.sources.list();
}

function message(err: unknown) {
    const text = err instanceof Error ? err.message: String(err);
    return text.replace(/^Error involing remote method '[^']+': (Error: )?/, "");
}

async function connect() {
    loading.value = true;
    error.value = "";
    try {
        await window.player.spotify.connect(clientId.value);
        clientId.value = "";
        await load();
    } catch (err) {
        error.value = message(err);
    } finally {
        loading.value = false;
    }
}

async function remove(id: number) {
    await window.player.sources.remove(id);
    await load();
}

onMounted(load);
</script>

<template>
    <section class="sources">
        <h2>Sources</h2>
        <p class="hint">When a track is on multiple sources, the player selects the first one available.</p>
        <ol>
            <li v-for="(source, index) in sources" :key="source.id">
                <span class="rank">{{ index + 1 }}</span>
                <span class="info">
                    <span class="name">{{ source.name }}</span>
                    <span class="kind">{{ source.kind }}</span>
                </span>
                <button class="button" @click="remove(source.id)">Remove</button>
            </li>
        </ol>
        <div class="card">
            <form class="connect" @submit.prevent="connect">
                <label for="spotify-client-id">Spotify Client ID</label>
                <input class="input" id="spotify-client-id" v-model="clientId" spellcheck="false" autocomplete="off" />
                <button class="button primary" type="submit" :disabled="loading || !clientId">{{ loading ? "Waiting for Spotify..." : "Connect Spotify" }}</button>
            </form>
        </div>
        <p v-if="loading" class="hint">Finish logging in in your browser.</p>
        <p v-if="error" class="error">{{ error }}</p>
    </section>
</template>

<style scoped lang="scss">
.sources {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

ol {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    li {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-radius: 0.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
    }
}

.rank {
    width: 1.25rem;
    font-weight: bold;
    color: var(--muted);
}

.info {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.name {
    font-size: 0.9rem;
    font-weight: bold;
}

.kind {
    font-size: 0.75rem;
    color: var(--muted);
}

.card {
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);
}

.connect {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem 0.75rem;

    label {
        grid-column: 1 / -1;
        font-size: 0.8rem;
        font-weight: bold;
        color: var(--muted);
    }
}
</style>
