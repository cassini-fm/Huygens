import type { Database } from "./db.js";
import type { NewPlaylistEntry, Playlist, PlaylistEntry } from "../shared/api.js";

const maybe = (value: unknown, type: "string" | "number") => value === null || typeof value === type;

function transaction<T>(db: Database, work: () => T): T {
    db.exec("begin transaction;");
    try {
        const result = work();
        db.exec("commit;");
        return result;
    } catch (err) {
        db.exec("rollback;");
        throw err;
    }
}

export function listPlaylists(db: Database): Playlist[] {
    return db
        .prepare(`select p.id, p.name, p.created_at as createdAt, count(e.id) as count
                from playlists p left join playlist_entries e on p.id = e.playlist_id
                group by p.id order by p.name collate nocase`)
        .all() as Playlist[];
}

export function createPlaylist(db: Database, name: string): Playlist {
    const createdAt = Math.floor(Date.now() / 1000);
    const { lastInsertRowid } = db.prepare("insert into playlists (name, created_at) values (?, ?)").run(name, createdAt);
    return { id: Number(lastInsertRowid), name, createdAt, count: 0 };
}

export function renamePlaylist(db: Database, id: number, name: string): void {
    db.prepare("update playlists set name = ? where id = ?").run(name, id);
}

export function deletePlaylist(db: Database, id: number): void {
    db.prepare("delete from playlists where id = ?").run(id);
}

type EntryRow = Omit<PlaylistEntry, "artists" | "sources"> & { artists: string; sources: string };

export function playlistEntries(db: Database, playlistId: number): PlaylistEntry[] {
    const rows = db.prepare(`select e.id, e.position, e.recording_mbid as recordingMbid, e.title, e.artists, e.album, e.duration, e.isrc,
            (select json_group_object(kind, track_ref) from entry_sources where entry_id = e.id) as sources
            from playlist_entries e where e.playlist_id = ?
            order by e.position`)
        .all(playlistId) as EntryRow[];
    return rows.map((row) => ({ ...row, artists: JSON.parse(row.artists), sources: JSON.parse(row.sources) }));
}

export function addEntry(db: Database, playlistId: number, entry: NewPlaylistEntry): number {
    return transaction(db, () => {
        const { next } = db
            .prepare("select coalesce(max(position), -1) + 1 as next from playlist_entries where playlist_id = ?")
            .get(playlistId) as { next: number };
        const { lastInsertRowid } = db
            .prepare("insert into playlist_entries (playlist_id, position, recording_mbid, title, artists, album, duration, isrc, added_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(playlistId, next, entry.recordingMbid, entry.title, JSON.stringify(entry.artists), entry.album, entry.duration, entry.isrc, Math.floor(Date.now() / 1000));
        const id = Number(lastInsertRowid);
        const link = db.prepare("insert into entry_sources (entry_id, kind, track_ref) values (?, ?, ?)");
        for (const [kind, ref] of Object.entries(entry.sources)) link.run(id, kind, ref);
        return id;
    });
}

export function removeEntry(db: Database, playlistId: number, entryId: number): void {
    transaction(db, () => {
        const row = db.prepare("select playlist_id as playlistId, position from playlist_entries where id = ? and playlist_id = ?").get(entryId, playlistId) as { playlistId: number; position: number } | undefined;
        if (!row) return;
        db.prepare("delete from playlist_entries where id = ? and playlist_id = ?").run(entryId, playlistId);
        db.prepare("update playlist_entries set position = position - 1 where playlist_id = ? and position > ?").run(row.playlistId, row.position);
    });
}

export function reorderEntries(db: Database, playlistId: number, entryId: number, to: number): void {
    transaction(db, () => {
        const row = db.prepare("select playlist_id as playlistId, position from playlist_entries where id = ? and playlist_id = ?").get(entryId, playlistId) as { playlistId: number; position: number } | undefined;
        if (!row || row.position === to) return;
        const { count } = db.prepare("select count(*) as count from playlist_entries where playlist_id = ?").get(row.playlistId) as { count: number };
        const target = Math.min(Math.max(0, to), count - 1);
        if (target < row.position) {
            db.prepare("update playlist_entries set position = position + 1 where playlist_id = ? and position >= ? and position < ?").run(row.playlistId, target, row.position);
        } else {
            db.prepare("update playlist_entries set position = position - 1 where playlist_id = ? and position > ? and position <= ?").run(row.playlistId, row.position, target);
        }
        db.prepare("update playlist_entries set position = ? where id = ? and playlist_id = ?").run(target, entryId, row.playlistId);
    });
}

export function isNewPlaylistEntry(value: unknown): value is NewPlaylistEntry {
    if (typeof value !== "object" || value === null) return false;
    const entry = value as Record<string, unknown>;
    const sources = entry.sources as Record<string, unknown> | null;
    return (
        maybe(entry.recordingMbid, "string") &&
        typeof entry.title === "string" &&
        Array.isArray(entry.artists) &&
        entry.artists.every((artist) => typeof artist === "string") &&
        maybe(entry.album, "string") &&
        maybe(entry.duration, "number") &&
        maybe(entry.isrc, "string") &&
        typeof sources === "object" &&
        sources !== null &&
        Object.values(sources).every((ref) => typeof ref === "string")
    );
}

export function validName(name: unknown): string {
    if (typeof name !== "string" || !name.trim() || name.length > 128) throw new Error("Invalid playlist name"); 
    return name.trim();
}
