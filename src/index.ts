import { Session } from "./Session";
import { handleAdmin } from "./api/admin";
import { handlePublic } from "./api/public";
import { handleShare } from "./api/share";
import { authenticate, json, unauthorized, forbidden } from "./auth/middleware";
import { can, Permission } from "./auth/principal";
import { getDeviceBySessionId, markDeviceOnline, touchDeviceSeen } from "./db/devices";

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
  const segs = url.pathname.split("/").filter(Boolean);
  const tid = url.searchParams.get("tid") ?? url.searchParams.get("targetId");
  const sid = url.searchParams.get("sid");
  const principal = await authenticate(request, env.DB);

  if (tid) {
    const device = await getDeviceBySessionId(env.DB, tid);
    if (!device) return unauthorized("unknown_device");
    const dest = new URL(request.url);
    dest.searchParams.set("role", "app");
    dest.searchParams.set("sessionId", device.session_id);
    await touchDeviceSeen(env.DB, device.id);
    return env.SESSION.getByName(device.session_id).fetch(new Request(dest, request));
  }

  const controllerPath =
    segs.length === 0 || (segs.length === 1 && (segs[0] === "v4" || segs[0] === "ws"));

  if (controllerPath || sid) {
    if (!can(principal, Permission.DEVICE_CONTROL)) {
      return unauthorized("controller_auth_required");
    }
    if (!sid) return json({ error: "sid_required" }, { status: 400 });
    const device = await getDeviceBySessionId(env.DB, sid);
    if (!device) return unauthorized("unknown_device");
    if (principal.type === "ADMIN" && device.admin_id !== principal.id) {
      return forbidden("not_owner");
    }
    const dest = new URL(request.url);
    dest.searchParams.set("role", "controller");
    dest.searchParams.set("clientId", sid);
    await markDeviceOnline(env.DB, device.id);
    return env.SESSION.getByName(device.session_id).fetch(new Request(dest, request));
  }

  return new Response("Expected wss://host/v4?sid= or ?tid=", { status: 400 });
}
