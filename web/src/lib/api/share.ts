import { api } from "./client";

export interface ShareMeta {
  ok: boolean;
  deviceName?: string;
  requiresPassword?: boolean;
  expired?: boolean;
  revoked?: boolean;
  error?: string;
}

export interface ShareUnlock {
  deviceId: string;
  deviceName: string;
  sessionId: string;
  permissions: string[];
  expiresAt: number | null;
}

export const shareApi = {
  meta: (token: string) => api<ShareMeta>(`/api/share/${encodeURIComponent(token)}/meta`),
  unlock: (token: string, password?: string) =>
    api<ShareUnlock>(`/api/share/${encodeURIComponent(token)}/unlock`, {
      method: "POST",
      body: JSON.stringify(password ? { password } : {}),
    }),
  me: () => api<ShareUnlock>("/api/share/me"),
  logout: () => api<{ ok: boolean }>("/api/share/logout", { method: "POST" }),
};

export function shareCan(perms: string[], perm: string): boolean {
  if (perm.startsWith("device.control.") && perms.includes("device.control")) return true;
  return perms.includes(perm);
}
