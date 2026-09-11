import { newId, newToken, sha256Hex } from "../lib/crypto";

export type McpScope = "all" | "devices";

export type McpGrantRow = {
  id: string;
  admin_id: string;
  name: string;
  token_hash: string;
  scope: McpScope;
  device_ids: string;
  permissions: string;
  expires_at: number | null;
  cap_a: number;
  cap_b: number;
  cap_step: number;
  cap_rpm: number | null;
  cap_wave_s: number | null;
  created_at: number;
  revoked_at: number | null;
};

const COLS = `id, admin_id, name, token_hash, scope, device_ids, permissions, expires_at, cap_a, cap_b, cap_step, cap_rpm, cap_wave_s, created_at, revoked_at`;

export const MCP_PERMS = [
  "device.control.strength",
  "device.control.wave",
  "device.control.stop",
] as const;

export function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function sanitizeMcpPerms(input: unknown): string[] {
  const list = Array.isArray(input) ? input.map(String) : [];
  const allowed = new Set<string>(MCP_PERMS);
  const out = list.filter((p) => allowed.has(p));
  return out.length ? out : [...MCP_PERMS];
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function grantPublic(row: McpGrantRow) {
  const now = Date.now();
  const revoked = Boolean(row.revoked_at);
  const expired = row.expires_at != null && row.expires_at <= now;
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    deviceIds: parseJsonArray(row.device_ids),
    permissions: parseJsonArray(row.permissions),
    expiresAt: row.expires_at,
    capA: row.cap_a,
    capB: row.cap_b,
    capStep: row.cap_step,
    capRpm: row.cap_rpm,
    capWaveS: row.cap_wave_s,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    revoked,
    expired,
  };
}

export async function listMcpGrants(db: D1Database, adminId: string): Promise<McpGrantRow[]> {
  const rows = await db
    .prepare(`SELECT ${COLS} FROM mcp_grants WHERE admin_id = ? ORDER BY created_at DESC`)
    .bind(adminId)
    .all<McpGrantRow>();
  return (rows.results ?? []) as McpGrantRow[];
}

export async function getMcpGrant(db: D1Database, adminId: string, id: string): Promise<McpGrantRow | null> {
  return db
    .prepare(`SELECT ${COLS} FROM mcp_grants WHERE id = ? AND admin_id = ?`)
    .bind(id, adminId)
    .first<McpGrantRow>();
}

export async function getMcpGrantByTokenHash(db: D1Database, tokenHash: string): Promise<McpGrantRow | null> {
  return db.prepare(`SELECT ${COLS} FROM mcp_grants WHERE token_hash = ?`).bind(tokenHash).first<McpGrantRow>();
}

export async function createMcpGrant(
  db: D1Database,
  input: {
    adminId: string;
    name: string;
    scope: McpScope;
    deviceIds: string[];
    permissions: string[];
    expiresAt: number | null;
    capA: number;
    capB: number;
    capStep: number;
    capRpm: number | null;
    capWaveS: number | null;
  },
): Promise<{ row: McpGrantRow; token: string }> {
  const token = `mcp_live_${newToken()}`;
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  const id = newId();
  const scope: McpScope = input.scope === "all" ? "all" : "devices";
  const deviceIds = scope === "all" ? [] : input.deviceIds;
  const permissions = sanitizeMcpPerms(input.permissions);
  const capA = clamp(input.capA, 0, 200);
  const capB = clamp(input.capB, 0, 200);
  const capStep = clamp(input.capStep, 1, 40);
  const capRpm = input.capRpm == null ? 30 : clamp(input.capRpm, 1, 600);
  const capWaveS = input.capWaveS == null ? 30 : clamp(input.capWaveS, 1, 120);
  await db
    .prepare(
      `INSERT INTO mcp_grants (
        id, admin_id, name, token_hash, scope, device_ids, permissions, expires_at,
        cap_a, cap_b, cap_step, cap_rpm, cap_wave_s, created_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      id,
      input.adminId,
      input.name.trim() || "MCP",
      tokenHash,
      scope,
      JSON.stringify(deviceIds),
      JSON.stringify(permissions),
      input.expiresAt,
      capA,
      capB,
      capStep,
      capRpm,
      capWaveS,
      now,
    )
    .run();
  const row = await db.prepare(`SELECT ${COLS} FROM mcp_grants WHERE id = ?`).bind(id).first<McpGrantRow>();
  if (!row) throw new Error("mcp_grant_missing");
  return { row, token };
}

export async function revokeMcpGrant(db: D1Database, adminId: string, id: string): Promise<boolean> {
  const now = Date.now();
  const res = await db
    .prepare(`UPDATE mcp_grants SET revoked_at = ? WHERE id = ? AND admin_id = ? AND revoked_at IS NULL`)
    .bind(now, id, adminId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function bumpMcpUsage(db: D1Database, grantId: string, rpm: number | null): Promise<boolean> {
  if (rpm == null) return true;
  const windowStart = Math.floor(Date.now() / 60_000) * 60_000;
  await db
    .prepare(
      `INSERT INTO mcp_usage (grant_id, window_start, calls) VALUES (?, ?, 1)
       ON CONFLICT(grant_id, window_start) DO UPDATE SET calls = calls + 1`,
    )
    .bind(grantId, windowStart)
    .run();
  const row = await db
    .prepare(`SELECT calls FROM mcp_usage WHERE grant_id = ? AND window_start = ?`)
    .bind(grantId, windowStart)
    .first<{ calls: number }>();
  return (row?.calls ?? 1) <= rpm;
}
