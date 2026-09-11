export function formatLastSeen(ts: number | null | undefined): string {
  if (!ts) return "从未";
  const d = Date.now() - ts;
  if (d < 15_000) return "刚刚";
  if (d < 60_000) return `${Math.floor(d / 1000)} 秒前`;
  if (d < 3600_000) return `${Math.floor(d / 60_000)} 分前`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)} 小时前`;
  return new Date(ts).toLocaleString();
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-neutral-300"}`} />
      {online ? "在线" : "离线"}
    </span>
  );
}
