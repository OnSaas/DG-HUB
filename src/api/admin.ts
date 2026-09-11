import { hashPassword, verifyPassword } from "../auth/password";
import { clearSessionCookie, isSecureRequest, readCookie, setSessionCookie } from "../auth/cookie";
import { createAdminSession, revokeAdminSession } from "../auth/session";
import { json, notFound, unauthorized } from "../auth/middleware";
import type { Principal } from "../auth/principal";
import { newId, newSessionId } from "../lib/crypto";
import { adminCount, getAdminByUsername, getAdminPublic, insertAdmin } from "../db/admins";
import {
  deleteOwnedDevice,
  getOwnedDevice,
  insertDevice,
  listDevicesByAdmin,
  updateDevice,
} from "../db/devices";
import { insertActivity, insertUsage, listUsageByDevice } from "../db/logs";

export async function handleAdmin(
  request: Request,
  env: Env,
  url: URL,
  principal: Principal,
): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";
  const method = request.method;

  if (path === "/setup-needed" && method === "GET") {
    return json({ needed: (await adminCount(env.DB)) === 0 });
  }
  if (path === "/setup" && method === "POST") return setup(request, env);
  if (path === "/login" && method === "POST") return login(request, env);
  if (path === "/logout" && method === "POST") return logout(request, env);

  if (principal.type !== "ADMIN") return unauthorized();

  if (path === "/me" && method === "GET") {
    const row = await getAdminPublic(env.DB, principal.id);
    if (!row) return unauthorized();
    return json({ id: row.id, username: row.username, createdAt: row.created_at });
  }

  if (path === "/devices" && method === "GET") {
    return json({ devices: await listDevicesByAdmin(env.DB, principal.id) });
  }
  if (path === "/devices" && method === "POST") return createDevice(request, env, principal);

  const deviceMatch = path.match(/^\/devices\/([^/]+)$/);
  if (deviceMatch) {
    const id = decodeURIComponent(deviceMatch[1]!);
    if (method === "GET") {
      const row = await getOwnedDevice(env.DB, principal.id, id);
      return row ? json(row) : notFound("device");
    }
    if (method === "PATCH") return patchDevice(request, env, principal, id);
    if (method === "DELETE") {
      const existing = await getOwnedDevice(env.DB, principal.id, id);
      if (!existing) return notFound("device");
      await deleteOwnedDevice(env.DB, principal.id, id);
      return json({ ok: true });
    }
  }

  const recordsMatch = path.match(/^\/devices\/([^/]+)\/records$/);
  if (recordsMatch) {
    const id = decodeURIComponent(recordsMatch[1]!);
    const device = await getOwnedDevice(env.DB, principal.id, id);
    if (!device) return notFound("device");
    if (method === "GET") return json({ records: await listUsageByDevice(env.DB, id) });
    if (method === "POST") return postRecord(request, env, principal, id);
  }

  return notFound();
}

async function setup(request: Request, env: Env): Promise<Response> {
  if ((await adminCount(env.DB)) > 0) return json({ error: "already_setup" }, { status: 409 });
  const body = await readJson(request);
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (username.length < 2 || password.length < 8) {
    return json({ error: "invalid_credentials" }, { status: 400 });
  }
  const id = newId();
  await insertAdmin(env.DB, {
    id,
    username,
    passwordHash: await hashPassword(password),
    now: Date.now(),
  });
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
  const row = await getAdminByUsername(env.DB, username);
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
  const id = newId();
  const sessionId = newSessionId();
  await insertDevice(env.DB, { id, adminId: principal.id, name, sessionId, now: Date.now() });
  await insertActivity(env.DB, {
    deviceId: id,
    actorType: principal.type,
    actorId: principal.id,
    action: "device.create",
  });
  return json({ id, name, session_id: sessionId, status: "offline" }, { status: 201 });
}

async function patchDevice(
  request: Request,
  env: Env,
  principal: Principal,
  id: string,
): Promise<Response> {
  const existing = await getOwnedDevice(env.DB, principal.id, id);
  if (!existing) return notFound("device");
  const body = await readJson(request);
  const name = body.name != null ? String(body.name).trim() : existing.name;
  const status = body.status != null ? String(body.status) : existing.status;
  const now = Date.now();
  await updateDevice(env.DB, principal.id, id, { name, status, now });
  return json({ ...existing, name, status, updated_at: now });
}

async function postRecord(
  request: Request,
  env: Env,
  principal: Principal,
  deviceId: string,
): Promise<Response> {
  const body = await readJson(request);
  const now = Date.now();
  const id = newId();
  await insertUsage(env.DB, {
    id,
    deviceId,
    startedAt: Number(body.startedAt ?? now),
    endedAt: Number(body.endedAt ?? now),
    durationMs: Number(body.durationMs ?? 0),
    maxA: Number(body.maxA ?? 0),
    maxB: Number(body.maxB ?? 0),
    stops: Number(body.stops ?? 0),
    waves: JSON.stringify(body.waves ?? []),
    note: String(body.note ?? ""),
    tag: String(body.tag ?? ""),
    now,
  });
  await insertActivity(env.DB, {
    deviceId,
    actorType: principal.type,
    actorId: principal.id,
    action: "usage.record",
  });
  return json({ id }, { status: 201 });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
