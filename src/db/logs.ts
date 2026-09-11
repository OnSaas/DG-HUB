import { newId } from "../lib/crypto";

export async function insertActivity(
  db: D1Database,
  entry: {
    deviceId?: string;
    actorType: string;
    actorId?: string;
    action: string;
    payload?: unknown;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO activity_logs (id, device_id, actor_type, actor_id, action, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      entry.deviceId ?? null,
      entry.actorType,
      entry.actorId ?? null,
      entry.action,
      entry.payload ? JSON.stringify(entry.payload) : null,
      Date.now(),
    )
    .run();
}

export async function listUsageByDevice(db: D1Database, deviceId: string) {
  const rows = await db
    .prepare(`SELECT * FROM usage_records WHERE device_id = ? ORDER BY started_at DESC LIMIT 200`)
    .bind(deviceId)
    .all();
  return rows.results ?? [];
}

export async function insertUsage(
  db: D1Database,
  rec: {
    id: string;
    deviceId: string;
    startedAt: number;
    endedAt: number;
    durationMs: number;
    maxA: number;
    maxB: number;
    stops: number;
    waves: string;
    note: string;
    tag: string;
    now: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO usage_records
        (id, device_id, started_at, ended_at, duration_ms, max_a, max_b, stops, waves, note, tag, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      rec.id,
      rec.deviceId,
      rec.startedAt,
      rec.endedAt,
      rec.durationMs,
      rec.maxA,
      rec.maxB,
      rec.stops,
      rec.waves,
      rec.note,
      rec.tag,
      rec.now,
    )
    .run();
}
