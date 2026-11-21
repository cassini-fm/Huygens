import { join } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { openDatabase } from "./db";
import { readSettings, writeSettings } from "./settings";

const db = openDatabase(join(app.getPath("userData"), "player.db"));

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
ipcMain.handle("api:settings:set", (_event, changes) => writeSettings(db, changes));

void app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => db.close());
