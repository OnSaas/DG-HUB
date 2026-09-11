import { Link } from "react-router-dom";

export function PublicHomePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-rgb))]">
        Public
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">DG-HUB</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-500">
        网页主控 DG-LAB 4.0。公开层不能创建设备、不能控制。管理员请登录。被分享者请打开发给你的链接。
      </p>
      <Link
        to="/admin/login"
        className="mt-8 inline-flex rounded-full bg-white px-5 py-2 text-sm shadow-xl shadow-black/5"
      >
        管理员登录
      </Link>
    </div>
  );
}
