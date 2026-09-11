import { useTranslation } from "react-i18next";
import { useTheme, type ThemeMode } from "../theme/ThemeProvider";
import { setLocale, type AppLocale } from "../i18n";

export function ThemeLocaleControls({ compact }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const locale = (i18n.language.startsWith("zh") ? "zh-CN" : "en") as AppLocale;

  return (
    <div className={`flex items-center gap-1 ${compact ? "" : "gap-2"}`}>
      <select
        aria-label={t("common.appearance")}
        className="h-9 rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)]"
        value={theme}
        onChange={(e) => setTheme(e.currentTarget.value as ThemeMode)}
      >
        <option value="light">{t("common.themeLight")}</option>
        <option value="dark">{t("common.themeDark")}</option>
        <option value="system">{t("common.themeSystem")}</option>
      </select>
      <select
        aria-label={t("common.language")}
        className="h-9 rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)]"
        value={locale}
        onChange={(e) => setLocale(e.currentTarget.value as AppLocale)}
      >
        <option value="zh-CN">中文</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
