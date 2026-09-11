import { Permission, type Principal } from "./principal";
import { sha256Hex, newId, newToken } from "../lib/crypto";
import { resolveShareSessionToken } from "../db/shares";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createAdminSession(db: D1Database, adminId: string): Promise<string> {
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(newId(), adminId, tokenHash, now + SESSION_MS, now)
    .run();
  return token;
}

export async function revokeAdminSession(db: D1Database, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await db.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(tokenHash).run();
}

export async function resolveAdmin(db: D1Database, token: string): Promise<Principal | null> {
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT s.id, s.admin_id, s.expires_at, a.username
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{ id: string; admin_id: string; expires_at: number; username: string }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(row.id).run();
    return null;
  }
  return {
    type: "ADMIN",
    id: row.admin_id,
    permissions: [
      Permission.ADMIN,
      Permission.DEVICE_READ,
      Permission.DEVICE_WRITE,
      Permission.DEVICE_CONTROL,
      Permission.DEVICE_DELETE,
      Permission.SHARE_MANAGE,
    ],
  };
}

export async function resolveShareSession(db: D1Database, token: string): Promise<Principal | null> {
  const resolved = await resolveShareSessionToken(db, token);
  if (!resolved) return null;
  return {
    type: "SHARE",
    id: resolved.share.id,
    deviceId: resolved.deviceId,
    shareId: resolved.share.id,
    permissions: resolved.permissions as Principal["permissions"],
  };
}
