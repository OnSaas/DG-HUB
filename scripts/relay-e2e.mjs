#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { WebSocket: WS } = require("ws");

const BASE = process.env.RELAY || "http://127.0.0.1:8788";
const WSBASE = BASE.replace(/^http/, "ws");

function cookieFrom(res) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = list.length ? list : [res.headers.get("set-cookie")].filter(Boolean);
  const parts = [];
  for (const line of raw) {
    const first = String(line).split(";")[0];
    if (first && first.includes("=")) parts.push(first);
  }
  return parts.join("; ");
}

function connect(url, cookie = "") {
  const ws = cookie ? new WS(url, { headers: { Cookie: cookie } }) : new WS(url);
  const frames = [];
  const waiters = [];
  ws.addEventListener("message", (ev) => {
    const frame = JSON.parse(String(ev.data));
    frames.push(frame);
    for (const waiter of [...waiters]) waiter(frame);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", () => reject(new Error(`open failed ${url}`)), { once: true });
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
  return { ws, opened, wait, frames };
}

const log = [];
const ok = (name, extra = "") => log.push(`PASS ${name} ${extra}`.trim());

async function json(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  if (!health.ok || health.protocol !== "v4") throw new Error("health");
  ok("health", JSON.stringify(health));

  const anonWs = await fetch(`${WSBASE}/v4?sid=deadbeef`.replace(/^ws/, "http"), {
    headers: { Upgrade: "websocket", Connection: "Upgrade" },
  }).catch(() => null);
  const anonTry = connect(`${WSBASE}/v4?sid=deadbeef`);
  const anonFail = await Promise.race([
    anonTry.opened.then(() => "opened"),
    new Promise((r) => setTimeout(() => r("timeout"), 1500)),
    new Promise((r) => anonTry.ws.addEventListener("close", () => r("closed"), { once: true })),
    new Promise((r) => anonTry.ws.addEventListener("unexpected-response", () => r("reject"), { once: true })),
  ]);
  if (anonFail === "opened") throw new Error("anon controller should not connect");
  ok("anon /v4?sid= 拒绝", String(anonFail));
  try {
    anonTry.ws.close();
  } catch {
    /* */
  }

  const needed = await json("/api/admin/setup-needed");
  const user = `e2e_${Date.now()}`;
  const pass = "password123";
  let adminCookie = "";
  if (needed.body.needed) {
    const setup = await json("/api/admin/setup", {
      method: "POST",
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!setup.res.ok) throw new Error(`setup ${setup.res.status} ${JSON.stringify(setup.body)}`);
    adminCookie = cookieFrom(setup.res);
  } else {
    const loginUser = process.env.E2E_USER || "e2e";
    const loginPass = process.env.E2E_PASS || "password123";
    const login = await json("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username: loginUser, password: loginPass }),
    });
    if (!login.res.ok) throw new Error(`login ${login.res.status} ${JSON.stringify(login.body)}`);
    adminCookie = cookieFrom(login.res);
  }
  if (!adminCookie) throw new Error("no admin cookie");
  ok("admin session");

  const created = await json("/api/admin/devices", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ name: "e2e" }),
  });
  if (created.res.status !== 201) throw new Error(`create device ${created.res.status} ${JSON.stringify(created.body)}`);
  const device = created.body;
  ok("create device", device.session_id);

  const ctrl = connect(`${WSBASE}/v4?sid=${device.session_id}`, adminCookie);
  await ctrl.opened;
  const hello = await ctrl.wait((f) => f.type === "hello" && f.clientId);
  ok("controller hello", hello.clientId);

  const app = connect(`${WSBASE}/v4/?tid=${device.session_id}`);
  await app.opened;
  const appHello = await app.wait((f) => f.type === "hello" && f.clientId);
  await app.wait((f) => f.type === "controller_attached");
  await ctrl.wait((f) => f.type === "client_attached" && f.clientId === appHello.clientId);
  ok("app paired", appHello.clientId);

  const snapshot = {
    t: "ev",
    ev: "devices.snapshot",
    devices: [
      {
        slotId: "slot-coyote",
        name: "郊狼 3.0",
        type: "COYOTE_030",
        props: { intensityA: 0, intensityB: 0 },
        slotState: { channelA: { intensityMax: 200 }, channelB: { intensityMax: 200 } },
      },
    ],
  };
  const upP = ctrl.wait((f) => f.type === "message" && f.data?.ev === "devices.snapshot");
  app.ws.send(JSON.stringify({ type: "message", data: snapshot }));
  await upP;
  ok("devices.snapshot");

  const downP = app.wait((f) => f.type === "message" && f.data?.m === "device.op" && f.data?.data?.t === 3);
  ctrl.ws.send(
    JSON.stringify({
      type: "message",
      clientId: appHello.clientId,
      data: { t: "req", reqId: "1", m: "device.op", data: { s: "slot-coyote", c: 0, t: 3, v: 1 } },
    }),
  );
  await downP;
  ok("device.op t=3");

  const share = await json(`/api/admin/devices/${device.id}/shares`, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ password: "sharepass", permissions: ["device.control"] }),
  });
  if (share.res.status !== 201) throw new Error(`share ${share.res.status} ${JSON.stringify(share.body)}`);
  ok("create share", share.body.url);

  const meta = await json(`/api/share/${share.body.token}/meta`);
  if (!meta.body.requiresPassword || meta.body.sessionId) throw new Error("meta leaked");
  ok("share meta 脱敏");

  const bad = await json(`/api/share/${share.body.token}/unlock`, {
    method: "POST",
    body: JSON.stringify({ password: "wrong" }),
  });
  if (bad.res.status !== 401) throw new Error("bad password");
  ok("share 密码错误");

  const unlock = await json(`/api/share/${share.body.token}/unlock`, {
    method: "POST",
    body: JSON.stringify({ password: "sharepass" }),
  });
  if (!unlock.res.ok) throw new Error(`unlock ${JSON.stringify(unlock.body)}`);
  const shareCookie = cookieFrom(unlock.res);
  if (!shareCookie.includes("dg_hub_share")) throw new Error("no share cookie");
  ok("share unlock");

  const shareCtrl = connect(`${WSBASE}/v4?sid=${device.session_id}`, shareCookie);
  await shareCtrl.opened;
  await shareCtrl.wait((f) => f.type === "hello");
  ok("share controller 同时在线");

  const other = await json("/api/admin/devices", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ name: "other" }),
  });
  const steal = connect(`${WSBASE}/v4?sid=${other.body.session_id}`, shareCookie);
  const stealResult = await Promise.race([
    steal.opened.then(() => "opened"),
    new Promise((r) => steal.ws.addEventListener("unexpected-response", () => r("reject"), { once: true })),
    new Promise((r) => steal.ws.addEventListener("close", () => r("closed"), { once: true })),
    new Promise((r) => setTimeout(() => r("timeout"), 1500)),
  ]);
  if (stealResult === "opened") throw new Error("share stole other device");
  ok("share 不能连别人的 sid", String(stealResult));
  try {
    steal.ws.close();
  } catch {
    /* */
  }

  const adminList = await json("/api/admin/devices", { headers: { Cookie: shareCookie } });
  if (adminList.res.status !== 401) throw new Error("share opened admin api");
  ok("share 打不开 /api/admin/devices");

  await json(`/api/admin/devices/${device.id}/shares/${share.body.id}/revoke`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  const afterRevoke = connect(`${WSBASE}/v4?sid=${device.session_id}`, shareCookie);
  const revoked = await Promise.race([
    afterRevoke.opened.then(() => "opened"),
    new Promise((r) => afterRevoke.ws.addEventListener("unexpected-response", () => r("reject"), { once: true })),
    new Promise((r) => afterRevoke.ws.addEventListener("close", () => r("closed"), { once: true })),
    new Promise((r) => setTimeout(() => r("timeout"), 1500)),
  ]);
  if (revoked === "opened") throw new Error("revoked share still connects");
  ok("撤销后 WS 失败", String(revoked));

  app.ws.close();
  ctrl.ws.close();
  shareCtrl.ws.close();
  console.log(log.join("\n"));
  console.log("ALL PASS");
  void anonWs;
}

main().catch((err) => {
  console.error(log.join("\n"));
  console.error("FAILED", err);
  process.exit(1);
});
