import { Button } from "@cloudflare/kumo/components/button";
import { QrCode } from "@phosphor-icons/react";
import { NavLink } from "react-router-dom";
import { NeedDevice } from "../app/LegacyAdminRedirect";
import { useDeviceState } from "../app/DeviceProvider";
import { EmptyState } from "../components/EmptyState";
import { StrengthPanel } from "../components/StrengthPanel";
import { PageHeader } from "../layout/PageHeader";
import { adminApi } from "../lib/api/admin";
import { formatDuration } from "../lib/records";
import { useConsole } from "../state/ConsoleProvider";

export function ConsolePage() {
  const { device, loading, error } = useDeviceState();
  const { relay, strength, recorder, pulse, canControl, emergencyStop, requirePaired, settings, patchSettings } =
    useConsole();

  if (loading && !device) return <p className="text-sm text-neutral-500">加载设备…</p>;
  if (error) {
    return (
      <EmptyState
        icon={QrCode}
        title="设备不存在"
        description={error}
        action={{ label: "返回设备", to: "/admin/devices" }}
      />
    );
  }
  if (!device) return <NeedDevice title="控制台" />;

  const paired = relay.state === "paired";
  const online = paired || device.status === "online";
  const waitHint = !paired ? "等待 APP 扫码配对。页面可用，下发会提示先配对。" : !relay.slotId ? "APP 已接入，等待郊狼。" : null;

  return (
    <>
      <PageHeader
        title={device.name}
        description={`${online ? "● 在线" : "○ 离线"} · Session ${device.session_id}`}
        actions={
          <div className="flex gap-2">
            {relay.state === "disconnected" || relay.state === "error" || relay.state === "idle" ? (
              <Button size="sm" onClick={() => relay.connect()}>
                重连
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!requirePaired()) return;
                pulse.stop();
                void adminApi.logActivity(device.id, "stop");
              }}
            >
              停止波形
            </Button>
            <NavLink to={`/admin/devices/${device.id}/pair`}>
              <Button variant="secondary" size="sm">
                去配对
              </Button>
            </NavLink>
          </div>
        }
      />
      {waitHint ? <p className="mb-4 text-sm text-neutral-500">{waitHint}</p> : null}
      <section className="dg-kpi sm:grid-cols-4">
        <Stat label="设备" value={relay.deviceName ?? device.name} />
        <Stat label="本次时长" value={recorder.live ? formatDuration(Date.now() - recorder.live.startedAt) : "—"} />
        <Stat label="A" value={String(strength.local.a)} />
        <Stat label="B" value={String(strength.local.b)} />
      </section>
      <StrengthPanel
        a={strength.local.a}
        b={strength.local.b}
        aLimit={strength.limits.a}
        bLimit={strength.limits.b}
        canControl={canControl}
        onSet={strength.setChannel}
        onNudge={strength.nudge}
        onStop={emergencyStop}
        onBlocked={requirePaired}
        showStop
        split
        linkAB={settings.linkAB}
        onToggleLink={() => patchSettings({ linkAB: !settings.linkAB })}
        pulseA={pulse.active.A}
        pulseB={pulse.active.B}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dg-muted text-xs">{label}</div>
      <div className="mt-1 text-lg font-medium text-[var(--dg-gold)]">{value}</div>
    </div>
  );
}
