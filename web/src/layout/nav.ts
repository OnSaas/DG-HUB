export const NAV = [{ to: "/admin/devices", label: "设备", match: "exact" as const }];

export function deviceNav(deviceId: string) {
  return [
    { to: "/admin/devices", label: "设备", match: "exact" as const },
    { to: `/admin/devices/${deviceId}`, label: "控制台", match: "exact" as const },
    { to: `/admin/devices/${deviceId}/pair`, label: "配对", match: "prefix" as const },
    { to: `/admin/devices/${deviceId}/waves`, label: "波形", match: "prefix" as const },
    { to: `/admin/devices/${deviceId}/records`, label: "记录", match: "prefix" as const },
    { to: `/admin/devices/${deviceId}/settings`, label: "设置", match: "prefix" as const },
  ];
}
