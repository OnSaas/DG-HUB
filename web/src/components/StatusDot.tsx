import i18n from "../i18n";

export function formatLastSeen(ts: number | null | undefined): string {
  if (!ts) return i18n.t("device.never");
  const d = Date.now() - ts;
  if (d < 15_000) return i18n.t("device.justNow");
  if (d < 60_000) return i18n.t("device.secondsAgo", { n: Math.floor(d / 1000) });
  if (d < 3600_000) return i18n.t("device.minutesAgo", { n: Math.floor(d / 60_000) });
  if (d < 86400_000) return i18n.t("device.hoursAgo", { n: Math.floor(d / 3600_000) });
  return new Intl.DateTimeFormat(i18n.language).format(new Date(ts));
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)]">
      <span className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-[var(--border)]"}`} />
      {online ? i18n.t("device.online") : i18n.t("device.offline")}
    </span>
  );
}
