import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { adminApi, type Device } from "../lib/api/admin";

const Ctx = createContext<Device | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { deviceId } = useParams();
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setDevice(null);
      return;
    }
    void adminApi.device(deviceId).then(setDevice).catch(() => setDevice(null));
  }, [deviceId]);

  return <Ctx.Provider value={device}>{children}</Ctx.Provider>;
}

export function useDevice() {
  return useContext(Ctx);
}
