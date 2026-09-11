import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./auth/AuthProvider";
import { loginHref } from "../lib/login";

export function RequireAdmin() {
  const { me, loading } = useAuth();
  const loc = useLocation();
  const { t } = useTranslation();
  if (loading) return <p className="p-8 text-sm text-[var(--muted)]">{t("common.loading")}</p>;
  if (!me) return <Navigate to={loginHref(loc.pathname + loc.search)} replace />;
  return <Outlet />;
}
