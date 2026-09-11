#!/usr/bin/env node
const BASE = process.env.RELAY || "http://127.0.0.1:8788";
const WS = BASE.replace(/^http/, "ws");

function connect(url, headers = {}) {
  const ws = new WebSocket(url, { headers });
  const frames = [];
  const waiters = [];
  ws.addEventListener("message", (ev) => {
    const f = JSON.parse(String(ev.data));
    frames.push(f);
    for (const w of waiters) w(f);
  });
  const opened = new Promise((res, rej) => {
    ws.addEventListener("open", () => res(undefined), { once: true });
    ws.addEventListener("error", () => rej(new Error("open failed " + url)), { once: true });
  });
  function wait(pred, ms = 5000) {
    const hit = frames.find(pred);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), ms);
      waiters.push((f) => {
        if (pred(f)) {
          clearTimeout(t);
          resolve(f);
        }
      });
    });
  }
  return { ws, opened, wait, frames };
}

async function json(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, cookie: res.headers.get("set-cookie") };
}

const user = "e2e_" + Date.now();
const pass = "password1";

const setup = await json("/api/admin/setup", {
  method: "POST",
  body: JSON.stringify({ username: user, password: pass }),
});
if (setup.status !== 200) {
  const login = await json("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (login.status !== 200) throw new Error("login/setup failed " + JSON.stringify(setup.body));
}
const cookie = (setup.cookie || "").split(";")[0];
if (!cookie.startsWith("dg_hub_sid=")) throw new Error("no session cookie");
console.log("PASS login cookie");

const created = await json("/api/admin/devices", {
  method: "POST",
  headers: { Cookie: cookie },
  body: JSON.stringify({ name: "E2E-A" }),
});
if (created.status !== 201) throw new Error("create device " + JSON.stringify(created.body));
const device = created.body;
if (!device.id || !device.session_id) throw new Error("device missing ids");
console.log("PASS create device", device.id, device.session_id);

const other = await json("/api/admin/devices", {
  method: "POST",
  headers: { Cookie: cookie },
  body: JSON.stringify({ name: "E2E-B" }),
});
const deviceB = other.body;

const anonCreate = await json("/api/create", { method: "POST" });
if (anonCreate.status !== 410) throw new Error("api/create should be 410");
console.log("PASS /api/create 410");

let anonWsFailed = false;
try {
  const bad = connect(`${WS}/v4`);
  await bad.opened;
} catch {
  anonWsFailed = true;
}
if (!anonWsFailed) throw new Error("anon /v4 opened");
console.log("PASS anon controller rejected");

const ctrl = connect(`${WS}/v4?sid=${device.session_id}`, { Cookie: cookie });
await ctrl.opened;
const hello = await ctrl.wait((f) => f.type === "hello");
if (hello.clientId !== device.session_id) {
  throw new Error("controller hello clientId mismatch " + hello.clientId + " vs " + device.session_id);
}
console.log("PASS controller bound to device session", hello.clientId);

const app = connect(`${WS}/v4/?tid=${device.session_id}`);
await app.opened;
await app.wait((f) => f.type === "hello");
const attached = await ctrl.wait((f) => f.type === "client_attached");
console.log("PASS APP attached", attached.clientId);

await new Promise((r) => setTimeout(r, 200));
const after = await json(`/api/admin/devices/${device.id}`, { headers: { Cookie: cookie } });
if (after.body.status !== "online") throw new Error("expected online, got " + JSON.stringify(after.body));
console.log("PASS device online");

const snap = { t: "ev", ev: "devices.snapshot", devices: [{ slotId: "slot-a", name: "Coyote", type: "COYOTE_030" }] };
app.ws.send(JSON.stringify({ type: "message", data: snap }));
const gotSnap = await ctrl.wait((f) => f.type === "message");
ctrl.ws.send(
  JSON.stringify({
    type: "message",
    clientId: attached.clientId,
    data: { t: "req", reqId: "1", m: "device.op", data: { s: "slot-a", c: 0, t: 3, v: 1 } },
  }),
);
const op = await app.wait((f) => f.type === "message");
if (op.data?.m !== "device.op") throw new Error("op not forwarded " + JSON.stringify(op));
console.log("PASS device.op forwarded", gotSnap.type);

const wrong = connect(`${WS}/v4?sid=${deviceB.session_id}`, { Cookie: cookie });
await wrong.opened;
const helloB = await wrong.wait((f) => f.type === "hello");
if (helloB.clientId === hello.clientId) throw new Error("device B reused session A");
console.log("PASS device B isolated", helloB.clientId);

app.ws.close();
await new Promise((r) => setTimeout(r, 400));
const gone = await json(`/api/admin/devices/${device.id}`, { headers: { Cookie: cookie } });
if (gone.body.status !== "offline") throw new Error("expected offline, got " + JSON.stringify(gone.body));
console.log("PASS device offline after APP close");

ctrl.ws.close();
wrong.ws.close();
console.log("ALL PASS");
