import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ThemeLocaleControls } from "../../layout/ThemeLocaleControls";

export function PublicHomePage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="mb-8 flex justify-end">
        <ThemeLocaleControls />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t("public.kicker")}</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">DG-HUB</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t("public.blurb")}</p>
      <Link
        to="/admin/login"
        className="mt-8 inline-flex h-10 items-center rounded-[8px] bg-[var(--primary)] px-5 text-sm text-[var(--primary-fg)]"
      >
        {t("public.adminLogin")}
      </Link>
    </div>
  );
}
