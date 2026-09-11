import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";

export function SharePlaceholderPage() {
  const { token } = useParams();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Share</p>
      <h1 className="mt-2 text-3xl font-semibold">分享控制尚未开放</h1>
      <p className="mt-3 text-sm text-neutral-500">
        令牌已预留，本阶段不能凭 token 控制设备。
      </p>
      <p className="mt-2 font-mono text-xs text-neutral-400">{token}</p>
      <Link to="/" className="mt-8 inline-block text-sm text-neutral-500">
        返回公开页
      </Link>
    </div>
  );
}
