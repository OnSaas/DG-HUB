import { Session } from "./Session";
import { handleAdmin } from "./api/admin";
import { handlePublic } from "./api/public";
import { handleShare } from "./api/share";
import { authenticate, json, unauthorized, forbidden } from "./auth/middleware";
import { canControlDevice } from "./auth/principal";
import { getDeviceBySessionId, touchDeviceSeen } from "./db/devices";
import { newId } from "./lib/crypto";
import { handleMcp, mcpCors } from "./mcp/server";

export { Session };
export { Session as DeviceSession };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.headers.get("Upgrade") === "websocket") {
        return routeWebSocket(request, env, url);
      }
      if (url.pathname === "/health" || url.pathname === "/api/health") {
        return json({ ok: true, service: "dg-hub", protocol: "v4" });
      }
      if (url.pathname.startsWith("/api/")) {
        return handleApi(request, env, url);
      }
      if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: mcpCors(request) });
        }
        const principal = await authenticate(request, env.DB);
        return handleMcp(request, env, principal);
      }
      if (url.pathname === "/ws" || url.pathname.startsWith("/ws/")) {
        return json({ error: "gone", message: "use authenticated /v4?sid=" }, { status: 410 });
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ level: "error", message: "unhandled", error: message, path: url.pathname }));
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const principal = await authenticate(request, env.DB);
  if (url.pathname.startsWith("/api/admin")) return handleAdmin(request, env, url, principal);
  if (url.pathname.startsWith("/api/share")) return handleShare(request, env, url, principal);
  if (url.pathname.startsWith("/api/public")) return handlePublic(request, env, url);
  if (url.pathname === "/api/create" || url.pathname.startsWith("/api/ok")) {
    return json({ error: "gone" }, { status: 410 });
  }
  return json({ error: "Not Found" }, { status: 404 });
}

async function routeWebSocket(request: Request, env: Env, url: URL): Promise<Response> {
  const tid = url.searchParams.get("tid") ?? url.searchParams.get("targetId");
  const sid = url.searchParams.get("sid");
  const principal = await authenticate(request, env.DB);

  if (tid) {
    const device = await getDeviceBySessionId(env.DB, tid);
    if (!device) return unauthorized("unknown_device");
    const dest = new URL(request.url);
    dest.searchParams.set("role", "app");
    dest.searchParams.set("sessionId", device.session_id);
    dest.searchParams.set("clientId", newId());
    await touchDeviceSeen(env.DB, device.id);
    return env.SESSION.getByName(device.session_id).fetch(new Request(dest, request));
  }

  if (!sid) return unauthorized("sid_or_tid_required");
  if (!canControlDevice(principal)) return unauthorized("controller_auth_required");

  const device = await getDeviceBySessionId(env.DB, sid);
  if (!device) return unauthorized("unknown_device");
  if (principal.type === "ADMIN" && device.admin_id !== principal.id) {
    return forbidden("not_owner");
  }
  if (principal.type === "SHARE") {
    if (principal.deviceId !== device.id || device.session_id !== sid) {
      return forbidden("not_share_device");
    }
  }

  const dest = new URL(request.url);
  dest.searchParams.set("role", "controller");
  dest.searchParams.set("clientId", newId());
  dest.searchParams.set("sessionId", device.session_id);
  return env.SESSION.getByName(device.session_id).fetch(new Request(dest, request));
}
