import { COOKIE, SHARE_COOKIE, readCookie } from "./cookie";
import { publicPrincipal, type Principal } from "./principal";
import { resolveAdmin, resolveMcpBearer, resolveShareSession } from "./session";

export async function authenticate(request: Request, db: D1Database): Promise<Principal> {
  const adminToken = readCookie(request, COOKIE);
  if (adminToken) {
    const admin = await resolveAdmin(db, adminToken);
    if (admin) return admin;
  }
  const shareToken = readCookie(request, SHARE_COOKIE);
  if (shareToken) {
    const share = await resolveShareSession(db, shareToken);
    if (share) return share;
  }
  const auth = request.headers.get("Authorization");
  if (auth) {
    const mcp = await resolveMcpBearer(db, auth);
    if (mcp) return mcp;
  }
  return publicPrincipal();
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

export function unauthorized(message = "Unauthorized"): Response {
  return json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): Response {
  return json({ error: message }, { status: 403 });
}

export function notFound(message = "Not Found"): Response {
  return json({ error: message }, { status: 404 });
}
