import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi, type AdminMe } from "../../lib/api/admin";

interface AuthValue {
  me: AdminMe | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setMe(await adminApi.me());
    } catch {
      setMe(null);
    }
  };

  useEffect(() => {
    void (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  return (
    <Ctx.Provider
      value={{
        me,
        loading,
        refresh,
        logout: async () => {
          await adminApi.logout();
          setMe(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
