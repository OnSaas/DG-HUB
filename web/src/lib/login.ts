export function loginHref(next: string): string {
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/devices";
  if (path.startsWith("/login") || path.startsWith("/admin/login")) return "/login";
  return `/login?next=${encodeURIComponent(path)}`;
}

export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/devices";
  if (raw.startsWith("/login") || raw.startsWith("/admin/login")) return "/devices";
  return raw;
}
