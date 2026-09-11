import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/cn";

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  disabled,
  className,
}: {
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange: (v: number[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className={cn("relative flex h-5 w-full touch-none items-center", className)}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-[var(--bg-muted)]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[var(--primary)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-[var(--border)] bg-[var(--card)] shadow" />
    </SliderPrimitive.Root>
  );
}
