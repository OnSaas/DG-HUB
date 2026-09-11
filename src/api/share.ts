import { json, unauthorized } from "../auth/middleware";
import type { Principal } from "../auth/principal";

/** Share namespace is reserved. Phase 1: no anonymous share control. */
export async function handleShare(
  _request: Request,
  _env: Env,
  _url: URL,
  principal: Principal,
): Promise<Response> {
  if (principal.type === "PUBLIC") return unauthorized("share_required");
  return json({ error: "not_implemented" }, { status: 501 });
}
