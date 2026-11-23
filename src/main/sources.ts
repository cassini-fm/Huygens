import type { MusicSource, NewMusicSource } from "../shared/api.js";
import type { Database } from "./db.js";
import type { Cipher } from "./secrets.js";

export function listSources(db: Database): MusicSource[] {
    return db.prepare("select id, kind, name, url, username, position from sources order by position;").all() as MusicSource[];
}

export async function addSource(db: Database, cipher: Cipher, source: NewMusicSource): Promise<MusicSource> {
    const secret = await cipher.encrypt(source.password);
    const { next } = db.prepare("select coalesce(max(position), -1) + 1 as next from sources;").get() as { next: number };
    const { lastInsertRowid } = db.prepare("insert into sources (kind, name, url, username, secret, position) values (?, ?, ?, ?, ?, ?);")
        .run(source.kind, source.name, source.url, source.username, secret, next);

    return { id: Number(lastInsertRowid), kind: source.kind, name: source.name, url: source.url, username: source.username, position: next };
}

export async function readPassword(db: Database, cipher: Cipher, id: number): Promise<string | null> {
    const row = db.prepare("select secret from sources where id = ?;").get(id) as { secret: Uint8Array | null } | undefined;
    if (!row?.secret) return null;

    const { plain, stale } = await cipher.decrypt(row.secret);
    if (stale) {
        db.prepare("update sources set secret = ? where id = ?;").run(await cipher.encrypt(plain), id);
    }
    return plain;
}

export function reorderSources(db: Database, ids: number[]): void {
    const update = db.prepare("update sources set position = ? where id = ?;");
    db.exec("begin transaction;");
    try {
        ids.forEach((id, index) => update.run(index, id));
        db.exec("commit;");
    } catch (err) {
        db.exec("rollback;");
        throw err;
    }
}

export function removeSource(db: Database, id: number): void {
    db.prepare("delete from sources where id = ?;").run(id);
}

export async function writePassword(db: Database, cipher: Cipher, id: number, password: string): Promise<void> {
    db.prepare("update sources set secret = ? where id = ?;").run(await cipher.encrypt(password), id);
}
