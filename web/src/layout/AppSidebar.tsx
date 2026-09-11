import { Zap } from "lucide-react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../app/auth/AuthProvider";
import { NAV, deviceNav } from "./nav";

export function AppSidebar() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const { deviceId } = useParams();
  const { me, logout } = useAuth();

  const items = deviceId
    ? deviceNav(deviceId)
    : [...NAV, { to: "/admin/settings", key: "nav.prefs", match: "prefix" as const }];

  return (
    <div className="dg-card p-4">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-muted)]">
          <Zap size={18} className="text-[var(--fg)]" />
        </div>
        <div className="min-w-0">
          <p className="font-display truncate text-base font-semibold">DG-HUB</p>
          <p className="truncate text-sm text-[var(--muted)]">{me?.username ?? t("common.admin")}</p>
        </div>
      </div>
      <p className="mt-5 px-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {t("common.admin")}
      </p>
      <nav className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.match === "exact"}
            className={({ isActive }) =>
              `rounded-[8px] px-3 py-2 text-left text-sm font-medium ${
                isActive ? "bg-[var(--bg-muted)] text-[var(--fg)]" : "text-[var(--fg)] hover:bg-[var(--bg-muted)]"
              }`
            }
          >
            {t(item.key)}
          </NavLink>
        ))}
        <button
          type="button"
          className="rounded-[8px] px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--bg-muted)]"
          onClick={() => void logout().then(() => nav("/"))}
        >
          {t("common.logout")}
        </button>
      </nav>
    </div>
  );
}
