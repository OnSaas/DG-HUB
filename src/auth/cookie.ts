export const COOKIE = "dg_hub_sid";
export const SHARE_COOKIE = "dg_hub_share";
const MAX_AGE = 60 * 60 * 24 * 30;
export const SHARE_SESSION_CAP_S = 60 * 60 * 24;

export function readCookie(request: Request, name = COOKIE): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function setSessionCookie(token: string, secure: boolean): string {
  const bits = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE}`,
  ];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const bits = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export function setShareCookie(token: string, maxAge: number, secure: boolean): string {
  const bits = [
    `${SHARE_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(1, Math.floor(maxAge))}`,
  ];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export function clearShareCookie(secure: boolean): string {
  const bits = [`${SHARE_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}
