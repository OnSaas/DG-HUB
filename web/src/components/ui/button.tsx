import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes, type ComponentType, type ReactNode, forwardRef } from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[8px] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90",
        primary: "bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90",
        secondary: "border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:bg-[var(--bg-muted)]",
        destructive: "bg-[var(--danger)] text-white hover:opacity-90",
        ghost: "text-[var(--fg)] hover:bg-[var(--bg-muted)]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-11 px-5 w-full",
      },
      shape: {
        default: "",
        square: "w-9 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "md", shape: "default" },
  },
);

type IconComp = ComponentType<{ size?: number }>;

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean; icon?: IconComp | ReactNode }
>(function Button({ className, variant, size, shape, asChild, icon, children, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  const Icon = typeof icon === "function" ? icon : null;
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size, shape }), className)} {...props}>
      {Icon ? <Icon size={16} /> : icon && typeof icon !== "function" ? icon : null}
      {children}
    </Comp>
  );
});
