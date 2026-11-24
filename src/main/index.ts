import { join } from "node:path";
import { app, BrowserWindow, components, ipcMain, nativeTheme, shell } from "electron";
import { openDatabase } from "./db";
import { readSettings, writeSettings } from "./settings";
import { type Cipher, systemCipher } from "./secrets.js";
import { listSources, removeSource, reorderSources } from "./sources.js";
import { connectSpotify, forgetSpotify, getSpotifyToken } from "./spotifyAccount.js";
import { searchTracks } from "./spotify";
import { isNewListen, recordListen } from "./listens.js";
import { createMusicBrainz, isSpotifyTrack, matchRecording } from "./musicbrainz.js";
import { addEntry, createPlaylist, deletePlaylist, isNewPlaylistEntry, listPlaylists, playlistEntries, removeEntry, renamePlaylist, reorderEntries, validName } from "./playlists";

const db = openDatabase(join(app.getPath("userData"), "player.db"));
const musicbrainz = createMusicBrainz(`Huygens/${app.getVersion()} (https://github.com/cassini-fm/huygens)`);

let cipher: Promise<Cipher> | undefined;
const getCipher = () => (cipher ??= systemCipher());

function createWindow() {
    const window = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false,
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
    });

    window.once("ready-to-show", () => window.show());
    window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://")) void shell.openExternal(url);
        return { action: "deny" };
    });

    if (process.env.ELECTRON_RENDERER_URL) {
        void window.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
        void window.loadFile(join(__dirname, "../renderer/index.html"));
    }
}

ipcMain.handle("api:version", () => app.getVersion());
ipcMain.handle("api:settings:get", () => readSettings(db));
ipcMain.handle("api:settings:set", (_event, changes) => {
    const settings = writeSettings(db, changes);
    nativeTheme.themeSource = settings.mode;
    return settings;
});
ipcMain.handle("api:sources:list", () => listSources(db));
ipcMain.handle("api:sources:reorder", (_event, ids: number[]) => reorderSources(db, ids));
ipcMain.handle("api:sources:remove", async (_event, id: number) => {
    forgetSpotify(id);
    removeSource(db, id);
});
ipcMain.handle("api:spotify:connect", async (_event, clientId: string) => {
    const id = clientId.trim();
    if (!/^[0-9a-f]{32}$/i.test(id)) throw new Error("Invalid Spotify client ID");
    return connectSpotify(db, await getCipher(), id, (url) => shell.openExternal(url));
});
ipcMain.handle("api:spotify:token", async (_event, id: number) => getSpotifyToken(db, await getCipher(), id));
ipcMain.handle("api:spotify:search", async (_event, sourceId: number, query: unknown) => {
    if (typeof query !== "string" || !query.trim()) return [];
    const token = await getSpotifyToken(db, await getCipher(), sourceId);
    return searchTracks(token, query.trim());
});
ipcMain.handle("api:listens:record", (_event, listen: unknown) => {
    if (!isNewListen(listen)) throw new Error("Invalid listen");
    return recordListen(db, listen);
});
ipcMain.handle("api:musicbrainz:match", (_event, track: unknown) => {
    if (!isSpotifyTrack(track)) throw new Error("Invalid track");
    return matchRecording(musicbrainz, track);
});
ipcMain.handle("api:playlists:list", () => listPlaylists(db));
ipcMain.handle("api:playlists:create", (_event, name: unknown) => createPlaylist(db, validName(name)));
ipcMain.handle("api:playlists:rename", (_event, id: number, name: unknown) => renamePlaylist(db, id, validName(name)));
ipcMain.handle("api:playlists:delete", (_event, id: number) => deletePlaylist(db, id));
ipcMain.handle("api:playlists:entries", (_event, id: number) => playlistEntries(db, id));
ipcMain.handle("api:playlists:add", (_event, playlistId: number, entry: unknown) => {
    if (!isNewPlaylistEntry(entry)) throw new Error("Invalid playlist entry");
    return addEntry(db, playlistId, entry);
});
ipcMain.handle("api:playlists:remove", (_event, playlistId: number, entryId: number) => removeEntry(db, playlistId, entryId));
ipcMain.handle("api:playlists:move", (_event, playlistId: number, entryId: number, to: number) => reorderEntries(db, playlistId, entryId, to));

void app.whenReady().then(async () => {
    const settings = readSettings(db);
    nativeTheme.themeSource = settings.mode;

    try {
        await components.whenReady();
    } catch (err) {
        console.error("Widevine unavailable, Spotify playback will not work.", err);
    }
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => db.close());
