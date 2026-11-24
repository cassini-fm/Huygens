import { readonly, ref } from "vue";
import type { Playlist } from "@shared/api.js";

const playlists = ref<Playlist[]>([]);

export async function refreshPlaylists(): Promise<void> {
    playlists.value = await window.player.playlists.list();
}

export async function newPlaylist(name: string): Promise<Playlist> {
    const playlist = await window.player.playlists.create(name);
    await refreshPlaylists();
    return playlist;
}

export const library = {
    playlists: readonly(playlists),
};
