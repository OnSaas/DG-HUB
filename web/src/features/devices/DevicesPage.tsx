import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth/AuthProvider";
import { StatusDot, formatLastSeen } from "../../components/StatusDot";
import { PageHeader } from "../../layout/PageHeader";
import { adminApi, type Device } from "../../lib/api/admin";
import { loginHref } from "../../lib/login";

export function DevicesPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { me, loading: authLoading } = useAuth();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    const data = await adminApi.devices();
    setDevices(data.devices);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!me) {
      setDevices([]);
      return;
    }
    void load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    const t = window.setInterval(() => void load().catch(() => null), 5000);
    return () => window.clearInterval(t);
  }, [authLoading, me]);

  function goLogin() {
    nav(loginHref(loc.pathname + loc.search));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!me) {
      goLogin();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const device = await adminApi.createDevice(name.trim() || "未命名设备");
      setName("");
      nav(`/devices/${device.id}/pair`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("删除后无法恢复，配对码失效。确定？")) return;
    setDeleting(id);
    try {
      await adminApi.deleteDevice(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader title="设备" description="添加设备后扫码配对，再进入控制台。" />
      <form className="mb-6 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => void create(e)}>
        <input
          className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
          placeholder="设备名称"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "创建中…" : "添加设备"}
        </button>
      </form>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {authLoading || devices === null ? (
        <p className="text-sm text-neutral-500">加载设备列表…</p>
      ) : devices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-12 text-center text-sm text-neutral-500">
          {me ? "还没有设备。输入名称后点「添加设备」。" : "登录后才能添加设备。点「添加设备」会跳到登录。"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 px-4 py-3"
            >
              <Link to={`/devices/${d.id}`} className="min-w-0 flex-1">
                <p className="font-medium">{d.name}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  <StatusDot online={d.status === "online"} /> · 最后在线 {formatLastSeen(d.last_seen_at)}
                </p>
              </Link>
              <div className="flex gap-2">
                <Link to={`/devices/${d.id}/pair`} className="rounded-xl px-3 py-1.5 text-sm hover:bg-neutral-100">
                  配对
                </Link>
                <Link to={`/devices/${d.id}`} className="rounded-xl bg-zinc-900 px-3 py-1.5 text-sm text-white">
                  进入
                </Link>
                <button
                  type="button"
                  disabled={deleting === d.id}
                  className="rounded-xl px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => void remove(d.id)}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
