import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../app/auth/AuthProvider";

export function RequireAdmin() {
  const { me, loading } = useAuth();
  if (loading) return <p className="p-8 text-sm text-neutral-500">加载中…</p>;
  if (!me) return <Navigate to="/login" replace />;
  return <Outlet />;
}
