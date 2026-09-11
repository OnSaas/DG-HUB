import { useState } from "react";
import { QrCode, ZoomIn } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { ClipboardText } from "./ui/clipboard-text";
import { Dialog } from "./ui/dialog";
import { Text } from "./ui/text";

export function PairingCard({ qrUrl, waiting }: { qrUrl: string | null; waiting: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-full flex-col gap-4">
      <Text variant="heading3" as="h2">
        {t("device.qr")}
      </Text>
      {qrUrl ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="rounded-[8px] bg-white p-4">
            <QRCodeSVG value={qrUrl} size={240} level="M" includeMargin={false} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="ghost" size="sm" icon={ZoomIn} onClick={() => setOpen(true)}>
              {t("device.enlarge")}
            </Button>
            <ClipboardText text={qrUrl} />
          </div>
          <Text variant="secondary" size="xs">
            {waiting ? t("device.scanHint") : t("device.keepCode")}
          </Text>
          {open ? (
            <Dialog.Root open onOpenChange={(o) => !o && setOpen(false)}>
              <Dialog>
                <Dialog.Title className="font-semibold">{t("device.scanTitle")}</Dialog.Title>
                <div className="mt-4 flex justify-center rounded-[8px] bg-white p-4">
                  <QRCodeSVG value={qrUrl} size={280} level="M" />
                </div>
              </Dialog>
            </Dialog.Root>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 text-center">
          <QrCode size={40} className="text-[var(--muted)]" />
          <Text variant="body">{t("device.notConnected")}</Text>
          <Text variant="secondary">{t("device.connectFirst")}</Text>
        </div>
      )}
    </div>
  );
}
