import { useState } from "react";
import { Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import type { ConnState } from "../hooks/useCoyoteSocket";

export function ConnectActions({
  state,
  onConnect,
  onDisconnect,
}: {
  state: ConnState;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const canConnect = state === "idle" || state === "disconnected" || state === "error" || state === "connecting";

  if (canConnect) {
    return (
      <Button disabled={state === "connecting"} onClick={onConnect}>
        {t("control.connectRelay")}
      </Button>
    );
  }

  return (
    <>
      <Button variant="secondary" icon={Unplug} onClick={() => setOpen(true)}>
        {t("control.disconnect")}
      </Button>
      {open ? (
        <Dialog.Root open onOpenChange={(o) => !o && setOpen(false)}>
          <Dialog>
            <Dialog.Title className="font-semibold">{t("control.disconnectConfirm")}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">
              {t("control.disconnectDesc")}
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setOpen(false);
                  onDisconnect();
                }}
              >
                {t("control.disconnect")}
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </>
  );
}
