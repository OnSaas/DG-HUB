import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import { StatusDot, formatLastSeen } from "../../components/StatusDot";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { PageHeader } from "../../layout/PageHeader";
import { adminApi, type Device } from "../../lib/api/admin";

export function DevicesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    const data = await adminApi.devices();
    setDevices(data.devices);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    const t = window.setInterval(() => void load().catch(() => null), 5000);
    return () => window.clearInterval(t);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const device = await adminApi.createDevice(name.trim() || t("device.unnamed"));
      setName("");
      nav(`/admin/devices/${device.id}/pair`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("device.deleteConfirm"))) return;
    setDeleting(id);
    try {
      await adminApi.deleteDevice(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader title={t("device.title")} description={t("device.desc")} />
      <form className="mb-6 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => void create(e)}>
        <Input
          className="flex-1"
          placeholder={t("device.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Button type="submit" disabled={busy}>
          {busy ? t("device.adding") : t("device.add")}
        </Button>
      </form>
      {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {devices === null ? (
        <p className="text-sm text-[var(--muted)]">{t("device.loading")}</p>
      ) : devices.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t("device.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-3"
            >
              <NavLink to={`/admin/devices/${d.id}`} className="min-w-0 flex-1">
                <p className="font-medium">{d.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  <StatusDot online={d.status === "online"} /> · {t("device.lastSeen")} {formatLastSeen(d.last_seen_at)}
                </p>
              </NavLink>
              <div className="flex gap-2">
                <NavLink to={`/admin/devices/${d.id}/pair`} className="rounded-[8px] px-3 py-1.5 text-sm hover:bg-[var(--bg-muted)]">
                  {t("device.pair")}
                </NavLink>
                <NavLink to={`/admin/devices/${d.id}`} className="rounded-[8px] bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-fg)]">
                  {t("device.enter")}
                </NavLink>
                <button
                  type="button"
                  disabled={deleting === d.id}
                  className="rounded-[8px] px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--bg-muted)]"
                  onClick={() => void remove(d.id)}
                >
                  {t("common.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
