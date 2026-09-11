import { Menu, Square, Zap } from "lucide-react";
import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConsole } from "../state/ConsoleProvider";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { NAV, deviceNav } from "./nav";
import { ThemeLocaleControls } from "./ThemeLocaleControls";

export function AppTopbar({
  menuOpen,
  onMenu,
  onCloseMenu,
}: {
  menuOpen: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
}) {
  const { t } = useTranslation();
  const { deviceId } = useParams();
  const items = deviceId
    ? deviceNav(deviceId)
    : [...NAV, { to: "/admin/settings", key: "nav.prefs", match: "prefix" as const }];
  const { emergencyStop, settings } = useConsole();
  const [confirm, setConfirm] = useState(false);

  const fireStop = () => {
    if (settings.confirmStop) setConfirm(true);
    else emergencyStop();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <div className="flex items-center gap-2">
        <Zap size={16} />
        <span className="font-display text-sm font-semibold">DG-HUB</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeLocaleControls compact />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--danger)]"
            aria-label={t("control.estop")}
            onClick={fireStop}
          >
            <Square size={16} fill="currentColor" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--fg)]"
            aria-label={t("common.menu")}
            aria-expanded={menuOpen}
            onClick={onMenu}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav className="mt-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.match === "exact"}
              onClick={onCloseMenu}
              className={({ isActive }) =>
                `block rounded-[8px] px-3 py-2 text-sm ${isActive ? "bg-[var(--bg-muted)]" : ""}`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      ) : null}

      {confirm ? (
        <Dialog.Root open onOpenChange={(o) => !o && setConfirm(false)}>
          <Dialog>
            <Dialog.Title className="text-base font-semibold">{t("control.estopConfirm")}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">
              {t("control.estopDesc")}
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirm(false);
                  emergencyStop();
                }}
              >
                {t("control.estop")}
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </header>
  );
}
