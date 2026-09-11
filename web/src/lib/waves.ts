import { BUILTIN_WAVES } from "./pulse/builtin";
import { LOOP_BATCH_S, sendPulse, tileFrames, type V4ChannelId } from "./protocol";

export function pulseOp(
  slotId: string,
  channel: V4ChannelId,
  frames: readonly string[],
  durationS = LOOP_BATCH_S,
) {
  const tiled = tileFrames(frames, durationS);
  return sendPulse(slotId, channel, tiled, Math.round(durationS * 1000));
}

export const WAVE_PRESETS = BUILTIN_WAVES;
