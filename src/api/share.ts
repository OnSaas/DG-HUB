import { verifyPassword } from "../auth/password";
import {
  SHARE_COOKIE,
  SHARE_SESSION_CAP_S,
  clearShareCookie,
  isSecureRequest,
  readCookie,
  setShareCookie,
} from "../auth/cookie";
import { json, notFound, unauthorized } from "../auth/middleware";
import type { Principal } from "../auth/principal";
import {
  createShareSession,
  deleteShareSessionByToken,
  getShareByUrlToken,
  parsePermissions,
  resolveShareSessionToken,
  shareActive,
} from "../db/shares";
import { getDeviceById } from "../db/devices";

export async function handleShare(
  request: Request,
  env: Env,
  url: URL,
  principal: Principal,
): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/share/, "") || "/";
  const method = request.method;
  const secure = isSecureRequest(request);

  if (path === "/logout" && method === "POST") {
    const token = readCookie(request, SHARE_COOKIE);
    if (token) await deleteShareSessionByToken(env.DB, token);
    return json({ ok: true }, { headers: { "Set-Cookie": clearShareCookie(secure) } });
  }

  if (path === "/me" && method === "GET") {
    if (principal.type !== "SHARE" || !principal.deviceId) return unauthorized("share_required");
    const device = await getDeviceById(env.DB, principal.deviceId);
    if (!device) return notFound("device");
    const cookie = readCookie(request, SHARE_COOKIE);
    const resolved = cookie ? await resolveShareSessionToken(env.DB, cookie) : null;
    return json({
      deviceId: device.id,
      deviceName: device.name,
      sessionId: device.session_id,
      permissions: principal.permissions,
      expiresAt: resolved?.expiresAt ?? null,
    });
  }

  const metaMatch = path.match(/^\/([^/]+)\/meta$/);
  if (metaMatch && method === "GET") {
    const token = decodeURIComponent(metaMatch[1]!);
    const share = await getShareByUrlToken(env.DB, token);
    if (!share) return json({ ok: false, error: "not_found" }, { status: 404 });
    const device = await getDeviceById(env.DB, share.device_id);
    const { expired, revoked } = shareActive(share);
    return json({
      ok: true,
      deviceName: device?.name ?? "设备",
      requiresPassword: Boolean(share.password_hash),
      expired,
      revoked,
    });
  }

  const unlockMatch = path.match(/^\/([^/]+)\/unlock$/);
  if (unlockMatch && method === "POST") {
    const token = decodeURIComponent(unlockMatch[1]!);
    const share = await getShareByUrlToken(env.DB, token);
    if (!share) return unauthorized("invalid_credentials");
    const { expired, revoked } = shareActive(share);
    if (revoked) return json({ ok: false, revoked: true }, { status: 404 });
    if (expired) return json({ ok: false, expired: true }, { status: 404 });
    const device = await getDeviceById(env.DB, share.device_id);
    if (!device) return notFound("device");
    const body = await readJson(request);
    if (share.password_hash) {
      const password = String(body.password ?? "");
      if (!(await verifyPassword(password, share.password_hash))) {
        return unauthorized("invalid_credentials");
      }
    }
    const now = Date.now();
    const shareLeftMs = share.expires_at == null ? SHARE_SESSION_CAP_S * 1000 : Math.max(0, share.expires_at - now);
    const ttlMs = Math.min(SHARE_SESSION_CAP_S * 1000, shareLeftMs);
    if (ttlMs < 1000) return json({ ok: false, expired: true }, { status: 404 });
    const sessionToken = await createShareSession(env.DB, share.id, now + ttlMs);
    const permissions = parsePermissions(share.permissions);
    return json(
      {
        deviceId: device.id,
        deviceName: device.name,
        sessionId: device.session_id,
        permissions,
        expiresAt: now + ttlMs,
      },
      { headers: { "Set-Cookie": setShareCookie(sessionToken, Math.floor(ttlMs / 1000), secure) } },
    );
  }

  return notFound();
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
