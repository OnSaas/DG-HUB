import { Link, Navigate, useParams } from "react-router-dom";

export function LegacyAdminRedirect() {
  const splat = useParams()["*"] ?? "";
  if (!splat || splat === "devices") return <Navigate to="/devices" replace />;
  if (splat === "settings") return <Navigate to="/settings" replace />;
  if (splat.startsWith("devices/")) return <Navigate to={`/${splat}`} replace />;
  return <Navigate to="/devices" replace />;
}

export function NeedDevice({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">先去设备列表添加一台。</p>
      <Link to="/devices" className="mt-4 inline-block text-sm">
        返回设备
      </Link>
    </div>
  );
}
