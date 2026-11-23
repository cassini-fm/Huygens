import { contextBridge, ipcRenderer } from "electron";
import type { PlayerApi } from "../shared/api.js";

const api: PlayerApi = {
    version: () => ipcRenderer.invoke("api:version"),
    settings: {
        get: () => ipcRenderer.invoke("api:settings:get"),
        set: (changes) => ipcRenderer.invoke("api:settings:set", changes),
    },
    sources: {
        list: () => ipcRenderer.invoke("api:sources:list"),
        reorder: (ids) => ipcRenderer.invoke("api:sources:reorder", ids),
        remove: (id) => ipcRenderer.invoke("api:sources:remove", id),
    },
    spotify: {
        connect: (clientId) => ipcRenderer.invoke("api:spotify:connect", clientId),
        token: (id) => ipcRenderer.invoke("api:spotify:token", id),
        search: (sourceId, query) => ipcRenderer.invoke("api:spotify:search", sourceId, query),
    },
    listens: {
        record: (listen) => ipcRenderer.invoke("api:listens:record", listen),
    },
};

contextBridge.exposeInMainWorld("player", api);
