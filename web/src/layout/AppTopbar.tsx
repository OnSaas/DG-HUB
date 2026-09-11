import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Lightning, List, Stop } from "@phosphor-icons/react";
import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useConsole } from "../state/ConsoleProvider";
import { useAuth } from "../app/auth/AuthProvider";
import { loginHref } from "../lib/login";
import { NAV, deviceNav } from "./nav";

export function AppTopbar({
  menuOpen,
  onMenu,
  onCloseMenu,
}: {
  menuOpen: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
}) {
  const loc = useLocation();
  const nav = useNavigate();
  const { deviceId } = useParams();
  const { me } = useAuth();
  const items = deviceId ? deviceNav(deviceId) : NAV;
  const { emergencyStop, settings } = useConsole();
  const [confirm, setConfirm] = useState(false);

  const fireStop = () => {
    if (!me) {
      nav(loginHref(loc.pathname + loc.search));
      return;
    }
    if (settings.confirmStop) setConfirm(true);
    else emergencyStop();
  };

  const go = (to: string) => {
    if (loc.pathname !== to) nav(to);
    onCloseMenu();
  };

  const active = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);

  return (
    <header className="dg-header">
      <div className="dg-capsule">
        <div className="flex items-center gap-2 py-2 pl-4">
          <Lightning size={18} weight="fill" className="dg-gold" />
          <span className="text-[15px] font-semibold">DG-HUB</span>
        </div>
        <div className="relative ml-auto flex items-center pr-1">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500"
            aria-label="急停"
            onClick={fireStop}
          >
            <Stop size={18} weight="fill" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500"
            aria-label="菜单"
            aria-expanded={menuOpen}
            onClick={onMenu}
          >
            <List size={20} />
          </button>
          {menuOpen ? (
            <div className="dg-menu-pop">
              {items.map((item) => (
                <button
                  key={item.to}
                  type="button"
                  className={`dg-menu-link ${active(item.to) ? "is-active" : ""}`}
                  onClick={() => go(item.to)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30"
          aria-label="关闭选单"
          onClick={onCloseMenu}
        />
      ) : null}

      {confirm ? (
        <Dialog.Root open onOpenChange={(o) => !o && setConfirm(false)}>
          <Dialog className="p-6">
            <Dialog.Title>确认急停？</Dialog.Title>
            <Dialog.Description>双通道将归零并清波形。</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirm(false);
                  emergencyStop();
                }}
              >
                急停
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </header>
  );
}
