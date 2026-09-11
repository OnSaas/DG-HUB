export const NAV = [
  { to: "/devices", label: "设备", match: "exact" as const },
  { to: "/console", label: "控制台", match: "prefix" as const },
  { to: "/pair", label: "配对", match: "prefix" as const },
  { to: "/waves", label: "波形", match: "prefix" as const },
  { to: "/records", label: "记录", match: "prefix" as const },
  { to: "/settings", label: "设置", match: "prefix" as const },
];

export function deviceNav(deviceId: string) {
  return [
    { to: "/devices", label: "设备", match: "exact" as const },
    { to: `/devices/${deviceId}`, label: "控制台", match: "exact" as const },
    { to: `/devices/${deviceId}/pair`, label: "配对", match: "prefix" as const },
    { to: `/devices/${deviceId}/waves`, label: "波形", match: "prefix" as const },
    { to: `/devices/${deviceId}/records`, label: "记录", match: "prefix" as const },
    { to: `/devices/${deviceId}/settings`, label: "设备设置", match: "prefix" as const },
    { to: "/settings", label: "偏好", match: "prefix" as const },
  ];
}
