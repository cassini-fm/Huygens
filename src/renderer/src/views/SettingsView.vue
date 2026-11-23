<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type Settings, type ThemeMode, type ThemeName, themes } from "@shared/api.js";
import SourcesSettings from "@/components/SourcesSettings.vue";

const settings = ref<Settings | null>(null);

async function setTheme(event: Event) {
    const theme = (event.target as HTMLSelectElement).value as ThemeName;
    settings.value = await window.player.settings.set({ theme });
    document.documentElement.dataset.theme = settings.value.theme;
}

async function setMode(event: Event) {
    const mode = (event.target as HTMLSelectElement).value as ThemeMode;
    settings.value = await window.player.settings.set({ mode });
}

onMounted(async () => {
    settings.value = await window.player.settings.get();
});
</script>

<template>
    <h1>Settings</h1>
    <div v-if="settings" class="settings">
        <label for="theme">Theme</label>
        <select id="theme" :value="settings.theme" @change="setTheme">
            <option v-for="theme in themes" :key="theme" :value="theme">{{ theme[0]?.toUpperCase() + theme.slice(1) }}</option>
        </select>
        <label for="mode">Mode</label>
        <select id="mode" :value="settings.mode" @change="setMode">
            <option v-for="mode in ['system', 'light', 'dark']" :key="mode" :value="mode">{{ mode[0]?.toUpperCase() + mode.slice(1) }}</option>
        </select>
    </div>
    <SourcesSettings />
</template>

<style scoped lang="scss">
.settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 1rem;
}
</style>
