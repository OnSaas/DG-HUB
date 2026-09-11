import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../layout/PageHeader";
import { adminApi, type Device, type CreatedMcpGrant, type McpGrant } from "../../lib/api/admin";

const PRESETS: { label: string; ms: number | null }[] = [
  { label: "1 小时", ms: 60 * 60 * 1000 },
  { label: "6 小时", ms: 6 * 60 * 60 * 1000 },
  { label: "24 小时", ms: 24 * 60 * 60 * 1000 },
  { label: "7 天", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "永不过期", ms: null },
];

const PERMS = [
  { id: "device.control.strength", label: "强度" },
  { id: "device.control.wave", label: "波形" },
  { id: "device.control.stop", label: "急停" },
];

export function McpPage() {
  const [params] = useSearchParams();
  const pre = params.get("device") ?? "";
  const [grants, setGrants] = useState<McpGrant[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("Claude 家用");
  const [scope, setScope] = useState<"all" | "devices">(pre ? "devices" : "all");
  const [selected, setSelected] = useState<string[]>(pre ? [pre] : []);
  const [preset, setPreset] = useState(2);
  const [capA, setCapA] = useState(40);
  const [capB, setCapB] = useState(40);
  const [capStep, setCapStep] = useState(10);
  const [capRpm, setCapRpm] = useState(30);
  const [capWaveS, setCapWaveS] = useState(30);
  const [perms, setPerms] = useState<string[]>(PERMS.map((p) => p.id));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMcpGrant | null>(null);

  async function load() {
    const [g, d] = await Promise.all([adminApi.mcpGrants(), adminApi.devices()]);
    setGrants(g.grants);
    setDevices(d.devices);
  }

  useEffect(() => {
    void load().catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  function toggleDevice(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const ms = PRESETS[preset]?.ms;
      const row = await adminApi.createMcpGrant({
        name,
        scope,
        deviceIds: scope === "devices" ? selected : [],
        permissions: perms,
        expiresAt: ms == null ? null : Date.now() + ms,
        capA,
        capB,
        capStep,
        capRpm,
        capWaveS,
      });
      setCreated(row);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("撤销后 Token 立刻失效。")) return;
    setBusy(true);
    try {
      await adminApi.revokeMcpGrant(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sample = created
    ? JSON.stringify(
        {
          mcpServers: {
            "dg-hub": {
              url: created.url,
              headers: { Authorization: `Bearer ${created.token}` },
            },
          },
        },
        null,
        2,
      )
    : "";

  return (
    <>
      <PageHeader title="MCP" description="给 Claude / Cursor / Grok 签发远程控制授权。匿名用户看不见。" />
      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}

      <section className="rounded-2xl border border-black/10 p-4">
        <h2 className="text-base font-semibold">新建授权</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            名称
            <input className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          </label>
          <label className="text-sm">
            时长
            <select className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" value={preset} onChange={(e) => setPreset(Number(e.currentTarget.value))}>
              {PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} />
            我的全部设备
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={scope === "devices"} onChange={() => setScope("devices")} />
            指定设备
          </label>
        </div>
        {scope === "devices" ? (
          <ul className="mt-2 max-h-40 overflow-auto rounded-xl border border-black/10 p-2 text-sm">
            {devices.map((d) => (
              <li key={d.id}>
                <label className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleDevice(d.id)} />
                  {d.name}
                </label>
              </li>
            ))}
            {devices.length === 0 ? <li className="text-neutral-500">还没有设备</li> : null}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {PERMS.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={perms.includes(p.id)}
                onChange={() =>
                  setPerms((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                }
              />
              {p.label}
            </label>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
          <Num label="A 上限" value={capA} max={200} onChange={setCapA} />
          <Num label="B 上限" value={capB} max={200} onChange={setCapB} />
          <Num label="步长" value={capStep} max={40} onChange={setCapStep} />
          <Num label="次/分钟" value={capRpm} max={600} onChange={setCapRpm} />
          <Num label="波形秒" value={capWaveS} max={120} onChange={setCapWaveS} />
        </div>
        <button
          type="button"
          disabled={busy}
          className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void create()}
        >
          {busy ? "…" : "签发"}
        </button>
      </section>

      {created ? (
        <section className="mt-4 rounded-2xl border border-black/10 p-4">
          <p className="text-sm font-medium">只显示一次，关掉就没了</p>
          <p className="mt-2 break-all font-mono text-xs">URL {created.url}</p>
          <p className="mt-1 break-all font-mono text-xs">Token {created.token}</p>
          <pre className="mt-3 overflow-auto rounded-xl bg-neutral-50 p-3 text-xs">{sample}</pre>
          <button type="button" className="mt-2 text-sm" onClick={() => void navigator.clipboard.writeText(sample)}>
            复制配置
          </button>
          <button type="button" className="ml-3 text-sm text-neutral-500" onClick={() => setCreated(null)}>
            关闭
          </button>
        </section>
      ) : null}

      <ul className="mt-6 flex flex-col gap-2">
        {grants.map((g) => (
          <li key={g.id} className="rounded-2xl border border-black/5 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {g.scope === "all" ? "全部设备" : `${g.deviceIds.length} 台`} · A{g.capA}/B{g.capB} 步{g.capStep} ·{" "}
                  {g.revoked ? "已撤销" : g.expired ? "已过期" : g.expiresAt ? new Date(g.expiresAt).toLocaleString() : "永久"}
                </p>
              </div>
              {!g.revoked && !g.expired ? (
                <button type="button" className="text-red-600" onClick={() => void revoke(g.id)}>
                  撤销
                </button>
              ) : null}
            </div>
          </li>
        ))}
        {grants.length === 0 ? <li className="text-sm text-neutral-500">还没有 MCP 授权</li> : null}
      </ul>
    </>
  );
}

function Num({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={0}
        max={max}
        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </label>
  );
}
