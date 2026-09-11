import { useEffect, useState, type CSSProperties } from "react";
import { Sidebar } from "@cloudflare/kumo/components/sidebar";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

const COLLAPSE_KEY = "coyote.sidebar.collapsed";
const MOBILE_BP = 768;

function useIsMobile(breakpoint = MOBILE_BP) {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const apply = () => setMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [query]);

  return mobile;
}

export function AppShell() {
  const isMobile = useIsMobile();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setDesktopOpen(localStorage.getItem(COLLAPSE_KEY) !== "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [isMobile]);

  return (
    <Sidebar.Provider
      open={isMobile ? mobileOpen : desktopOpen}
      onOpenChange={(next) => {
        if (isMobile) {
          setMobileOpen(next);
          return;
        }
        setDesktopOpen(next);
        try {
          localStorage.setItem(COLLAPSE_KEY, next ? "0" : "1");
        } catch {
          /* ignore */
        }
      }}
      defaultOpen={false}
      collapsible="icon"
      mobileBreakpoint={MOBILE_BP}
      animationDuration={180}
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar-width-icon": "64px",
        } as CSSProperties
      }
    >
      <div className="dg-shell">
        <AppSidebar />
        <div className="dg-main">
          <AppTopbar />
          <main className="dg-content">
            <div className="dg-content-inner flex flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </Sidebar.Provider>
  );
}
