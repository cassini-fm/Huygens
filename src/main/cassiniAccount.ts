import type { Database } from "./db.js";
import type { Cipher } from "./secrets.js";

export type CassiniAccount = { url: string; username: string };

export async function validateToken(url: string, token: string, fetcher: typeof fetch): Promise<string> {
    const res = await fetcher(`${url}/1/validate-token`, { headers: { Authorization: `Token ${token}` } });
    if (!res.ok) throw new Error(`Cassini unreachable: ${res.status} ${res.statusText}`);
    const body = await res.json() as { valid: boolean, user_name?: string };
    if (!body.valid || !body.user_name) throw new Error("Invalid Cassini token");
    return body.user_name;
}

export async function connectCassini(db: Database, cipher: Cipher, url: string, token: string, fetcher: typeof fetch): Promise<CassiniAccount> {
    const base = url.trim().replace(/\/+$/, "");
    const username = await validateToken(base, token, fetcher);
    db.prepare("insert into cassini (id, url, username, secret) values (1, ?, ?, ?) on conflict(id) do update set url=excluded.url, username=excluded.username, secret=excluded.secret").run(base, username, await cipher.encrypt(token));
    return { url: base, username };
}

export function getCassiniAccount(db: Database): CassiniAccount | null {
    return (db.prepare("select url, username from cassini where id = 1").get() as CassiniAccount | undefined) ?? null;
}

export async function getCassiniToken(db: Database, cipher: Cipher): Promise<{ url: string; token: string } | null> {
    const row = db.prepare("select url, secret from cassini where id = 1").get() as { url: string; secret: Uint8Array } | undefined;
    if (!row) return null;
    const { plain, stale } = await cipher.decrypt(row.secret);
    if (stale) db.prepare("update cassini set secret = ? where id = 1").run(await cipher.encrypt(plain));
    return { url: row.url, token: plain };
}

export function disconnectCassini(db: Database): void {
    db.prepare("delete from cassini where id = 1").run();
}
