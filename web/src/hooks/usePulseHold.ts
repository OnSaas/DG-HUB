import { useCallback, useEffect, useRef, useState } from "react";
import {
  LOOP_BATCH_S,
  LOOP_OVERLAP_S,
  V4Channel,
  clearOperate,
  type RpcReq,
  type V4ChannelId,
} from "../lib/protocol";
import { pulseOp } from "../lib/waves";

type ChName = "A" | "B";

function nameOf(ch: V4ChannelId): ChName {
  return ch === V4Channel.A ? "A" : "B";
}

interface Options {
  canControl: boolean;
  slotId: string | null;
  sendRpc: (req: RpcReq) => boolean;
}

/**
 * 循环波形：本机分批重发。不依赖 App 的 d=0（AI-for-Coyote 实测不可靠）。
 */
export function usePulseHold({ canControl, slotId, sendRpc }: Options) {
  const timers = useRef<Partial<Record<ChName, number>>>({});
  const [active, setActive] = useState<Record<ChName, string | null>>({
    A: null,
    B: null,
  });

  const stop = useCallback(
    (ch?: ChName) => {
      const names: ChName[] = ch ? [ch] : ["A", "B"];
      for (const n of names) {
        const id = timers.current[n];
        if (id != null) {
          window.clearInterval(id);
          timers.current[n] = undefined;
        }
      }
      setActive((prev) => {
        const next = { ...prev };
        for (const n of names) next[n] = null;
        return next;
      });
      if (slotId) {
        if (ch) {
          sendRpc(clearOperate(slotId, ch === "A" ? V4Channel.A : V4Channel.B));
        } else {
          sendRpc(clearOperate(slotId));
        }
      }
    },
    [sendRpc, slotId],
  );

  const start = useCallback(
    (channel: V4ChannelId, name: string, frames: readonly string[]) => {
      if (!canControl || !slotId) return false;
      const key = nameOf(channel);
      const existing = timers.current[key];
      if (existing != null) window.clearInterval(existing);

      const fire = () => sendRpc(pulseOp(slotId, channel, frames, LOOP_BATCH_S));
      const waitMs = Math.max(100, (LOOP_BATCH_S - LOOP_OVERLAP_S) * 1000);
      const ok = fire();
      if (!ok) return false;

      timers.current[key] = window.setInterval(() => {
        fire();
      }, waitMs);
      setActive((prev) => ({ ...prev, [key]: name }));
      return true;
    },
    [canControl, sendRpc, slotId],
  );

  useEffect(() => {
    return () => {
      for (const n of ["A", "B"] as const) {
        const id = timers.current[n];
        if (id != null) window.clearInterval(id);
      }
    };
  }, []);

  useEffect(() => {
    if (!canControl) stop();
  }, [canControl, stop]);

  return { active, start, stop };
}
