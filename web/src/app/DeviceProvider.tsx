import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { adminApi, type Device } from "../lib/api/admin";

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
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!deviceId) {
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
  }, [deviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!deviceId) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [deviceId, refresh]);

  return <Ctx.Provider value={{ device, loading, error, refresh }}>{children}</Ctx.Provider>;
}

export function useDevice() {
  return useContext(Ctx).device;
}

export function useDeviceState() {
  return useContext(Ctx);
}
