import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ThemeLocaleControls } from "../../layout/ThemeLocaleControls";
import { StrengthPanel } from "../../components/StrengthPanel";
import { PairingCard } from "../../components/PairingCard";
import { WaveCard } from "../../components/WaveCard";
import { V4Channel, qrPayload } from "../../lib/protocol";
import { WAVE_PRESETS } from "../../lib/waves";
import { shareApi, shareCan, type ShareMeta, type ShareUnlock } from "../../lib/api/share";
import { ShareConsoleProvider, useShareConsole } from "./ShareConsoleProvider";

export function SharePage() {
  const { token } = useParams();
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [session, setSession] = useState<ShareUnlock | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const m = await shareApi.meta(token);
        if (cancelled) return;
        setMeta(m);
        if (m.ok && !m.expired && !m.revoked && !m.requiresPassword) {
          setSession(await shareApi.unlock(token));
        }
      } catch (e) {
        if (!cancelled) setMetaErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setUnlockErr(null);
    try {
      setSession(await shareApi.unlock(token, password));
    } catch (err) {
      setUnlockErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <Dead title="无效链接" />;
  if (metaErr) return <Dead title="链接不存在" />;
  if (!meta) return <p className="p-8 text-sm text-[var(--muted)]">…</p>;
  if (meta.expired) return <Dead title="链接已过期" />;
  if (meta.revoked) return <Dead title="链接已撤销" />;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Share</p>
        <h1 className="mt-2 text-3xl font-semibold">{meta.deviceName ?? "设备"}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {meta.requiresPassword ? "输入密码后才能控制这一台设备。" : "正在解锁…"}
        </p>
        {meta.requiresPassword ? (
          <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => void unlock(e)}>
            <input
              type="password"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="分享密码"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            {unlockErr ? <p className="text-sm text-red-600">{unlockErr}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              解锁
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <ShareConsoleProvider sessionId={session.sessionId}>
      <ShareDesk session={session} />
    </ShareConsoleProvider>
  );
}

function ShareDesk({ session }: { session: ShareUnlock }) {
  const { relay, strength, pulse, canControl, requirePaired, emergencyStop } = useShareConsole();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const showStrength = shareCan(session.permissions, "device.control.strength");
  const showWave = shareCan(session.permissions, "device.control.wave");
  const showStop = shareCan(session.permissions, "device.control.stop");
  const showPair = shareCan(session.permissions, "device.pair.read");
  const qrUrl = showPair ? qrPayload(origin, session.sessionId) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">有限控制</p>
          <h1 className="text-2xl font-semibold">{session.deviceName}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            控制端 {relay.state}
            {relay.appId ? " · APP 已连接" : " · 等待 APP"}
          </p>
        </div>
        <div className="flex gap-2">
          {(relay.state === "disconnected" || relay.state === "error" || relay.state === "idle") && (
            <button type="button" className="rounded-xl border px-3 py-1.5 text-sm" onClick={relay.connect}>
              重连
            </button>
          )}
          <button
            type="button"
            className="rounded-xl border px-3 py-1.5 text-sm"
            onClick={() => void shareApi.logout().then(() => window.location.reload())}
          >
            退出
          </button>
        </div>
      </div>

      {showStrength ? (
        <StrengthPanel
          a={strength.local.a}
          b={strength.local.b}
          aLimit={strength.limits.a}
          bLimit={strength.limits.b}
          canControl={canControl}
          onSet={strength.setChannel}
          onNudge={strength.nudge}
          onStop={showStop ? emergencyStop : () => undefined}
          onBlocked={requirePaired}
          showStop={showStop}
          pulseA={pulse.active.A}
          pulseB={pulse.active.B}
        />
      ) : showStop ? (
        <button
          type="button"
          className="mb-4 w-full rounded-xl bg-red-600 py-3 text-white"
          onClick={emergencyStop}
        >
          急停
        </button>
      ) : null}

      {showPair ? (
        <section className="mt-6">
          <PairingCard qrUrl={qrUrl} waiting={relay.state !== "paired"} />
        </section>
      ) : null}

      {showWave ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {WAVE_PRESETS.map((w) => (
            <WaveCard
              key={w.id}
              name={w.name}
              hint={w.category}
              canControl={canControl}
              holdingA={pulse.active.A === w.name}
              holdingB={pulse.active.B === w.name}
              onHold={(ch) => {
                if (!requirePaired()) return;
                pulse.start(ch === 0 ? V4Channel.A : V4Channel.B, w.name, w.frames);
              }}
              onStop={(ch) => pulse.stop(ch === 0 ? "A" : "B")}
              onBlocked={() => requirePaired()}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Dead({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-[var(--fg)]">
      <div className="mb-6 flex justify-end">
        <ThemeLocaleControls compact />
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Link to="/" className="mt-6 inline-block text-sm text-[var(--muted)]">
        ←
      </Link>
    </div>
  );
}
