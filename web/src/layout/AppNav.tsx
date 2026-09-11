import { Lightning } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";

const NAV = [
  { to: "/", label: "控制台" },
  { to: "/pair", label: "配对" },
  { to: "/waves", label: "波形库" },
  { to: "/records", label: "记录" },
  { to: "/settings", label: "设置" },
] as const;

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const nav = useNavigate();

  return (
    <div>
      <div className="flex items-center gap-3 px-2 py-2">
        <Lightning size={22} weight="fill" className="dg-gold shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">DG-HUB</p>
          <p className="truncate text-sm text-[var(--dg-muted)]">Socket V4 主控</p>
        </div>
      </div>
      <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dg-muted)]">
        控制
      </p>
      <nav className="mt-3 flex flex-col gap-2">
        {NAV.map((item) => {
          const active =
            item.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(item.to);
          return (
            <button
              key={item.to}
              type="button"
              className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                active ? "dg-nav-active" : "hover:bg-white/5"
              }`}
              onClick={() => {
                if (!active) nav(item.to);
                onNavigate?.();
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
