import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminApi } from "../../lib/api/admin";
import { useAuth } from "../../app/auth/AuthProvider";
import { safeNext } from "../../lib/login";
import { ThemeLocaleControls } from "../../layout/ThemeLocaleControls";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export function LoginPage() {
  const { t } = useTranslation();
  const { me, refresh } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [needed, setNeeded] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) window.location.assign(next);
  }, [me, next]);

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
      window.location.assign(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === "invalid_credentials" || msg === "Unauthorized" ? t("auth.invalid_credentials") : msg);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-8 flex justify-end">
        <ThemeLocaleControls />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">DG-HUB</p>
      <h1 className="font-display mt-2 text-3xl font-semibold">
        {needed ? t("auth.createAdmin") : t("auth.adminLogin")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{needed ? t("auth.firstUse") : t("auth.needLogin")}</p>
      <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <label className="flex flex-col gap-1 text-sm">
          {t("auth.username")}
          <Input value={username} onChange={(e) => setUsername(e.currentTarget.value)} autoComplete="username" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("auth.password")}
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            autoComplete={needed ? "new-password" : "current-password"}
            minLength={needed ? 8 : 1}
            required
          />
        </label>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "…" : needed ? t("auth.createSubmit") : t("auth.submit")}
        </Button>
      </form>
      <p className="mt-6 text-sm">
        <Link to="/" className="text-[var(--muted)]">
          {t("auth.backPublic")}
        </Link>
      </p>
    </div>
  );
}
