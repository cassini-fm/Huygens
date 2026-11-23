import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";

export default defineConfig({
    main: {},
    preload: {},
    renderer: {
        plugins: [
            vue(),
            Icons({ compiler: "vue3" }),
        ],
        resolve: {
            alias: {
                "@": resolve("src/renderer/src"),
                "@shared": resolve("src/shared")
            },
        },
    },
});
