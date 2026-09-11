import { toast as sonner } from "sonner";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: "success" | "error" | "warning" | "info" | string;
};

export function notify(ev: ToastInput) {
  const opts = { description: ev.description };
  if (ev.variant === "error") sonner.error(ev.title, opts);
  else if (ev.variant === "warning") sonner.warning(ev.title, opts);
  else if (ev.variant === "success") sonner.success(ev.title, opts);
  else sonner(ev.title, opts);
}

export function useAppToast() {
  return { add: notify };
}
