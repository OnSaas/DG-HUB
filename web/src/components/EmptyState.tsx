import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import type { Icon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

interface Props {
  icon: Icon;
  title: string;
  description: string;
  action?: { label: string; to?: string; onClick?: () => void };
}

export function EmptyState({ icon: IconCmp, title, description, action }: Props) {
  return (
    <div className="dg-panel flex min-h-[320px] w-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <IconCmp size={40} className="dg-gold" />
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
