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
    musicbrainz: {
        match: (track) => ipcRenderer.invoke("api:musicbrainz:match", track),
    },
    playlists: {
        list: () => ipcRenderer.invoke("api:playlists:list"),
        create: (name) => ipcRenderer.invoke("api:playlists:create", name),
        rename: (id, name) => ipcRenderer.invoke("api:playlists:rename", id, name),
        delete: (id) => ipcRenderer.invoke("api:playlists:delete", id),
        entries: (id) => ipcRenderer.invoke("api:playlists:entries", id),
        add: (playlistId, entry) => ipcRenderer.invoke("api:playlists:add", playlistId, entry),
        remove: (playlistId, entryId) => ipcRenderer.invoke("api:playlists:remove", playlistId, entryId),
        move: (playlistId, entryId, to) => ipcRenderer.invoke("api:playlists:move", playlistId, entryId, to),
    },
};

contextBridge.exposeInMainWorld("player", api);
