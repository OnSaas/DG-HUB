import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Input({
  className,
  size: _size,
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: string | number; label?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      {label ? <span className="text-xs text-[var(--muted)]">{label}</span> : null}
      <input
        className={cn(
          "h-10 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--fg)] outline-none focus:ring-2 focus:ring-[var(--fg)]/10",
          className,
        )}
        {...props}
      />
    </label>
  );
}
