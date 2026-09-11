import { useTranslation } from "react-i18next";
import { notify } from "../../lib/toast";

export function ClipboardText({ text, onCopy }: { text: string; size?: string; onCopy?: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="rounded-[8px] border border-[var(--border)] px-2 py-1 text-xs"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          onCopy?.();
          notify({ title: t("common.copied"), variant: "success" });
        });
      }}
    >
      {t("common.copy")}
    </button>
  );
}
