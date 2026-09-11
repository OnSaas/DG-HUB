export async function adminCount(db: D1Database): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM admins`).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getAdminByUsername(db: D1Database, username: string) {
  return db
    .prepare(`SELECT id, username, password_hash FROM admins WHERE username = ?`)
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>();
}

export async function getAdminPublic(db: D1Database, id: string) {
  return db.prepare(`SELECT id, username, created_at FROM admins WHERE id = ?`).bind(id).first<{
    id: string;
    username: string;
    created_at: number;
  }>();
}

export async function insertAdmin(
  db: D1Database,
  row: { id: string; username: string; passwordHash: string; now: number },
): Promise<void> {
  await db
    .prepare(`INSERT INTO admins (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(row.id, row.username, row.passwordHash, row.now, row.now)
    .run();
}
