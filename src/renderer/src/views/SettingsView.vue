<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Settings } from "@shared/api.js";
import SourcesSettings from "@/components/SourcesSettings.vue";

const settings = ref<Settings | null>(null);

onMounted(async () => {
    settings.value = await window.player.settings.get();
});

async function setVolume(event: Event) {
    const volume = (Number((event.target as HTMLInputElement).value) / 100);
    settings.value = await window.player.settings.set({ volume });
}
</script>

<template>
    <h1>Settings</h1>
    <label v-if="settings" class="setting" for="volume">Volume</label>
    <input v-if="settings" id="volume" type="range" min="0" max="100" :value="Math.round(settings.volume * 100)" @change="setVolume" />
    <SourcesSettings />
</template>

<style scoped lang="scss">
.setting {
    display: flex;
    align-items: center;
    gap: 1rem;
}
</style>
