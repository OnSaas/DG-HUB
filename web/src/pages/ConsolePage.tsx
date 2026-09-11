import { Button } from "@cloudflare/kumo/components/button";
import { PlugCharging, QrCode } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth/AuthProvider";
import { NeedDevice } from "../app/LegacyAdminRedirect";
import { useDeviceState } from "../app/DeviceProvider";
import { EmptyState } from "../components/EmptyState";
import { StrengthPanel } from "../components/StrengthPanel";
import { PageHeader } from "../layout/PageHeader";
import { adminApi } from "../lib/api/admin";
import { loginHref } from "../lib/login";
import { formatDuration } from "../lib/records";
import { useConsole } from "../state/ConsoleProvider";

export function ConsolePage() {
  const { me } = useAuth();
  const { device, loading, error } = useDeviceState();
  const loc = useLocation();
  const nav = useNavigate();
  const { relay, strength, recorder, pulse, canControl, emergencyStop, requirePaired, settings, patchSettings } =
    useConsole();
  const goLogin = () => nav(loginHref(loc.pathname + loc.search));

  if (!me) {
    return (
      <>
        <PageHeader title="控制台" description="演示界面。登录后选择设备才能控。" />
        <StrengthPanel
          a={0}
          b={0}
          aLimit={200}
          bLimit={200}
          canControl={false}
          onSet={() => goLogin()}
          onNudge={() => goLogin()}
          onStop={goLogin}
          onBlocked={goLogin}
          showStop
        />
      </>
    );
  }

  if (loading && !device) return <p className="text-sm text-neutral-500">加载设备…</p>;
  if (!device) {
    if (error) {
      return (
        <EmptyState
          icon={QrCode}
          title="设备不存在"
          description={error}
          action={{ label: "返回设备", to: "/devices" }}
        />
      );
    }
    return <NeedDevice title="控制台" />;
  }

  const paired = relay.state === "paired";
  const online = paired || device.status === "online";

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
            {canControl ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  pulse.stop();
                  if (device.id) void adminApi.logActivity(device.id, "stop");
                }}
              >
                停止波形
              </Button>
            ) : null}
            {paired && recorder.live ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const note = settings.askNote ? (window.prompt("备注（可空）") ?? "") : "";
                  recorder.endSession({ note });
                }}
              >
                结束会话
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => nav(`/devices/${device.id}/pair`)}>
                去配对
              </Button>
            )}
          </div>
        }
      />
      {!paired ? (
        <EmptyState
          icon={QrCode}
          title={online ? "APP 在线，控制端重连中" : "尚未配对"}
          description="打开「配对」扫码。控制端会自动连到本设备 Session。"
          action={{ label: "去配对", to: `/devices/${device.id}/pair` }}
        />
      ) : !relay.slotId ? (
        <EmptyState icon={PlugCharging} title="等待郊狼" description="APP 已接入。用 4.0 APP 蓝牙连上郊狼。" />
      ) : (
        <>
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
      )}
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
