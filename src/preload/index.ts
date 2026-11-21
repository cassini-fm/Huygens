import { contextBridge, ipcRenderer } from "electron";
import type { PlayerApi } from "../shared/api.js";

const api: PlayerApi = {
    version: () => ipcRenderer.invoke("api:version"),
    settings: {
        get: () => ipcRenderer.invoke("api:settings:get"),
        set: (changes) => ipcRenderer.invoke("api:settings:set", changes)
    },
};

contextBridge.exposeInMainWorld("player", api);
