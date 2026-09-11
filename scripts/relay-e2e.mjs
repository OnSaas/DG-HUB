#!/usr/bin/env node
const BASE = process.env.RELAY || "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");

function connect(url) {
  const ws = new WebSocket(url);
  const frames = [];
  const waiters = [];
  ws.addEventListener("message", (ev) => {
    const frame = JSON.parse(String(ev.data));
    frames.push(frame);
    for (const waiter of [...waiters]) waiter(frame);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", () => reject(new Error(`open failed ${url}`)), {
      once: true,
    });
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

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  if (!health.ok || health.protocol !== "v4") throw new Error("health");
  ok("health", JSON.stringify(health));

  const ctrl = connect(`${WS}/v4`);
  await ctrl.opened;
  const hello = await ctrl.wait((f) => f.type === "hello" && f.clientId);
  ok("controller hello", hello.clientId);

  const app = connect(`${WS}/v4/?tid=${hello.clientId}`);
  await app.opened;
  const appHello = await app.wait((f) => f.type === "hello" && f.clientId);
  const attachedToApp = await app.wait(
    (f) => f.type === "controller_attached" && f.clientId === hello.clientId,
  );
  const attachedToCtrl = await ctrl.wait(
    (f) => f.type === "client_attached" && f.clientId === appHello.clientId,
  );
  ok("app hello", appHello.clientId);
  ok("controller_attached", attachedToApp.clientId);
  ok("client_attached", attachedToCtrl.clientId);

  const snapshot = {
    t: "ev",
    ev: "devices.snapshot",
    devices: [
      {
        slotId: "slot-coyote",
        name: "郊狼 3.0",
        type: "COYOTE_030",
        props: { intensityA: 0, intensityB: 0 },
        slotState: {
          channelA: { intensityMax: 200 },
          channelB: { intensityMax: 200 },
        },
      },
    ],
  };
  const upP = ctrl.wait(
    (f) =>
      f.type === "message" &&
      f.clientId === appHello.clientId &&
      f.data?.ev === "devices.snapshot",
  );
  app.ws.send(JSON.stringify({ type: "message", data: snapshot }));
  const up = await upP;
  ok("devices.snapshot 上行", up.data.devices[0].slotId);

  const downP = app.wait(
    (f) => f.type === "message" && f.data?.m === "device.op" && f.data?.data?.t === 3,
  );
  ctrl.ws.send(
    JSON.stringify({
      type: "message",
      clientId: appHello.clientId,
      data: {
        t: "req",
        reqId: "1",
        m: "device.op",
        data: { s: "slot-coyote", c: 0, t: 3, v: 1 },
      },
    }),
  );
  const down = await downP;
  ok("device.op t=3 下行", JSON.stringify(down.data.data));

  const goneP = ctrl.wait((f) => f.type === "client_disconnected");
  app.ws.close();
  const gone = await goneP;
  ok("client_disconnected", gone.clientId);

  ctrl.ws.close();
  console.log(log.join("\n"));
  console.log("ALL PASS");
}

main().catch((err) => {
  console.error(log.join("\n"));
  console.error("FAILED", err);
  process.exit(1);
});
