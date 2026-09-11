import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Text } from "../components/ui/text";
import type { ReactNode } from "react";
import { useState } from "react";
import { PageHeader } from "../layout/PageHeader";
import { ThemeLocaleControls } from "../layout/ThemeLocaleControls";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { useAppToast } from "../lib/toast";
import { useConsole } from "../state/ConsoleProvider";

export function SettingsPage() {
  const { t } = useTranslation();
  const { settings, patchSettings, recorder } = useConsole();
  const toast = useAppToast();
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.desc")}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              patchSettings({ ...DEFAULT_SETTINGS });
              toast.add({ title: t("settings.resetDone"), variant: "success" });
            }}
          >
            {t("settings.reset")}
          </Button>
        }
      />

      <section className="dg-panel px-5 py-2">
        <SectionTitle>{t("settings.appearance")}</SectionTitle>
        <FormRow label={t("common.appearance")} hint={t("common.language")} control={<ThemeLocaleControls />} />
      </section>

      <section className="dg-panel px-5 py-2">
        <SectionTitle>{t("settings.safety")}</SectionTitle>
        <FormRow
          label={t("settings.capA")}
          hint={t("settings.capHint")}
          control={
            <Input
              type="number"
              min={0}
              max={200}
              value={String(settings.aCap)}
              onChange={(e) => patchSettings({ aCap: clamp(Number(e.currentTarget.value)) })}
            />
          }
        />
        <FormRow
          label={t("settings.capB")}
          hint={t("settings.capHint")}
          control={
            <Input
              type="number"
              min={0}
              max={200}
              value={String(settings.bCap)}
              onChange={(e) => patchSettings({ bCap: clamp(Number(e.currentTarget.value)) })}
            />
          }
        />
        <FormRow
          label={t("settings.confirmStop")}
          hint={t("settings.confirmStopHint")}
          control={<Switch checked={settings.confirmStop} onCheckedChange={(v) => patchSettings({ confirmStop: v })} />}
        />
        <FormRow
          label={t("settings.linkAB")}
          hint={t("settings.linkABHint")}
          control={<Switch checked={settings.linkAB} onCheckedChange={(v) => patchSettings({ linkAB: v })} />}
        />
      </section>

      <section className="dg-panel px-5 py-2">
        <SectionTitle>{t("settings.records")}</SectionTitle>
        <FormRow
          label={t("settings.autoSave")}
          hint={t("settings.autoSaveHint")}
          control={<Switch checked={settings.autoSave} onCheckedChange={(v) => patchSettings({ autoSave: v })} />}
        />
        <FormRow
          label={t("settings.askNote")}
          hint={t("settings.askNoteHint")}
          control={<Switch checked={settings.askNote} onCheckedChange={(v) => patchSettings({ askNote: v })} />}
        />
        <FormRow
          label={t("settings.clearLocal")}
          hint={t("settings.clearLocalHint")}
          control={
            <Button variant="secondary" size="sm" onClick={() => setClearOpen(true)}>
              {t("settings.clear")}
            </Button>
          }
        />
      </section>

      <section className="dg-panel px-5 py-4">
        <SectionTitle>{t("settings.about")}</SectionTitle>
        <Text variant="secondary">DG-HUB 0.1.0 · Socket V4</Text>
        <Text variant="secondary" size="xs">
          {t("settings.aboutBody")}
        </Text>
      </section>

      {clearOpen ? (
        <Dialog.Root open onOpenChange={(o) => !o && setClearOpen(false)}>
          <Dialog>
            <Dialog.Title className="font-semibold">{t("settings.clearTitle")}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">{t("settings.clearDesc")}</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setClearOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  recorder.clearAll();
                  setClearOpen(false);
                  toast.add({ title: t("settings.cleared"), variant: "success" });
                }}
              >
                {t("settings.clear")}
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{children}</div>;
}

function FormRow({ label, hint, control }: { label: string; hint: string; control: ReactNode }) {
  return (
    <div className="dg-form-row">
      <div className="min-w-0">
        <Text variant="body">{label}</Text>
        <Text variant="secondary" size="xs">
          {hint}
        </Text>
      </div>
      <div className="w-[180px] shrink-0">{control}</div>
    </div>
  );
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 200;
  return Math.max(0, Math.min(200, Math.round(n)));
}
