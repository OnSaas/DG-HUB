import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeviceState } from "../app/DeviceProvider";
import { NeedDevice } from "../app/LegacyAdminRedirect";
import { PageHeader } from "../layout/PageHeader";
import { adminApi, type Activity } from "../lib/api/admin";
import { formatClock } from "../lib/records";

export function RecordsPage() {
  const { device, loading, error } = useDeviceState();
  const nav = useNavigate();
  const [items, setItems] = useState<Activity[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    async (before?: number) => {
      if (!device) return;
      setBusy(true);
      setLoadError(null);
      try {
        const data = await adminApi.activities(device.id, before);
        setItems((prev) => (before ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [device],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !device) return <p className="text-sm text-neutral-500">加载…</p>;
  if (error) {
    return (
      <button type="button" onClick={() => nav("/admin/devices")}>
        设备不存在，返回
      </button>
    );
  }
  if (!device) return <NeedDevice title="记录" />;

  return (
    <>
      <PageHeader title="记录" description={`${device.name} 的控制操作`} />
      {loadError ? <p className="mb-3 text-sm text-red-600">{loadError}</p> : null}
      {items.length === 0 && !busy ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-12 text-center text-sm text-neutral-500">
          还没有记录。在控制台调节强度或下发波形后会出现。
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5">
          {items.map((row) => {
            const payload = parsePayload(row.payload);
            return (
              <li key={row.id} className="py-3 text-sm">
                <p className="font-medium">{labelOf(row.action)}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {formatClock(row.created_at)}
                  {payload.channel ? ` · 通道 ${payload.channel}` : ""}
                  {payload.wave ? ` · 波形 ${payload.wave}` : ""}
                  {payload.strength != null ? ` · 强度 ${payload.strength}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore ? (
        <button
          type="button"
          disabled={busy}
          className="mt-4 text-sm text-neutral-500"
          onClick={() => void load(items[items.length - 1]?.created_at)}
        >
          {busy ? "加载中…" : "加载更多"}
        </button>
      ) : null}
    </>
  );
}

function parsePayload(raw: string | null): { channel?: string; wave?: string; strength?: number } {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as { channel?: string; wave?: string; strength?: number };
  } catch {
    return {};
  }
}

function labelOf(action: string) {
  if (action === "estop") return "急停";
  if (action === "wave") return "波形";
  if (action === "strength") return "强度";
  if (action === "stop") return "停止波形";
  if (action === "reconnect") return "重连";
  return action;
}
