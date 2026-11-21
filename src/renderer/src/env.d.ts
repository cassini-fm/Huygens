/// <reference types="vite/client" />
import type { PlayerApi } from "@shared/api.js";

declare global {
    interface Window {
        player: PlayerApi;
    }
}
