import { json } from "../auth/middleware";

export async function handlePublic(_request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/public/, "") || "/";
  if (path === "/health" || path === "/") {
    return json({ ok: true, layer: "public" });
  }
  if (path === "/stats") {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM usage_records`).first<{ n: number }>();
    return json({ records: row?.n ?? 0 });
  }
  return json({ error: "Not Found" }, { status: 404 });
}
