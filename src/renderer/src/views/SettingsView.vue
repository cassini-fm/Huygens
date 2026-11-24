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
    <div class="page">
        <h1>Settings</h1>
        <section class="appearance">
            <h2>Appearance</h2>
            <div v-if="settings" class="settings">
                <div class="row">
                    <label for="theme">Theme</label>
                    <select id="theme" class="input" :value="settings.theme" @change="setTheme">
                        <option v-for="theme in themes" :key="theme" :value="theme">{{ theme[0]?.toUpperCase() + theme.slice(1) }}</option>
                    </select>
                </div>
                <div class="row">
                    <label for="mode"`>Mode</label>
                    <select id="mode" class="input" :value="settings.mode" @change="setMode">
                        <option v-for="mode in ['system', 'light', 'dark']" :key="mode" :value="mode">{{ mode[0]?.toUpperCase() + mode.slice(1) }}</option>
                    </select>
                </div>
            </div>
        </section>
        <SourcesSettings />
    </div>
</template>

<style scoped lang="scss">
.page {
    display: flex;
    flex-direction: column;
    gap: 2.25rem;
    padding: 2.25rem 3rem 3rem;
}

.appearance {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.settings {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);

    label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--muted);
    }
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 0.8rem 1.25rem;

    & + .row {
        border-top: 1px solid var(--border);
    }

    label {
        font-weight: 500;
    }

    select {
        width: 16rem;
    }
}
</style>
