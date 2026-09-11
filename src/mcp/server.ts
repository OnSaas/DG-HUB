import { bumpMcpUsage } from "../db/mcp";
import { getDeviceById, listDevicesByAdmin } from "../db/devices";
import { insertActivity } from "../db/logs";
import { Permission, can, type Principal } from "../auth/principal";
import { WAVE_FRAMES, WAVE_IDS } from "./waves";

const PROTOCOL = "2025-03-26";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };

type DoStatus = {
  online: boolean;
  apps: number;
  controllers: number;
  slotId: string | null;
  intensity: { a: number; b: number } | null;
};

function rpcResult(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: string | number | null | undefined, message: string, code = -32000) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function toolText(payload: unknown, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    isError,
  };
}

function hasStrength(p: Principal) {
  return can(p, Permission.DEVICE_CONTROL) || can(p, Permission.DEVICE_CONTROL_STRENGTH);
}
function hasWave(p: Principal) {
  return can(p, Permission.DEVICE_CONTROL) || can(p, Permission.DEVICE_CONTROL_WAVE);
}
function hasStop(p: Principal) {
  return can(p, Permission.DEVICE_CONTROL) || can(p, Permission.DEVICE_CONTROL_STOP);
}

function toolDefs(p: Principal) {
  const all = [
    {
      name: "list_devices",
      description: "List devices in this MCP grant: id, name, online.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "get_status",
      description: "Status for one device. device_id required.",
      inputSchema: {
        type: "object",
        properties: { device_id: { type: "string" } },
        required: ["device_id"],
      },
    },
    {
      name: "adjust_strength",
      description: "Add relative intensity on A/B/AB. Clamped to grant caps.",
      inputSchema: {
        type: "object",
        properties: {
          device_id: { type: "string" },
          channel: { type: "string", enum: ["A", "B", "AB"] },
          delta: { type: "number" },
        },
        required: ["device_id", "channel", "delta"],
      },
      need: hasStrength,
    },
    {
      name: "set_strength",
      description: "Set absolute intensity via relative t=3. Clamped to cap_a/cap_b.",
      inputSchema: {
        type: "object",
        properties: {
          device_id: { type: "string" },
          channel: { type: "string", enum: ["A", "B", "AB"] },
          value: { type: "number" },
        },
        required: ["device_id", "channel", "value"],
      },
      need: hasStrength,
    },
    {
      name: "reset_strength",
      description: "Zero intensity t=7 v=0.",
      inputSchema: {
        type: "object",
        properties: { device_id: { type: "string" } },
        required: ["device_id"],
      },
      need: (x: Principal) => hasStrength(x) || hasStop(x),
    },
    {
      name: "play_wave",
      description: `Play a built-in wave. ids: ${WAVE_IDS.join(", ")}`,
      inputSchema: {
        type: "object",
        properties: {
          device_id: { type: "string" },
          channel: { type: "string", enum: ["A", "B", "AB"] },
          wave: { type: "string" },
          duration_s: { type: "number" },
        },
        required: ["device_id", "channel", "wave"],
      },
      need: hasWave,
    },
    {
      name: "stop_wave",
      description: "Clear pulse on device.",
      inputSchema: {
        type: "object",
        properties: { device_id: { type: "string" } },
        required: ["device_id"],
      },
      need: (x: Principal) => hasWave(x) || hasStop(x),
    },
    {
      name: "emergency_stop",
      description: "Zero both channels and clear waves. Ignores strength caps.",
      inputSchema: {
        type: "object",
        properties: { device_id: { type: "string" } },
        required: ["device_id"],
      },
      need: hasStop,
    },
  ];
  return all
    .filter((t) => !t.need || t.need(p))
    .map(({ need: _need, ...rest }) => rest);
}

export function mcpCors(req: Request): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", req.headers.get("Origin") || "*");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type, MCP-Protocol-Version");
  h.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

export async function handleMcp(request: Request, env: Env, principal: Principal): Promise<Response> {
  const headers = mcpCors(request);
  headers.set("Content-Type", "application/json");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (principal.type !== "MCP") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }
  let body: Rpc;
  try {
    body = (await request.json()) as Rpc;
  } catch {
    return new Response(JSON.stringify(rpcError(null, "parse_error", -32700)), { status: 400, headers });
  }
  const out = await dispatch(body, env, principal);
  if (out === null) return new Response(null, { status: 202, headers });
  return new Response(JSON.stringify(out), { status: 200, headers });
}

async function dispatch(body: Rpc, env: Env, principal: Principal) {
  const method = body.method ?? "";
  if (method === "notifications/initialized" || method.startsWith("notifications/")) return null;
  if (method === "initialize") {
    return rpcResult(body.id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: "dg-hub", version: "0.1.0" },
    });
  }
  if (method === "ping") return rpcResult(body.id, {});
  if (method === "tools/list") return rpcResult(body.id, { tools: toolDefs(principal) });
  if (method === "tools/call") {
    const params = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const name = String(params.name ?? "");
    const args = params.arguments ?? {};
    const allowed = new Set(toolDefs(principal).map((t) => t.name));
    if (!allowed.has(name)) return rpcResult(body.id, toolText({ error: "unknown_or_forbidden_tool" }, true));
    const ok = await bumpMcpUsage(env.DB, principal.id, principal.caps?.rpm ?? 30);
    if (!ok) return rpcResult(body.id, toolText({ error: "rate_limited" }, true));
    try {
      const result = await callTool(name, args, env, principal);
      return rpcResult(body.id, toolText(result, Boolean((result as { error?: string }).error)));
    } catch (e) {
      return rpcResult(body.id, toolText({ error: e instanceof Error ? e.message : String(e) }, true));
    }
  }
  return rpcError(body.id, `method_not_found:${method}`, -32601);
}

async function scopedDevices(env: Env, principal: Principal) {
  const all = await listDevicesByAdmin(env.DB, principal.adminId ?? "");
  if (principal.scope === "all") return all;
  const allow = new Set(principal.deviceIds ?? []);
  return all.filter((d) => allow.has(d.id));
}

async function requireDevice(env: Env, principal: Principal, deviceId: string) {
  const id = String(deviceId ?? "");
  if (!id) throw new Error("device_id_required");
  const list = await scopedDevices(env, principal);
  const hit = list.find((d) => d.id === id);
  if (!hit) throw new Error("forbidden");
  const owned = await getDeviceById(env.DB, id);
  if (!owned || owned.admin_id !== principal.adminId) throw new Error("forbidden");
  return owned;
}

async function doStatus(env: Env, sessionId: string): Promise<DoStatus> {
  const stub = env.SESSION.getByName(sessionId);
  const res = await stub.fetch("https://do/internal", { method: "GET" });
  return (await res.json()) as DoStatus;
}

async function doOp(env: Env, sessionId: string, data: unknown) {
  const stub = env.SESSION.getByName(sessionId);
  const res = await stub.fetch("https://do/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "op", data }),
  });
  return (await res.json()) as DoStatus & { ok?: boolean; error?: string };
}

function rpcReq(m: string, data?: unknown) {
  return { t: "req", reqId: crypto.randomUUID(), m, data };
}

function addOp(slotId: string, channel: 0 | 1, delta: number) {
  return rpcReq("device.op", { s: slotId, c: channel, t: 3, v: delta });
}

function resetOp(slotId: string, channel: 0 | 1) {
  return rpcReq("device.op", { s: slotId, c: channel, t: 7, v: 0 });
}

function clearOp(slotId: string) {
  return rpcReq("device.op.clear", { s: slotId });
}

function pulseOp(slotId: string, channel: 0 | 1, frames: string[], durationMs: number) {
  return rpcReq("device.op", { s: slotId, c: channel, t: 0, d: durationMs, im: true, v: frames });
}

function channels(ch: string): Array<0 | 1> {
  if (ch === "A") return [0];
  if (ch === "B") return [1];
  return [0, 1];
}

function tile(base: string[], durationS: number): string[] {
  if (!base.length) return [];
  const total = Math.max(1, Math.round(durationS * 10));
  const out: string[] = [];
  for (let i = 0; i < total; i++) out.push(base[i % base.length]!);
  return out;
}

async function callTool(name: string, args: Record<string, unknown>, env: Env, principal: Principal) {
  if (name === "list_devices") {
    const list = await scopedDevices(env, principal);
    const items = [];
    for (const d of list) {
      const st = await doStatus(env, d.session_id);
      items.push({ id: d.id, name: d.name, online: st.online || d.status === "online" });
    }
    return { devices: items };
  }

  const device = await requireDevice(env, principal, String(args.device_id ?? ""));
  const caps = principal.caps ?? { a: 200, b: 200, step: 10, rpm: 30, waveS: 30 };
  const st = await doStatus(env, device.session_id);

  if (name === "get_status") {
    return {
      device_id: device.id,
      name: device.name,
      online: st.online,
      slotId: st.slotId,
      intensity: st.intensity,
      caps: { a: caps.a, b: caps.b, step: caps.step },
    };
  }

  if (!st.online) return { error: "device_offline" };
  const slotId = st.slotId || "slot-coyote";

  if (name === "adjust_strength") {
    const chs = channels(String(args.channel ?? "A"));
    let delta = Number(args.delta ?? 0);
    if (!Number.isFinite(delta)) delta = 0;
    const capStep = caps.step;
    let clamped = false;
    if (Math.abs(delta) > capStep) {
      delta = delta > 0 ? capStep : -capStep;
      clamped = true;
    }
    const cur = st.intensity ?? { a: 0, b: 0 };
    for (const c of chs) {
      const curV = c === 0 ? cur.a : cur.b;
      const cap = c === 0 ? caps.a : caps.b;
      let next = curV + delta;
      if (next > cap) {
        delta = cap - curV;
        next = cap;
        clamped = true;
      }
      if (next < 0) {
        delta = -curV;
        next = 0;
        clamped = true;
      }
      if (delta !== 0) await doOp(env, device.session_id, addOp(slotId, c, delta));
    }
    await insertActivity(env.DB, {
      deviceId: device.id,
      actorType: "MCP",
      actorId: principal.id,
      action: "mcp.adjust",
      payload: { delta, channel: args.channel, clamped },
    });
    return { ok: true, clamped, delta };
  }

  if (name === "set_strength") {
    const chs = channels(String(args.channel ?? "A"));
    let value = Number(args.value ?? 0);
    if (!Number.isFinite(value)) value = 0;
    const cur = st.intensity ?? { a: 0, b: 0 };
    const assumed = !st.intensity;
    let clamped = assumed;
    for (const c of chs) {
      const cap = c === 0 ? caps.a : caps.b;
      let target = value;
      if (target > cap) {
        target = cap;
        clamped = true;
      }
      if (target < 0) {
        target = 0;
        clamped = true;
      }
      const curV = c === 0 ? cur.a : cur.b;
      let delta = target - curV;
      if (Math.abs(delta) > caps.step) {
        delta = delta > 0 ? caps.step : -caps.step;
        clamped = true;
      }
      if (delta !== 0) await doOp(env, device.session_id, addOp(slotId, c, delta));
    }
    await insertActivity(env.DB, {
      deviceId: device.id,
      actorType: "MCP",
      actorId: principal.id,
      action: "mcp.adjust",
      payload: { set: value, channel: args.channel, clamped, assumed },
    });
    return { ok: true, clamped, assumed };
  }

  if (name === "reset_strength") {
    await doOp(env, device.session_id, resetOp(slotId, 0));
    await doOp(env, device.session_id, resetOp(slotId, 1));
    await insertActivity(env.DB, {
      deviceId: device.id,
      actorType: "MCP",
      actorId: principal.id,
      action: "mcp.adjust",
      payload: { reset: true },
    });
    return { ok: true };
  }

  if (name === "play_wave") {
    const wave = String(args.wave ?? "").toUpperCase();
    const frames = WAVE_FRAMES[wave];
    if (!frames) return { error: "unknown_wave", ids: WAVE_IDS };
    let duration = Number(args.duration_s ?? caps.waveS ?? 30);
    if (!Number.isFinite(duration) || duration <= 0) duration = caps.waveS ?? 30;
    const capS = caps.waveS ?? 30;
    let clamped = false;
    if (duration > capS) {
      duration = capS;
      clamped = true;
    }
    const tiled = tile(frames, duration);
    const chs = channels(String(args.channel ?? "A"));
    for (const c of chs) {
      await doOp(env, device.session_id, pulseOp(slotId, c, tiled, Math.round(duration * 1000)));
    }
    await insertActivity(env.DB, {
      deviceId: device.id,
      actorType: "MCP",
      actorId: principal.id,
      action: "mcp.wave",
      payload: { wave, duration, clamped },
    });
    return { ok: true, wave, duration, clamped };
  }

  if (name === "stop_wave") {
    await doOp(env, device.session_id, clearOp(slotId));
    await insertActivity(env.DB, {
      deviceId: device.id,
      actorType: "MCP",
      actorId: principal.id,
      action: "mcp.wave",
      payload: { stop: true },
    });
    return { ok: true };
  }

  if (name === "emergency_stop") {
    await doOp(env, device.session_id, resetOp(slotId, 0));
    await doOp(env, device.session_id, resetOp(slotId, 1));
    await doOp(env, device.session_id, clearOp(slotId));
    await insertActivity(env.DB, {
      deviceId: device.id,
      actorType: "MCP",
      actorId: principal.id,
      action: "mcp.estop",
    });
    return { ok: true };
  }

  return { error: "unknown_tool" };
}
