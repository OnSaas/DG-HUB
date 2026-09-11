import { json } from "../auth/middleware";
import { listPublicSnapshot } from "../db/public";

export async function handlePublic(_request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/public/, "") || "/";
  if (path === "/health" || path === "/") {
    return json({ ok: true, layer: "public" });
  }
  if (path === "/devices") {
    return json(await listPublicSnapshot(env.DB));
  }
  return json({ error: "Not Found" }, { status: 404 });
}
