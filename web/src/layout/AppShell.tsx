import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { DeviceProvider } from "../app/DeviceProvider";
import { ConsoleProvider } from "../state/ConsoleProvider";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

export function AppShell() {
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <DeviceProvider>
      <ConsoleProvider>
        <div className="dg-shell">
          <div className="lg:hidden">
            <AppTopbar menuOpen={menu} onMenu={() => setMenu((v) => !v)} onCloseMenu={() => setMenu(false)} />
          </div>
          <div className="dg-frame">
            <aside className="dg-aside hidden lg:block">
              <AppSidebar />
            </aside>
            <main className="dg-main">
              <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </ConsoleProvider>
    </DeviceProvider>
  );
}
