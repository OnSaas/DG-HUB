import { api } from "./client";

export interface AdminMe {
  id: string;
  username: string;
  createdAt: number;
}

export interface Device {
  id: string;
  name: string;
  session_id: string;
  status: string;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
}

export const adminApi = {
  setupNeeded: () => api<{ needed: boolean }>("/api/admin/setup-needed"),
  setup: (username: string, password: string) =>
    api<{ ok: boolean }>("/api/admin/setup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    api<{ ok: boolean }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => api<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
  me: () => api<AdminMe>("/api/admin/me"),
  devices: () => api<{ devices: Device[] }>("/api/admin/devices"),
  createDevice: (name: string) =>
    api<Device>("/api/admin/devices", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  device: (id: string) => api<Device>(`/api/admin/devices/${id}`),
  patchDevice: (id: string, body: Partial<{ name: string; status: string }>) =>
    api<Device>(`/api/admin/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteDevice: (id: string) =>
    api<{ ok: boolean }>(`/api/admin/devices/${id}`, { method: "DELETE" }),
  activities: (id: string, before?: number) => {
    const q = before ? `?before=${before}&limit=20` : "?limit=20";
    return api<{ items: Activity[]; hasMore: boolean }>(`/api/admin/devices/${id}/activities${q}`);
  },
  logActivity: (id: string, action: string, payload?: unknown) =>
    api<{ ok: boolean }>(`/api/admin/devices/${id}/activities`, {
      method: "POST",
      body: JSON.stringify({ action, payload }),
    }),
};

export interface Activity {
  id: string;
  action: string;
  payload: string | null;
  created_at: number;
}
