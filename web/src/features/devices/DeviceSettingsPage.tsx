import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useDeviceState } from "../../app/DeviceProvider";
import { StatusDot, formatLastSeen } from "../../components/StatusDot";
import { PageHeader } from "../../layout/PageHeader";
import { adminApi } from "../../lib/api/admin";
import { useConsole } from "../../state/ConsoleProvider";
import { SharePanel } from "./SharePanel";

export function DeviceSettingsPage() {
  const { device, loading, error, refresh } = useDeviceState();
  const { relay } = useConsole();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (loading && !device) return <p className="text-sm text-neutral-500">加载…</p>;
  if (error || !device) {
    return (
      <div>
        <p>设备不存在</p>
        <button type="button" className="mt-2 text-sm" onClick={() => nav("/admin/devices")}>
          返回
        </button>
      </div>
    );
  }

  const display = name || device.name;
  const deviceId = device.id;
  const fallbackName = device.name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.patchDevice(deviceId, { name: display.trim() || fallbackName });
      await refresh();
      setMsg("已保存");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("确定删除这台设备？配对码立即失效。")) return;
    setBusy(true);
    try {
      await adminApi.deleteDevice(deviceId);
      nav("/admin/devices");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="设备设置" description={device.name} />
      <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Device ID" value={device.id} />
        <Info label="Session ID" value={device.session_id} />
        <Info
          label="状态"
          value={
            <StatusDot online={device.status === "online" || relay.state === "paired"} />
          }
        />
        <Info label="最后在线" value={formatLastSeen(device.last_seen_at)} />
        <Info label="控制端" value={relay.state} />
        <Info label="APP" value={relay.appId ? "已连接" : "未连接"} />
      </dl>
      <form className="mb-8 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => void save(e)}>
        <input
          className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
          defaultValue={device.name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          保存名称
        </button>
      </form>
      {msg ? <p className="mb-4 text-sm text-neutral-500">{msg}</p> : null}
      <SharePanel deviceId={deviceId} />
      <section className="mt-8 rounded-2xl border border-red-200 p-4">
        <p className="text-sm font-medium text-red-700">危险操作</p>
        <p className="mt-1 text-sm text-neutral-500">删除后无法恢复。</p>
        <button
          type="button"
          disabled={busy}
          className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
          onClick={() => void remove()}
        >
          删除设备
        </button>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 break-all font-medium">{value}</dd>
    </div>
  );
}
