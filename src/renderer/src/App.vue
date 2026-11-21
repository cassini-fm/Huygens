<script setup lang="ts">
import { onMounted, ref } from "vue";

const version = ref("");

onMounted(async () => {
    version.value = await window.player.version();
});
</script>

<template>
    <div class="layout">
        <nav class="sidebar">
            <RouterLink to="/">Home</RouterLink>
            <RouterLink to="/settings">Settings</RouterLink>
            <span class="version">v{{ version }}</span>
        </nav>
        <main class="content">
            <RouterView />
        </main>
    </div>
</template>

<style scoped lang="scss">
.layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    height: 100vh;

    .sidebar {
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
    }
}
</style>
