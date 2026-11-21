import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";

const routes = [
    { path: "/", name: "Home", component: HomeView },
    { path: "/settings", name: "Settings", component: () => import("@/views/SettingsView.vue") },
];

export default createRouter({
    history: createWebHistory(),
    routes,
});
