import { Lightning } from "@phosphor-icons/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/auth/AuthProvider";
import { NAV, deviceNav } from "./nav";

export function AppSidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { deviceId } = useParams();
  const { me, logout } = useAuth();

  const items = deviceId
    ? deviceNav(deviceId)
    : [...NAV, { to: "/admin/settings", label: "偏好", match: "prefix" as const }];

  const active = (to: string, match: "exact" | "prefix") =>
    match === "exact" ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(`${to}/`);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center gap-4 px-2 py-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-black/10 bg-neutral-50">
          <Lightning size={22} weight="fill" className="dg-gold" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">DG-HUB</p>
          <p className="truncate text-sm text-neutral-500">{me?.username ?? "Admin"}</p>
        </div>
      </div>
      <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">管理</p>
      <nav className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.to}
            type="button"
            className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
              active(item.to, item.match) ? "bg-theme text-[#171717]" : "hover:bg-neutral-100"
            }`}
            onClick={() => {
              if (loc.pathname !== item.to) nav(item.to);
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="rounded-xl px-4 py-3 text-left text-sm text-neutral-500 hover:bg-neutral-100"
          onClick={() => void logout().then(() => nav("/"))}
        >
          退出
        </button>
      </nav>
    </div>
  );
}
