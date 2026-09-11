import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Text({
  variant = "body",
  size,
  as: Comp = "p",
  bold,
  children,
  className,
}: HTMLAttributes<HTMLElement> & {
  variant?: "body" | "secondary" | "heading3" | "heading2" | "error" | "mono";
  size?: "xs" | "sm";
  as?: "p" | "div" | "h1" | "h2" | "span" | "code";
  bold?: boolean;
}) {
  const styles: Record<string, string> = {
    body: "text-sm text-[var(--fg)]",
    secondary: "text-sm text-[var(--muted)]",
    heading3: "text-base font-semibold text-[var(--fg)]",
    heading2: "text-lg font-semibold text-[var(--fg)]",
    error: "text-sm text-[var(--danger)]",
    mono: "font-mono text-xs text-[var(--fg)]",
  };
  return (
    <Comp
      className={cn(styles[variant], size === "xs" && "text-xs", bold && "font-medium", className)}
    >
      {children}
    </Comp>
  );
}
