#!/usr/bin/env node
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { WebSocket: WS } = require("ws");

const BASE = process.env.RELAY || "http://127.0.0.1:8788";

function cookieFrom(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const parts = raw.length ? raw : [res.headers.get("set-cookie")].filter(Boolean);
  return parts
    .map((c) => String(c).split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function json(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function mcp(token, payload) {
  return json("/mcp", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...payload }),
  });
}

function connect(url, cookie) {
  const ws = cookie ? new WS(url, { headers: { Cookie: cookie } }) : new WS(url);
  const frames = [];
  const waiters = [];
  ws.addEventListener("message", (ev) => {
    const frame = JSON.parse(String(ev.data));
    frames.push(frame);
    for (const w of [...waiters]) w(frame);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", () => reject(new Error(`open ${url}`)), { once: true });
  });
  function wait(pred, ms = 4000) {
    const hit = frames.find(pred);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout ${url}`)), ms);
      const waiter = (frame) => {
        if (!pred(frame)) return;
        clearTimeout(t);
        resolve(frame);
      };
      waiters.push(waiter);
    });
  }
  return { ws, opened, wait };
}

const log = [];
const ok = (n, x = "") => log.push(`PASS ${n} ${x}`.trim());

async function main() {
  const needed = await json("/api/admin/setup-needed");
  const user = `e2e_${Date.now()}`;
  const pass = "password123";
  let cookie = "";
  if (needed.body.needed) {
    const setup = await json("/api/admin/setup", {
      method: "POST",
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!setup.res.ok) throw new Error("setup");
    cookie = cookieFrom(setup.res);
  } else {
    throw new Error("need empty local db or E2E_USER");
  }
  const headers = { Cookie: cookie };

  const a = await json("/api/admin/devices", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "A" }),
  });
  const b = await json("/api/admin/devices", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "B" }),
  });
  const deviceA = a.body;
  const deviceB = b.body;

  const bare = await json("/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }) });
  if (bare.res.status !== 401) throw new Error(`bare mcp ${bare.res.status}`);
  ok("裸调 /mcp 401");

  const grant = await json("/api/admin/mcp/grants", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "e2e",
      scope: "devices",
      deviceIds: [deviceA.id],
      permissions: ["device.control.strength", "device.control.wave", "device.control.stop"],
      capA: 40,
      capB: 40,
      capStep: 10,
      capRpm: 60,
      capWaveS: 5,
    }),
  });
  if (!grant.res.ok) throw new Error(`grant ${JSON.stringify(grant.body)}`);
  const token = grant.body.token;
  ok("create grant");

  const listed = await mcp(token, { method: "tools/list" });
  const names = (listed.body.result?.tools ?? []).map((t) => t.name);
  if (!names.includes("adjust_strength") || !names.includes("emergency_stop")) throw new Error("tools");
  ok("tools/list", names.join(","));

  const devices = await mcp(token, { method: "tools/call", params: { name: "list_devices", arguments: {} } });
  const ids = (JSON.parse(devices.body.result.content[0].text).devices ?? []).map((d) => d.id);
  if (!ids.includes(deviceA.id) || ids.includes(deviceB.id)) throw new Error(`scope ${ids}`);
  ok("list_devices 仅授权设备");

  const other = await mcp(token, {
    method: "tools/call",
    params: { name: "get_status", arguments: { device_id: deviceB.id } },
  });
  const otherText = JSON.parse(other.body.result.content[0].text);
  if (!other.body.result.isError && otherText.error !== "forbidden") throw new Error("cross device");
  ok("不能打到另一台");

  const offline = await mcp(token, {
    method: "tools/call",
    params: { name: "adjust_strength", arguments: { device_id: deviceA.id, channel: "A", delta: 5 } },
  });
  const off = JSON.parse(offline.body.result.content[0].text);
  if (off.error !== "device_offline") throw new Error(`offline ${JSON.stringify(off)}`);
  ok("无 APP device_offline");

  const WSURL = BASE.replace(/^http/, "ws");
  const ctrl = connect(`${WSURL}/v4?sid=${deviceA.session_id}`, cookie);
  await ctrl.opened;
  await ctrl.wait((f) => f.type === "hello");
  const app = connect(`${WSURL}/v4/?tid=${deviceA.session_id}`);
  await app.opened;
  await app.wait((f) => f.type === "hello");
  app.ws.send(
    JSON.stringify({
      type: "message",
      data: {
        t: "ev",
        ev: "devices.snapshot",
        devices: [
          {
            slotId: "slot-coyote",
            name: "郊狼",
            type: "COYOTE_030",
            props: { intensityA: 0, intensityB: 0 },
            slotState: { channelA: { intensity: 0, intensityMax: 200 }, channelB: { intensity: 0, intensityMax: 200 } },
          },
        ],
      },
    }),
  );
  await new Promise((r) => setTimeout(r, 200));

  const set = await mcp(token, {
    method: "tools/call",
    params: { name: "set_strength", arguments: { device_id: deviceA.id, channel: "A", value: 200 } },
  });
  const setBody = JSON.parse(set.body.result.content[0].text);
  if (!setBody.ok || !setBody.clamped) throw new Error(`cap ${JSON.stringify(setBody)}`);
  ok("set_strength 200 被 cap 截断");

  const down = await app.wait((f) => f.type === "message" && f.data?.m === "device.op", 4000);
  ok("MCP 转发 device.op", JSON.stringify(down.data?.data ?? {}));

  await json(`/api/admin/mcp/grants/${grant.body.id}/revoke`, { method: "POST", headers });
  const dead = await mcp(token, { method: "initialize" });
  if (dead.res.status !== 401) throw new Error(`revoke ${dead.res.status}`);
  ok("撤销后 401");

  ctrl.ws.close();
  app.ws.close();
  console.log(log.join("\n"));
  console.log("ALL PASS");
}

main().catch((err) => {
  console.error(log.join("\n"));
  console.error("FAILED", err);
  process.exit(1);
});
