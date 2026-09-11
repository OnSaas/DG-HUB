import { useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AppNav } from "./AppNav";
import { AppTopbar } from "./AppTopbar";

const BP = 1024;

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${BP - 1}px)`).matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BP - 1}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

export function AppShell() {
  const narrow = useIsNarrow();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!narrow) setDrawer(false);
  }, [narrow]);

  return (
    <div className="dg-shell">
      <AppTopbar
        narrow={narrow}
        onMenu={() => setDrawer(true)}
      />
      <div className="dg-frame">
        {!narrow ? (
          <aside className="dg-aside">
            <div className="dg-panel p-5">
              <AppNav />
            </div>
          </aside>
        ) : null}
        <div className="dg-main">
          <div className="dg-main-card">
            <div className="dg-content-inner">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      {narrow && drawer ? (
        <Drawer onClose={() => setDrawer(false)}>
          <AppNav onNavigate={() => setDrawer(false)} />
        </Drawer>
      ) : null}
    </div>
  );
}

function Drawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      <button type="button" className="dg-overlay" aria-label="关闭菜单" onClick={onClose} />
      <div className="dg-drawer">
        <div className="dg-drawer-panel">{children}</div>
      </div>
    </>
  );
}
