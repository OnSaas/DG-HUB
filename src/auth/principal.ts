export type PrincipalType = "ADMIN" | "SHARE" | "PUBLIC";

export const Permission = {
  ADMIN: "admin",
  DEVICE_READ: "device.read",
  DEVICE_WRITE: "device.write",
  DEVICE_CONTROL: "device.control",
  DEVICE_CONTROL_STRENGTH: "device.control.strength",
  DEVICE_CONTROL_WAVE: "device.control.wave",
  DEVICE_CONTROL_STOP: "device.control.stop",
  DEVICE_PAIR_READ: "device.pair.read",
  DEVICE_DELETE: "device.delete",
  SHARE_MANAGE: "share.manage",
} as const;

export type PermissionName = (typeof Permission)[keyof typeof Permission];

export interface Principal {
  type: PrincipalType;
  id: string;
  deviceId?: string;
  shareId?: string;
  permissions: PermissionName[];
}

export function can(principal: Principal, perm: PermissionName): boolean {
  if (principal.type === "ADMIN") return true;
  return principal.permissions.includes(perm);
}

export function canControlDevice(principal: Principal): boolean {
  if (principal.type === "ADMIN") return true;
  return (
    can(principal, Permission.DEVICE_CONTROL) ||
    can(principal, Permission.DEVICE_CONTROL_STRENGTH) ||
    can(principal, Permission.DEVICE_CONTROL_WAVE) ||
    can(principal, Permission.DEVICE_CONTROL_STOP)
  );
}

export function publicPrincipal(): Principal {
  return { type: "PUBLIC", id: "public", permissions: [] };
}
