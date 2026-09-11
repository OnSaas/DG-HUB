/** Public Data ≠ Admin Data. Never expose session_id, admin_id, or full Device. */

export interface PublicDeviceCard {
  name: string;
  status: string;
  title: string | null;
}

export async function listPublicSnapshot(db: D1Database): Promise<{ devices: PublicDeviceCard[] }> {
  const rows = await db
    .prepare(
      `SELECT d.name AS name, d.status AS status, p.title AS title
       FROM public_pages p
       JOIN devices d ON d.id = p.device_id
       WHERE p.enabled = 1`,
    )
    .all<PublicDeviceCard>();
  return { devices: (rows.results ?? []) as PublicDeviceCard[] };
}
