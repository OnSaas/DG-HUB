import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Text } from "./ui/text";

interface Props {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: { label: string; to?: string; onClick?: () => void };
}

export function EmptyState({ icon: IconCmp, title, description, action }: Props) {
  return (
    <div className="dg-panel flex min-h-[280px] w-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <IconCmp size={36} className="text-[var(--muted)]" />
      <Text variant="heading3" as="h2">
        {title}
      </Text>
      <Text variant="secondary">{description}</Text>
      {action?.to ? (
        <Link to={action.to} className="inline-flex">
          <Button>{action.label}</Button>
        </Link>
      ) : action ? (
        <Button onClick={action.onClick}>{action.label}</Button>
      ) : null}
    </div>
  );
}
