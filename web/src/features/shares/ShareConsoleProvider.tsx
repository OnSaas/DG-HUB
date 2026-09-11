import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { useCoyoteSocket, type RelayEvent } from "../../hooks/useCoyoteSocket";
import { usePulseHold } from "../../hooks/usePulseHold";
import { useStrength } from "../../hooks/useStrength";
import { loadSettings, type Settings } from "../../lib/settings";

interface ShareConsoleValue {
  relay: ReturnType<typeof useCoyoteSocket>;
  strength: ReturnType<typeof useStrength>;
  pulse: ReturnType<typeof usePulseHold>;
  settings: Settings;
  canControl: boolean;
  requirePaired: () => boolean;
  emergencyStop: () => void;
}

const Ctx = createContext<ShareConsoleValue | null>(null);

export function ShareConsoleProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const toast = useKumoToastManager();
  const [settings] = useState<Settings>(() => loadSettings());

  const onEvent = useCallback(
    (event: RelayEvent) => {
      toast.add({ title: event.title, description: event.description, variant: event.kind });
    },
    [toast],
  );

  const relay = useCoyoteSocket(onEvent, sessionId);

  useEffect(() => {
    relay.connect();
    return () => relay.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const requirePaired = useCallback(() => {
    if (relay.state !== "paired" || !relay.slotId) {
      toast.add({ title: "APP 未连接", variant: "warning" });
      return false;
    }
    return true;
  }, [relay.slotId, relay.state, toast]);

  const canControl = relay.state === "paired" && Boolean(relay.slotId);
  const remote = {
    ...relay.strength,
    aLimit: Math.min(relay.strength.aLimit || 200, settings.aCap),
    bLimit: Math.min(relay.strength.bLimit || 200, settings.bCap),
  };
  const pulse = usePulseHold({ canControl, slotId: relay.slotId, sendRpc: relay.sendRpc });
  const strength = useStrength({
    canControl,
    remote,
    slotId: relay.slotId,
    sendRpc: relay.sendRpc,
    linkAB: settings.linkAB,
    onBeforeStop: () => pulse.stop(),
    onBlocked: () => {
      requirePaired();
    },
  });

  const emergencyStop = useCallback(() => {
    if (!canControl) {
      toast.add({ title: "当前无设备", variant: "warning" });
      return;
    }
    if (strength.emergencyStop()) toast.add({ title: "已归零并清除波形", variant: "success" });
  }, [canControl, strength, toast]);

  const value = useMemo(
    () => ({ relay, strength, pulse, settings, canControl, requirePaired, emergencyStop }),
    [canControl, emergencyStop, pulse, relay, requirePaired, settings, strength],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShareConsole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShareConsole outside provider");
  return ctx;
}
