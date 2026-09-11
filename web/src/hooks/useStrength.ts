import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_STRENGTH_STEP,
  STRENGTH_THROTTLE_MS,
  V4Channel,
  addIntensity,
  clearOperate,
  resetIntensity,
  type RpcReq,
  type V4ChannelId,
} from "../lib/protocol";
import type { StrengthFeedback } from "./useCoyoteSocket";

type Channel = 1 | 2;

interface Options {
  canControl: boolean;
  remote: StrengthFeedback;
  slotId: string | null;
  sendRpc: (req: RpcReq) => boolean;
  onBlocked: () => void;
  linkAB?: boolean;
  onBeforeStop?: () => void;
}

export function useStrength({
  canControl,
  remote,
  slotId,
  sendRpc,
  onBlocked,
  linkAB = false,
  onBeforeStop,
}: Options) {
  const [local, setLocal] = useState({ a: remote.a, b: remote.b });
  const lastSent = useRef({ a: remote.a, b: remote.b });
  const dragging = useRef({ a: false, b: false });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setLocal((prev) => ({
      a: dragging.current.a ? prev.a : remote.a,
      b: dragging.current.b ? prev.b : remote.b,
    }));
    if (!dragging.current.a) lastSent.current.a = remote.a;
    if (!dragging.current.b) lastSent.current.b = remote.b;
  }, [remote]);

  const sendDelta = useCallback(
    (ch: Channel, next: number) => {
      if (!canControl || !slotId) {
        onBlocked();
        return;
      }
      const key = ch === 1 ? "a" : "b";
      const channel: V4ChannelId = ch === 1 ? V4Channel.A : V4Channel.B;
      let delta = next - lastSent.current[key];
      if (delta === 0) return;
      if (Math.abs(delta) > MAX_STRENGTH_STEP) {
        delta = delta > 0 ? MAX_STRENGTH_STEP : -MAX_STRENGTH_STEP;
      }
      if (sendRpc(addIntensity(slotId, channel, delta))) {
        lastSent.current[key] = lastSent.current[key] + delta;
      }
    },
    [canControl, onBlocked, sendRpc, slotId],
  );

  const setOne = useCallback(
    (ch: Channel, raw: number, immediate = false) => {
      const max = ch === 1 ? remote.aLimit : remote.bLimit;
      const next = Math.max(0, Math.min(max || 200, Math.round(raw)));
      const key = ch === 1 ? "a" : "b";
      setLocal((prev) => ({ ...prev, [key]: next }));
      dragging.current[key] = !immediate;

      if (timer.current) window.clearTimeout(timer.current);
      if (immediate) {
        sendDelta(ch, next);
        dragging.current[key] = false;
        return;
      }
      timer.current = window.setTimeout(() => {
        sendDelta(ch, next);
        dragging.current[key] = false;
      }, STRENGTH_THROTTLE_MS);
    },
    [remote.aLimit, remote.bLimit, sendDelta],
  );

  const setChannel = useCallback(
    (ch: Channel, raw: number, immediate = false) => {
      setOne(ch, raw, immediate);
      if (linkAB) setOne(ch === 1 ? 2 : 1, raw, immediate);
    },
    [linkAB, setOne],
  );

  const nudge = useCallback(
    (ch: Channel, up: boolean) => {
      const key = ch === 1 ? "a" : "b";
      setChannel(ch, local[key] + (up ? 1 : -1), true);
    },
    [local, setChannel],
  );

  const emergencyStop = useCallback(() => {
    if (!canControl || !slotId) {
      onBlocked();
      return false;
    }
    onBeforeStop?.();
    sendRpc(clearOperate(slotId));
    if (lastSent.current.a) {
      sendRpc(addIntensity(slotId, V4Channel.A, -lastSent.current.a));
    }
    if (lastSent.current.b) {
      sendRpc(addIntensity(slotId, V4Channel.B, -lastSent.current.b));
    }
    sendRpc(resetIntensity(slotId, V4Channel.A));
    sendRpc(resetIntensity(slotId, V4Channel.B));
    lastSent.current = { a: 0, b: 0 };
    setLocal({ a: 0, b: 0 });
    return true;
  }, [canControl, onBeforeStop, onBlocked, sendRpc, slotId]);

  return {
    local,
    limits: { a: remote.aLimit, b: remote.bLimit },
    setChannel,
    nudge,
    emergencyStop,
  };
}
