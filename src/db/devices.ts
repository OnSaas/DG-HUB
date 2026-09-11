export type DeviceRow = {
  id: string;
  admin_id: string;
  name: string;
  session_id: string;
  status: string;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
};

const COLS = `id, admin_id, name, session_id, status, created_at, updated_at, last_seen_at`;

export async function listDevicesByAdmin(db: D1Database, adminId: string): Promise<DeviceRow[]> {
  const rows = await db.prepare(`SELECT ${COLS} FROM devices WHERE admin_id = ? ORDER BY created_at DESC`).bind(adminId).all<DeviceRow>();
  return (rows.results ?? []) as DeviceRow[];
}

export async function getOwnedDevice(db: D1Database, adminId: string, id: string): Promise<DeviceRow | null> {
  return db.prepare(`SELECT ${COLS} FROM devices WHERE id = ? AND admin_id = ?`).bind(id, adminId).first<DeviceRow>();
}

export async function getDeviceBySessionId(db: D1Database, sessionId: string): Promise<DeviceRow | null> {
  return db.prepare(`SELECT ${COLS} FROM devices WHERE session_id = ?`).bind(sessionId).first<DeviceRow>();
}

export async function insertDevice(
  db: D1Database,
  row: { id: string; adminId: string; name: string; sessionId: string; now: number },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO devices (id, admin_id, name, session_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'offline', ?, ?)`,
    )
    .bind(row.id, row.adminId, row.name, row.sessionId, row.now, row.now)
    .run();
}

export async function updateDevice(
  db: D1Database,
  adminId: string,
  id: string,
  patch: { name: string; status: string; now: number },
): Promise<void> {
  await db
    .prepare(`UPDATE devices SET name = ?, status = ?, updated_at = ? WHERE id = ? AND admin_id = ?`)
    .bind(patch.name, patch.status, patch.now, id, adminId)
    .run();
}

export async function deleteOwnedDevice(db: D1Database, adminId: string, id: string): Promise<void> {
  await db.prepare(`DELETE FROM devices WHERE id = ? AND admin_id = ?`).bind(id, adminId).run();
}

export async function markDeviceOnline(db: D1Database, id: string): Promise<void> {
  const now = Date.now();
  await db.prepare(`UPDATE devices SET status = 'online', last_seen_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, id).run();
}

export async function touchDeviceSeen(db: D1Database, id: string): Promise<void> {
  const now = Date.now();
  await db.prepare(`UPDATE devices SET last_seen_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, id).run();
}
