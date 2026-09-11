export const NAV = [
  { to: "/admin/devices", key: "nav.devices", match: "exact" as const },
  { to: "/admin/mcp", key: "nav.mcp", match: "prefix" as const },
];

export function deviceNav(deviceId: string) {
  return [
    { to: "/admin/devices", key: "nav.devices", match: "exact" as const },
    { to: `/admin/devices/${deviceId}`, key: "nav.console", match: "exact" as const },
    { to: `/admin/devices/${deviceId}/pair`, key: "nav.pair", match: "prefix" as const },
    { to: `/admin/devices/${deviceId}/waves`, key: "nav.waves", match: "prefix" as const },
    { to: `/admin/devices/${deviceId}/records`, key: "nav.records", match: "prefix" as const },
    { to: `/admin/devices/${deviceId}/settings`, key: "nav.settings", match: "prefix" as const },
    { to: "/admin/mcp", key: "nav.mcp", match: "prefix" as const },
  ];
}
