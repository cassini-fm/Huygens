import { join } from "node:path";
import { app, BrowserWindow, components, ipcMain, nativeTheme, shell } from "electron";
import { openDatabase } from "./db";
import { readSettings, writeSettings } from "./settings";
import { type Cipher, systemCipher } from "./secrets.js";
import { listSources, removeSource, reorderSources } from "./sources.js";
import { connectSpotify, forgetSpotify, getSpotifyToken } from "./spotifyAccount.js";
import { searchTracks } from "./spotify";

const db = openDatabase(join(app.getPath("userData"), "player.db"));

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
