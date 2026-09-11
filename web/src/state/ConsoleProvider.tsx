import { createContext, useContext, useEffect, useCallback, useMemo, useState, type ReactNode } from "react";
import { useAppToast } from "../lib/toast";
import { useCoyoteSocket, type RelayEvent } from "../hooks/useCoyoteSocket";
import { usePulseHold } from "../hooks/usePulseHold";
import { useSessionRecorder } from "../hooks/useSessionRecorder";
import { useStrength } from "../hooks/useStrength";
import { loadSettings, saveSettings, type Settings } from "../lib/settings";
import { adminApi } from "../lib/api/admin";
import { useAuth } from "../app/auth/AuthProvider";
import i18n from "../i18n";
import { useDevice } from "../app/DeviceProvider";

interface ConsoleValue {
  relay: ReturnType<typeof useCoyoteSocket>;
  strength: ReturnType<typeof useStrength>;
  recorder: ReturnType<typeof useSessionRecorder>;
  pulse: ReturnType<typeof usePulseHold>;
  settings: Settings;
  patchSettings: (partial: Partial<Settings>) => void;
  canControl: boolean;
  requirePaired: () => boolean;
  emergencyStop: () => void;
}

const Ctx = createContext<ConsoleValue | null>(null);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const toast = useAppToast();
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const onEvent = useCallback(
    (event: RelayEvent) => {
      toast.add({
        title: event.title,
        description: event.description,
        variant: event.kind,
      });
    },
    [toast],
  );

  const device = useDevice();
  const { me } = useAuth();
  const sessionId = me && device?.session_id ? device.session_id : null;
  const relay = useCoyoteSocket(onEvent, sessionId);

  useEffect(() => {
    if (!sessionId) {
      relay.disconnect();
      return;
    }
    relay.connect();
    return () => relay.disconnect();
    // connect/disconnect identities follow sessionId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  const requirePaired = useCallback(() => {
    if (relay.state !== "paired") {
      toast.add({
        title: i18n.t("control.needPair"),
        description: i18n.t("control.needPairHint"),
        variant: "warning",
      });
      return false;
    }
    if (!relay.slotId) {
      toast.add({
        title: i18n.t("control.waitDevice"),
        description: i18n.t("control.waitDeviceHint"),
        variant: "warning",
      });
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

  const pulse = usePulseHold({
    canControl,
    slotId: relay.slotId,
    sendRpc: relay.sendRpc,
  });

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

  const recorder = useSessionRecorder({
    paired: relay.state === "paired",
    a: strength.local.a,
    b: strength.local.b,
    autoSave: settings.autoSave,
  });

  const emergencyStop = useCallback(() => {
    if (!canControl) {
      toast.add({ title: "当前无设备", variant: "warning" });
      return;
    }
    if (strength.emergencyStop()) {
      recorder.markStop();
      if (device?.id) void adminApi.logActivity(device.id, "estop");
      toast.add({ title: "已归零并清除波形", variant: "success" });
    }
  }, [canControl, device?.id, recorder, strength, toast]);

  const patchSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      relay,
      strength,
      recorder,
      pulse,
      settings,
      patchSettings,
      canControl,
      requirePaired,
      emergencyStop,
    }),
    [
      canControl,
      emergencyStop,
      patchSettings,
      pulse,
      recorder,
      relay,
      requirePaired,
      settings,
      strength,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsole outside provider");
  return ctx;
}
