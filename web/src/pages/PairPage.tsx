import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import { NavLink } from "react-router-dom";
import { ConnectActions } from "../components/ConnectActions";
import { PairingCard } from "../components/PairingCard";
import { PageHeader } from "../layout/PageHeader";
import { NeedDevice } from "../app/LegacyAdminRedirect";
import { useDeviceState } from "../app/DeviceProvider";
import { qrPayload } from "../lib/protocol";
import { useConsole } from "../state/ConsoleProvider";

export function PairPage() {
  const { device, loading, error } = useDeviceState();
  const { relay } = useConsole();
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  if (loading && !device) return <Text variant="secondary">加载设备…</Text>;
  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <Text variant="body">设备不存在</Text>
        <NavLink to="/admin/devices">
          <Button size="sm">返回设备</Button>
        </NavLink>
      </div>
    );
  }
  if (!device) return <NeedDevice title="配对" />;

  const sessionId = device.session_id;
  const qrUrl = qrPayload(origin, sessionId);
  const appOnline = relay.state === "paired" || device.status === "online";

  return (
    <>
      <PageHeader
        title="配对"
        description={`${device.name} · DG-LAB 4.0 扫码接入`}
        actions={
          <ConnectActions
            state={relay.state}
            onConnect={relay.connect}
            onDisconnect={relay.disconnect}
          />
        }
      />

      <section className="dg-panel grid gap-2 px-5 py-4 sm:grid-cols-2">
        <Meta label="设备" value={device.name} />
        <Meta label="状态" value={appOnline ? "在线" : "离线"} />
        <Meta label="Device ID" value={device.id} mono />
        <Meta label="Session ID" value={device.session_id} mono />
      </section>

      {relay.state !== "paired" ? (
        <section className="dg-panel px-5 py-4">
          <Text variant="body" bold>
            {relay.state === "connected" || relay.state === "connecting"
              ? "等待 APP"
              : "请先连接控制端"}
          </Text>
          <Text variant="secondary" size="sm">
            控制端连上后扫码。APP 蓝牙连上郊狼后会出现设备。
          </Text>
        </section>
      ) : null}

      {relay.state === "paired" ? (
        <section className="dg-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <Text variant="body" bold>
              APP 已连接
            </Text>
            <Text variant="secondary" size="sm">
              {relay.deviceName ?? relay.slotId ?? "已接入"} · 可到控制台
            </Text>
          </div>
          <NavLink to={`/admin/devices/${device.id}`}>
            <Button>进入控制台</Button>
          </NavLink>
        </section>
      ) : null}

      <section className="dg-panel p-6">
        <PairingCard qrUrl={qrUrl} waiting={!appOnline} />
      </section>
    </>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Text variant="secondary" size="xs">
        {label}
      </Text>
      <p className={`mt-1 break-all text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}
