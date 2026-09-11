import { readCookie } from "./cookie";
import { publicPrincipal, type Principal } from "./principal";
import { resolveAdmin } from "./session";

export async function authenticate(request: Request, db: D1Database): Promise<Principal> {
  const token = readCookie(request);
  if (!token) return publicPrincipal();
  const admin = await resolveAdmin(db, token);
  return admin ?? publicPrincipal();
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
