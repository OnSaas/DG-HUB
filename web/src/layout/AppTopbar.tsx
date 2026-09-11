import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Lightning, List, Stop } from "@phosphor-icons/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConsole } from "../state/ConsoleProvider";
import { NAV } from "./nav";

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
  const { emergencyStop, settings, relay } = useConsole();
  const [confirm, setConfirm] = useState(false);

  const fireStop = () => {
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
      {/* 小屏：整条白胶囊 */}
      <div className="flex md:hidden">
        <div className="dg-capsule">
          <div className="flex items-center gap-2 py-2 pl-4">
            <Lightning size={18} weight="fill" className="dg-gold" />
            <span className="text-[15px] font-semibold">DG-HUB</span>
          </div>
          <div className="ml-auto flex items-center pr-1">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500"
              aria-label="急停"
              onClick={fireStop}
            >
              <Stop size={18} weight="fill" />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500"
              aria-label="菜单"
              onClick={onMenu}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 桌面：左品牌 · 中胶囊导航 · 右急停 */}
      <div className="hidden items-center justify-between gap-8 md:flex">
        <div className="flex items-center gap-2">
          <Lightning size={20} weight="fill" className="dg-gold" />
          <span className="text-base font-semibold">DG-HUB</span>
        </div>
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="dg-capsule-center">
            {NAV.map((item) => (
              <button
                key={item.to}
                type="button"
                className={`dg-nav-link ${active(item.to) ? "is-active" : ""}`}
                onClick={() => go(item.to)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {relay.state === "paired" ? "已配对" : relay.state === "connected" ? "已连接" : "未连接"}
          </span>
          <Button variant="destructive" size="sm" icon={Stop} onClick={fireStop}>
            急停
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/30" aria-label="关闭" onClick={onCloseMenu} />
          <div className="dg-menu-pop z-50">
            {NAV.map((item) => (
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
        </>
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
