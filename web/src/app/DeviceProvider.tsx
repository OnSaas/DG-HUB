import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { adminApi, type Device } from "../lib/api/admin";
import { useAuth } from "./auth/AuthProvider";

interface DeviceValue {
  device: Device | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DeviceValue>({
  device: null,
  loading: false,
  error: null,
  refresh: async () => {},
});

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { deviceId } = useParams();
  const { me, loading: authLoading } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!me || !deviceId) {
      setDevice(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await adminApi.device(deviceId);
      setDevice(next);
      setError(null);
    } catch (e) {
      setDevice(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [deviceId, me]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!me || !deviceId) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [deviceId, me, refresh]);

  return <Ctx.Provider value={{ device, loading: loading || authLoading, error, refresh }}>{children}</Ctx.Provider>;
}

export function useDevice() {
  return useContext(Ctx).device;
}

export function useDeviceState() {
  return useContext(Ctx);
}
