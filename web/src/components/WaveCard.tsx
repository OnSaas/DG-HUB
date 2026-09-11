import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import type { ReactNode } from "react";

interface Props {
  name: string;
  hint?: string;
  canControl: boolean;
  holdingA: boolean;
  holdingB: boolean;
  onHold: (ch: 0 | 1) => void;
  onStop: (ch: 0 | 1) => void;
  onBlocked: () => void;
  extra?: ReactNode;
}

export function WaveCard({
  name,
  hint,
  canControl,
  holdingA,
  holdingB,
  onHold,
  onStop,
  onBlocked,
  extra,
}: Props) {
  return (
    <article className="dg-panel flex flex-col gap-3 p-4">
      <Text variant="heading3" as="h2">
        {name}
      </Text>
      {hint ? (
        <Text variant="secondary" size="xs">
          {hint}
        </Text>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!canControl}
          variant={holdingA ? "primary" : "secondary"}
          onClick={() => (holdingA ? onStop(0) : onHold(0))}
          onPointerDown={() => {
            if (!canControl) onBlocked();
          }}
        >
          {holdingA ? "停 A" : "循环 A"}
        </Button>
        <Button
          size="sm"
          disabled={!canControl}
          variant={holdingB ? "primary" : "secondary"}
          onClick={() => (holdingB ? onStop(1) : onHold(1))}
          onPointerDown={() => {
            if (!canControl) onBlocked();
          }}
        >
          {holdingB ? "停 B" : "循环 B"}
        </Button>
        {extra}
      </div>
    </article>
  );
}
