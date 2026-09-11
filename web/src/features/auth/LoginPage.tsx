import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { adminApi } from "../../lib/api/admin";
import { useAuth } from "../../app/auth/AuthProvider";
import { safeNext } from "../../lib/login";

export function LoginPage() {
  const { me, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [needed, setNeeded] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) nav(next, { replace: true });
  }, [me, nav, next]);

  useEffect(() => {
    void adminApi.setupNeeded().then((r) => setNeeded(r.needed));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needed) await adminApi.setup(username, password);
      else await adminApi.login(username, password);
      await refresh();
      nav(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-rgb))]">
        DG-HUB
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{needed ? "创建管理员" : "管理员登录"}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {needed ? "首次使用，创建唯一管理员账户。" : "登录后才能创建设备和控制。"}
      </p>
      <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <label className="flex flex-col gap-1 text-sm">
          用户名
          <input
            className="rounded-xl border border-black/10 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          密码
          <input
            type="password"
            className="rounded-xl border border-black/10 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            autoComplete={needed ? "new-password" : "current-password"}
            minLength={needed ? 8 : 1}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          {busy ? "…" : needed ? "创建并登录" : "登录"}
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link to="/devices" className="text-neutral-500">
          返回控制台
        </Link>
      </p>
    </div>
  );
}
