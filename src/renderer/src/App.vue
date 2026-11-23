<script setup lang="ts">
import { onMounted, ref } from "vue";
import TrackSearch from "@/components/SearchComponent.vue";
import PlayerBar from "@/components/PlayerBar.vue";

const version = ref("");

onMounted(async () => {
    version.value = await window.player.version();
    const settings = await window.player.settings.get();
    document.documentElement.dataset.theme = settings.theme;
});
</script>

<template>
    <div class="layout">
        <nav class="sidebar">
            <RouterLink to="/">Home</RouterLink>
            <RouterLink to="/settings">Settings</RouterLink>
            <span class="version">v{{ version }}</span>
        </nav>
        <div class="column">
            <TrackSearch class="top" />
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
    grid-template-columns: 200px 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
    height: 100vh;
}

.sidebar {
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    
    a {
        text-decoration: none;
    }
}

.version {
    margin-top: auto;
    font-size: 0.75rem;
}

.content {
    overflow: auto;
    padding: 1.5rem;
    flex: 1;
}

.bar {
    grid-column: 1 / -1;
}

.column {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.top {
    padding: 1rem 1.5rem 0;
}
</style>
