import type { Database } from "./db.js";
import type { NewListen, RecentTrack } from "../shared/api.js";

export type Row = {
    id: number;
    played_at: number;
    artists: string;
    track: string;
    track_id: string | null;
    album: string | null;
    duration: number | null;
    isrc: string | null;
    source: string;
    cover: string | null;
};

export type StoredListen = NewListen & { id: number };

export function unsyncedListens(db: Database, limit = 100): StoredListen[] {
    const rows = db.prepare(`select id, played_at, artists, track, track_id, album, duration, isrc, source, cover from listens where synced_at is null order by played_at asc limit ?`).all(limit) as Row[];
    return rows.map((row) => ({
        id: row.id,
        playedAt: row.played_at,
        artists: JSON.parse(row.artists) as string[],
        track: row.track,
        trackId: row.track_id,
        album: row.album,
        duration: row.duration,
        isrc: row.isrc,
        source: row.source,
        cover: row.cover,
        recordingMbid: null,
    }));
}

export function markSynced(db: Database, ids: number[], at = Math.floor(Date.now() / 1000)): void {
    if (ids.length === 0) return;
    const update = db.prepare("update listens set synced_at = ? where id in (" + ids.map(() => "?").join(",") + ")");
    db.exec("begin transaction;");
    try {
        update.run(at, ...ids);
        db.exec("commit;");
    } catch (err) {
        db.exec("rollback;");
        throw err;
    }
}

export function recordListen(db: Database, listen: NewListen): number {
    const result = db.prepare(`insert into listens (played_at, artists, track, track_id, album, duration, isrc, source) values (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        listen.playedAt,
        JSON.stringify(listen.artists),
        listen.track,
        listen.trackId,
        listen.album,
        listen.duration,
        listen.isrc,
        listen.source,
    );
    return Number(result.lastInsertRowid);
}

export function isNewListen(value: unknown): value is NewListen {
    if (typeof value !== "object" || value === null) return false;
    const listen = value as Record<string, unknown>;
    return (
        Number.isInteger(listen.playedAt) &&
        Array.isArray(listen.artists) &&
        listen.artists.every((artist) => typeof artist === "string") &&
        typeof listen.track === "string" &&
        (listen.trackId === null || typeof listen.trackId === "string") &&
        (listen.album === null || typeof listen.album === "string") &&
        (listen.duration === null || Number.isInteger(listen.duration)) &&
        (listen.isrc === null || typeof listen.isrc === "string") &&
        typeof listen.source === "string" &&
        (listen.recordingMbid === null || typeof listen.recordingMbid === "string") &&
        (listen.cover === null || typeof listen.cover === "string")
    );
}

export function recentTracks(db: Database, limit = 10): RecentTrack[] {
    const rows = db.prepare(`select track_id, track, artists, album, cover, recording_mbid, max(played_at) as last_played
            from listens
            where track_id is not null
            group by track_id
            order by last_played desc
            limit ?`)
        .all(limit) as { track_id: string; track: string; artists: string; album: string | null; cover: string | null; recording_mbid: string | null; last_played: string }[];
    return rows.map((row) => ({
        trackId: row.track_id,
        title: row.track,
        artists: JSON.parse(row.artists) as string[],
        album: row.album,
        cover: row.cover,
        recordingMbid: row.recording_mbid,
        playedAt: Number(row.last_played),
    }));
}
