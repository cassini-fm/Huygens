import { DatabaseSync } from "node:sqlite";

const migrations = [
    `create table settings (
        key text primary key,
        value text not null
    );

    create table listens (
        id integer primary key,
        played_at integer not null,
        artists text not null, -- comma separated list of artists names
        track text not null,   -- track name
        track_id text,
        album text,            -- album id
        duration integer,
        isrc text,
        recording_mbid text,
        source text not null,
        synced_at integer
    );
    create index idx_listens_played_at on listens (played_at);
    create index idx_listens_unsynced on listens (synced_at) where synced_at is null;
    `,
    `create table sources (
        id integer primary key,
        kind text not null,
        name text not null,
        url text not null,
        username text not null,
        secret blob,
        position integer not null
    );
    create index idx_sources_position on sources (position);
    `
];

export type Database = DatabaseSync;

export function migrate(db: Database): void {
    const { user_version: current } = db.prepare("pragma user_version;").get() as { user_version: number };
    for (const [index, sql] of migrations.entries()) {
        if (index < current) continue;
        db.exec("begin transaction;");
        try {
            db.exec(sql);
            db.exec(`pragma user_version = ${index + 1};`);
            db.exec("commit;");
        } catch (error) {
            db.exec("rollback;");
            throw error;
        }
    }
}

export function openDatabase(path: string): Database {
    const db = new DatabaseSync(path);
    db.exec("pragma journal_mode = wal; pragma foreign_keys = on;");
    migrate(db);
    return db;
}
