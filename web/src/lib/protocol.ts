export const QR_LANDING = "https://dungeon-lab.cn/s/";
export const STRENGTH_THROTTLE_MS = 120;
export const MAX_STRENGTH = 200;
export const MAX_STRENGTH_STEP = 40;
export const FRAME_MS = 100;
export const LOOP_BATCH_S = 30;
export const LOOP_OVERLAP_S = 0.3;

export const V4Channel = { A: 0, B: 1 } as const;
export type V4ChannelId = (typeof V4Channel)[keyof typeof V4Channel];

export interface ServerFrame {
  type: string;
  clientId?: string;
  data?: unknown;
  ts?: number;
  code?: string;
  message?: string;
}

export interface RpcReq {
  t: "req";
  reqId: string;
  m: string;
  data?: unknown;
}

export interface RpcResp {
  t: "resp";
  reqId: string;
  result?: unknown;
  error?: string;
}

export interface EvFrame {
  t: "ev";
  ev: string;
  [key: string]: unknown;
}

export interface RemoteDevice {
  id?: number;
  slotId: string;
  name: string;
  type: string;
  props?: Record<string, unknown>;
  slotState?: Record<string, unknown>;
}

export function relayWsUrl(origin: string): string {
  return origin.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";
}

export function appWsUrl(origin: string, targetId: string): string {
  return `${relayWsUrl(origin)}?tid=${encodeURIComponent(targetId)}`;
}

export function qrPayload(origin: string, targetId: string): string {
  return `${QR_LANDING}?v=1&action=socket&url=${encodeURIComponent(appWsUrl(origin, targetId))}`;
}

export function rpcReq(m: string, data?: unknown): RpcReq {
  return { t: "req", reqId: crypto.randomUUID(), m, data };
}

/** t=3 AddIntensity — 实测最稳的强度原语。绝对强度用 目标-当前 换算。 */
export function addIntensity(
  slotId: string,
  channel: V4ChannelId,
  delta: number,
): RpcReq {
  return rpcReq("device.op", {
    s: slotId,
    c: channel,
    t: 3,
    v: delta,
  });
}

/** t=7 SetIntensity，官方只认 v=0 归零。 */
export function resetIntensity(slotId: string, channel: V4ChannelId): RpcReq {
  return rpcReq("device.op", {
    s: slotId,
    c: channel,
    t: 7,
    v: 0,
  });
}

/** t=0 AppendPulseData。d=0 持续播放不可靠，时长按帧数 * 100ms。 */
export function sendPulse(
  slotId: string,
  channel: V4ChannelId,
  frames: string[],
  durationMs: number,
): RpcReq {
  return rpcReq("device.op", {
    s: slotId,
    c: channel,
    t: 0,
    d: durationMs,
    im: true,
    v: frames,
  });
}

export function clearOperate(slotId?: string, channel?: V4ChannelId): RpcReq {
  if (!slotId) return rpcReq("device.op.clear");
  if (channel === undefined) return rpcReq("device.op.clear", { s: slotId });
  return rpcReq("device.op.clear", { s: slotId, c: channel });
}

export function tileFrames(base: readonly string[], durationS: number): string[] {
  if (base.length === 0) return [];
  const total = Math.max(1, Math.round(durationS * 10));
  const out: string[] = [];
  for (let i = 0; i < total; i++) out.push(base[i % base.length]!);
  return out;
}

export function pickDevice(list: RemoteDevice[]): RemoteDevice | undefined {
  return (
    list.find((d) => d.type === "COYOTE_030" || d.type === "COYOTE_020") ??
    list.find((d) => Boolean(d.slotId))
  );
}

export function isServerFrame(value: unknown): value is ServerFrame {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ServerFrame).type === "string",
  );
}

export function readIntensity(device: RemoteDevice): {
  a: number;
  b: number;
  aLimit: number;
  bLimit: number;
} {
  const props = device.props ?? {};
  const state = device.slotState ?? {};
  const channelA = (state.channelA ?? {}) as Record<string, unknown>;
  const channelB = (state.channelB ?? {}) as Record<string, unknown>;
  return {
    a: num(props.intensityA) || num(channelA.intensity),
    b: num(props.intensityB) || num(channelB.intensity),
    aLimit: num(channelA.intensityMax, 200),
    bLimit: num(channelB.intensityMax, 200),
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
