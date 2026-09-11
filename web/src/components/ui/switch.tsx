import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border)] bg-[var(--bg-muted)] data-[state=checked]:bg-[var(--primary)]",
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-[var(--fg)] transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-[var(--primary-fg)]" />
    </SwitchPrimitive.Root>
  );
}
