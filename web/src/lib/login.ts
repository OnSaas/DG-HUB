export function loginHref(next: string): string {
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/admin/devices";
  if (path.startsWith("/login") || path.startsWith("/admin/login")) return "/admin/login";
  return `/admin/login?next=${encodeURIComponent(path)}`;
}

export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin/devices";
  if (raw.startsWith("/login") || raw.startsWith("/admin/login")) return "/admin/devices";
  if (raw === "/" || raw.startsWith("/share")) return "/admin/devices";
  return raw;
}
