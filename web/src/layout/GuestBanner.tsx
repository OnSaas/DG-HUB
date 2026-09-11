import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../app/auth/AuthProvider";
import { loginHref } from "../lib/login";

export function GuestBanner() {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading || me) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm">
      <span className="text-neutral-500">浏览模式 · 登录后可添加设备并控制</span>
      <Link className="font-medium text-zinc-900" to={loginHref(loc.pathname + loc.search)}>
        登录
      </Link>
    </div>
  );
}
