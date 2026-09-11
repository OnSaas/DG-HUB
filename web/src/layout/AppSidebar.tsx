import { Lightning } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV } from "./nav";

export function AppSidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const active = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center gap-4 px-2 py-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-black/10 bg-neutral-50">
          <Lightning size={22} weight="fill" className="dg-gold" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">DG-HUB</p>
          <p className="truncate text-sm text-neutral-500">Socket V4 主控</p>
        </div>
      </div>
      <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        控制
      </p>
      <nav className="mt-3 flex flex-col gap-2">
        {NAV.map((item) => (
          <button
            key={item.to}
            type="button"
            className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
              active(item.to)
                ? "bg-theme text-[#171717]"
                : "hover:bg-neutral-100"
            }`}
            onClick={() => {
              if (!active(item.to)) nav(item.to);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
