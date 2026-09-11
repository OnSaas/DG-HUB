import { useEffect, useState } from "react";
import { adminApi, type CreatedShare, type ShareRecord } from "../../lib/api/admin";

const PERMS: { id: string; label: string }[] = [
  { id: "device.control", label: "全量控制" },
  { id: "device.control.strength", label: "强度" },
  { id: "device.control.wave", label: "波形" },
  { id: "device.control.stop", label: "急停" },
  { id: "device.pair.read", label: "看配对码" },
];

const PRESETS: { label: string; ms: number | null }[] = [
  { label: "1 小时", ms: 60 * 60 * 1000 },
  { label: "6 小时", ms: 6 * 60 * 60 * 1000 },
  { label: "24 小时", ms: 24 * 60 * 60 * 1000 },
  { label: "7 天", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "永不过期", ms: null },
];

export function SharePanel({ deviceId }: { deviceId: string }) {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [password, setPassword] = useState("");
  const [preset, setPreset] = useState(2);
  const [perms, setPerms] = useState<string[]>(["device.control"]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await adminApi.listShares(deviceId);
    setShares(res.shares);
  }

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  function togglePerm(id: string) {
    setPerms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const ms = PRESETS[preset]?.ms;
      const body = {
        password: password || undefined,
        expiresAt: ms == null ? null : Date.now() + ms,
        permissions: perms.length ? perms : ["device.control"],
      };
      const row = await adminApi.createShare(deviceId, body);
      setCreated(row);
      setPassword("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("撤销后链接立刻失效。")) return;
    setBusy(true);
    try {
      await adminApi.revokeShare(deviceId, id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-black/10 p-4">
      <h2 className="text-base font-semibold">分享链接</h2>
      <p className="mt-1 text-sm text-neutral-500">拿到链接的人只能控这一台，不能看其它设备、不能删、不能再开分享。</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${i === preset ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
            onClick={() => setPreset(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {PERMS.map((p) => (
          <label key={p.id} className="flex items-center gap-1.5">
            <input type="checkbox" checked={perms.includes(p.id)} onChange={() => togglePerm(p.id)} />
            {p.label}
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
          placeholder="可选密码"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <button
          type="button"
          disabled={busy}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white"
          onClick={() => void create()}
        >
          生成链接
        </button>
      </div>
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}

      {created ? (
        <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm">
          <p className="font-medium">完整 URL 只显示一次</p>
          <p className="mt-1 break-all font-mono text-xs">{created.url}</p>
          <button
            type="button"
            className="mt-2 rounded-lg border px-3 py-1"
            onClick={() => void navigator.clipboard.writeText(created.url)}
          >
            复制
          </button>
          <button type="button" className="ml-2 text-neutral-500" onClick={() => setCreated(null)}>
            关闭
          </button>
        </div>
      ) : null}

      <ul className="mt-4 divide-y text-sm">
        {shares.length === 0 ? <li className="py-3 text-neutral-400">还没有分享</li> : null}
        {shares.map((s) => {
          const status = s.revoked ? "已撤销" : s.expired ? "已过期" : "有效";
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p>
                  {status}
                  {s.passwordProtected ? " · 有密码" : " · 无密码"}
                </p>
                <p className="text-xs text-neutral-400">
                  {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "永不过期"} · {s.permissions.join(", ")}
                </p>
              </div>
              {!s.revoked ? (
                <button type="button" disabled={busy} className="text-red-600" onClick={() => void revoke(s.id)}>
                  撤销
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
