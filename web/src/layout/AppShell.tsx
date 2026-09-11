import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
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
    <div className="dg-shell">
      <AppTopbar menuOpen={menu} onMenu={() => setMenu((v) => !v)} onCloseMenu={() => setMenu(false)} />
      <div className="dg-pad">
        <Outlet />
      </div>
    </div>
  );
}
