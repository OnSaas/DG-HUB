import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { loginHref } from "../lib/login";

export function RequireAdmin() {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="p-8 text-sm text-neutral-500">加载中…</p>;
  if (!me) return <Navigate to={loginHref(loc.pathname + loc.search)} replace />;
  return <Outlet />;
}
