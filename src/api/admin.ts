import { hashPassword, verifyPassword } from "../auth/password";
import { clearSessionCookie, isSecureRequest, setSessionCookie } from "../auth/cookie";
import { createAdminSession, revokeAdminSession } from "../auth/session";
import { json, notFound, unauthorized } from "../auth/middleware";
import type { Principal } from "../auth/principal";
import { newId, newSessionId } from "../lib/crypto";
import { readCookie } from "../auth/cookie";

type AdminRow = { id: string; username: string; created_at: number };

export async function handleAdmin(
  request: Request,
  env: Env,
  url: URL,
  principal: Principal,
): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";
  const method = request.method;

  if (path === "/setup-needed" && method === "GET") {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admins`).first<{ n: number }>();
    return json({ needed: (row?.n ?? 0) === 0 });
  }

  if (path === "/setup" && method === "POST") {
    return setup(request, env);
  }

  if (path === "/login" && method === "POST") {
    return login(request, env);
  }

  if (path === "/logout" && method === "POST") {
    return logout(request, env);
  }

  if (principal.type !== "ADMIN") return unauthorized();

  if (path === "/me" && method === "GET") {
    const row = await env.DB.prepare(`SELECT id, username, created_at FROM admins WHERE id = ?`)
      .bind(principal.id)
      .first<AdminRow>();
    if (!row) return unauthorized();
    return json({ id: row.id, username: row.username, createdAt: row.created_at });
  }

  if (path === "/devices" && method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, name, session_id, status, created_at, updated_at, last_seen_at
       FROM devices WHERE admin_id = ? ORDER BY created_at DESC`,
    )
      .bind(principal.id)
      .all();
    return json({ devices: rows.results ?? [] });
  }

  if (path === "/devices" && method === "POST") {
    return createDevice(request, env, principal);
  }

  const deviceMatch = path.match(/^\/devices\/([^/]+)$/);
  if (deviceMatch) {
    const id = decodeURIComponent(deviceMatch[1]!);
    if (method === "GET") return getDevice(env, principal, id);
    if (method === "PATCH") return patchDevice(request, env, principal, id);
    if (method === "DELETE") return deleteDevice(env, principal, id);
  }

  const recordsMatch = path.match(/^\/devices\/([^/]+)\/records$/);
  if (recordsMatch && method === "GET") {
    const id = decodeURIComponent(recordsMatch[1]!);
    const device = await ownedDevice(env, principal.id, id);
    if (!device) return notFound("device");
    const rows = await env.DB.prepare(
      `SELECT * FROM usage_records WHERE device_id = ? ORDER BY started_at DESC LIMIT 200`,
    )
      .bind(id)
      .all();
    return json({ records: rows.results ?? [] });
  }

  if (recordsMatch && method === "POST") {
    const id = decodeURIComponent(recordsMatch[1]!);
    return postRecord(request, env, principal, id);
  }

  return notFound();
}

async function setup(request: Request, env: Env): Promise<Response> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admins`).first<{ n: number }>();
  if ((row?.n ?? 0) > 0) return json({ error: "already_setup" }, { status: 409 });
  const body = await readJson(request);
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (username.length < 2 || password.length < 8) {
    return json({ error: "invalid_credentials" }, { status: 400 });
  }
  const now = Date.now();
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO admins (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, username, await hashPassword(password), now, now)
    .run();
  const token = await createAdminSession(env.DB, id);
  return json(
    { ok: true, id, username },
    { headers: { "Set-Cookie": setSessionCookie(token, isSecureRequest(request)) } },
  );
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const row = await env.DB.prepare(
    `SELECT id, username, password_hash FROM admins WHERE username = ?`,
  )
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return json({ error: "invalid_credentials" }, { status: 401 });
  }
  const token = await createAdminSession(env.DB, row.id);
  return json(
    { ok: true, id: row.id, username: row.username },
    { headers: { "Set-Cookie": setSessionCookie(token, isSecureRequest(request)) } },
  );
}

async function logout(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request);
  if (token) await revokeAdminSession(env.DB, token);
  return json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookie(isSecureRequest(request)) } },
  );
}

async function createDevice(request: Request, env: Env, principal: Principal): Promise<Response> {
  const body = await readJson(request);
  const name = String(body.name ?? "").trim() || "未命名设备";
  const now = Date.now();
  const id = newId();
  const sessionId = newSessionId();
  await env.DB.prepare(
    `INSERT INTO devices (id, admin_id, name, session_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'offline', ?, ?)`,
  )
    .bind(id, principal.id, name, sessionId, now, now)
    .run();
  await log(env, {
    deviceId: id,
    actorType: principal.type,
    actorId: principal.id,
    action: "device.create",
  });
  return json({ id, name, session_id: sessionId, status: "offline" }, { status: 201 });
}

async function getDevice(env: Env, principal: Principal, id: string): Promise<Response> {
  const row = await ownedDevice(env, principal.id, id);
  if (!row) return notFound("device");
  return json(row);
}

async function patchDevice(
  request: Request,
  env: Env,
  principal: Principal,
  id: string,
): Promise<Response> {
  const existing = await ownedDevice(env, principal.id, id);
  if (!existing) return notFound("device");
  const body = await readJson(request);
  const name = body.name != null ? String(body.name).trim() : existing.name;
  const status = body.status != null ? String(body.status) : existing.status;
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE devices SET name = ?, status = ?, updated_at = ? WHERE id = ? AND admin_id = ?`,
  )
    .bind(name, status, now, id, principal.id)
    .run();
  return json({ ...existing, name, status, updated_at: now });
}

async function deleteDevice(env: Env, principal: Principal, id: string): Promise<Response> {
  const existing = await ownedDevice(env, principal.id, id);
  if (!existing) return notFound("device");
  await env.DB.prepare(`DELETE FROM devices WHERE id = ? AND admin_id = ?`).bind(id, principal.id).run();
  return json({ ok: true });
}

async function postRecord(
  request: Request,
  env: Env,
  principal: Principal,
  deviceId: string,
): Promise<Response> {
  const device = await ownedDevice(env, principal.id, deviceId);
  if (!device) return notFound("device");
  const body = await readJson(request);
  const now = Date.now();
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO usage_records
      (id, device_id, started_at, ended_at, duration_ms, max_a, max_b, stops, waves, note, tag, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      deviceId,
      Number(body.startedAt ?? now),
      Number(body.endedAt ?? now),
      Number(body.durationMs ?? 0),
      Number(body.maxA ?? 0),
      Number(body.maxB ?? 0),
      Number(body.stops ?? 0),
      JSON.stringify(body.waves ?? []),
      String(body.note ?? ""),
      String(body.tag ?? ""),
      now,
    )
    .run();
  return json({ id }, { status: 201 });
}

async function ownedDevice(env: Env, adminId: string, id: string) {
  return env.DB.prepare(
    `SELECT id, admin_id, name, session_id, status, created_at, updated_at, last_seen_at
     FROM devices WHERE id = ? AND admin_id = ?`,
  )
    .bind(id, adminId)
    .first<Record<string, unknown>>();
}

async function log(
  env: Env,
  entry: { deviceId?: string; actorType: string; actorId?: string; action: string; payload?: unknown },
) {
  await env.DB.prepare(
    `INSERT INTO activity_logs (id, device_id, actor_type, actor_id, action, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      entry.deviceId ?? null,
      entry.actorType,
      entry.actorId ?? null,
      entry.action,
      entry.payload ? JSON.stringify(entry.payload) : null,
      Date.now(),
    )
    .run();
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
