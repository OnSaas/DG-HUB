import { newId, newToken, sha256Hex } from "../lib/crypto";

export const ALLOWED_SHARE_PERMS = [
  "device.control",
  "device.control.strength",
  "device.control.wave",
  "device.control.stop",
  "device.pair.read",
] as const;

const FORBIDDEN = new Set(["device.write", "device.delete", "share.manage", "admin"]);

export type ShareRow = {
  id: string;
  device_id: string;
  token_hash: string;
  password_hash: string | null;
  permissions: string;
  expires_at: number | null;
  created_at: number;
  revoked_at: number | null;
};

export function sanitizePermissions(input: unknown): string[] {
  const list = Array.isArray(input) ? input.map(String) : ["device.control"];
  const out: string[] = [];
  for (const p of list) {
    if (FORBIDDEN.has(p)) continue;
    if ((ALLOWED_SHARE_PERMS as readonly string[]).includes(p) && !out.includes(p)) out.push(p);
  }
  return out.length ? out : ["device.control"];
}

export function parsePermissions(raw: string): string[] {
  try {
    return sanitizePermissions(JSON.parse(raw));
  } catch {
    return ["device.control"];
  }
}

export function shareActive(row: ShareRow, now = Date.now()): { expired: boolean; revoked: boolean } {
  return {
    expired: row.expires_at != null && row.expires_at <= now,
    revoked: row.revoked_at != null,
  };
}

export async function createShare(
  db: D1Database,
  input: {
    deviceId: string;
    passwordHash: string | null;
    expiresAt: number | null;
    permissions: string[];
  },
): Promise<{ row: ShareRow; token: string }> {
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  const id = newId();
  await db
    .prepare(
      `INSERT INTO shares (id, device_id, token_hash, password_hash, permissions, expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(id, input.deviceId, tokenHash, input.passwordHash, JSON.stringify(input.permissions), input.expiresAt, now)
    .run();
  const row: ShareRow = {
    id,
    device_id: input.deviceId,
    token_hash: tokenHash,
    password_hash: input.passwordHash,
    permissions: JSON.stringify(input.permissions),
    expires_at: input.expiresAt,
    created_at: now,
    revoked_at: null,
  };
  return { row, token };
}

export async function listSharesByDevice(db: D1Database, deviceId: string): Promise<ShareRow[]> {
  const rows = await db
    .prepare(`SELECT * FROM shares WHERE device_id = ? ORDER BY created_at DESC`)
    .bind(deviceId)
    .all<ShareRow>();
  return (rows.results ?? []) as ShareRow[];
}

export async function getShareById(db: D1Database, id: string): Promise<ShareRow | null> {
  return db.prepare(`SELECT * FROM shares WHERE id = ?`).bind(id).first<ShareRow>();
}

export async function getShareByTokenHash(db: D1Database, tokenHash: string): Promise<ShareRow | null> {
  return db.prepare(`SELECT * FROM shares WHERE token_hash = ?`).bind(tokenHash).first<ShareRow>();
}

export async function getShareByUrlToken(db: D1Database, token: string): Promise<ShareRow | null> {
  return getShareByTokenHash(db, await sha256Hex(token));
}

export async function revokeShare(db: D1Database, id: string): Promise<void> {
  const now = Date.now();
  await db.prepare(`UPDATE shares SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`).bind(now, id).run();
  await db.prepare(`DELETE FROM share_sessions WHERE share_id = ?`).bind(id).run();
}

export async function createShareSession(
  db: D1Database,
  shareId: string,
  expiresAt: number,
): Promise<string> {
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO share_sessions (id, share_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(newId(), shareId, tokenHash, expiresAt, now)
    .run();
  return token;
}

export async function deleteShareSessionByToken(db: D1Database, token: string): Promise<void> {
  await db.prepare(`DELETE FROM share_sessions WHERE token_hash = ?`).bind(await sha256Hex(token)).run();
}

export type ShareSessionResolved = {
  share: ShareRow;
  sessionId: string;
  deviceId: string;
  deviceName: string;
  deviceSessionId: string;
  permissions: string[];
  expiresAt: number;
};

export async function resolveShareSessionToken(
  db: D1Database,
  token: string,
): Promise<ShareSessionResolved | null> {
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT ss.id AS sid, ss.expires_at AS sess_exp, s.*, d.name AS device_name, d.session_id AS device_session_id
       FROM share_sessions ss
       JOIN shares s ON s.id = ss.share_id
       JOIN devices d ON d.id = s.device_id
       WHERE ss.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<
      ShareRow & {
        sid: string;
        sess_exp: number;
        device_name: string;
        device_session_id: string;
      }
    >();
  if (!row) return null;
  const now = Date.now();
  if (row.sess_exp < now) {
    await db.prepare(`DELETE FROM share_sessions WHERE id = ?`).bind(row.sid).run();
    return null;
  }
  const { expired, revoked } = shareActive(row, now);
  if (expired || revoked) {
    await db.prepare(`DELETE FROM share_sessions WHERE share_id = ?`).bind(row.id).run();
    return null;
  }
  return {
    share: row,
    sessionId: row.sid,
    deviceId: row.device_id,
    deviceName: row.device_name,
    deviceSessionId: row.device_session_id,
    permissions: parsePermissions(row.permissions),
    expiresAt: row.sess_exp,
  };
}
