import { DurableObject } from "cloudflare:workers";
import { Close, HEARTBEAT_MS, IDLE_TIMEOUT_MS, type Attachment, type Role } from "./types";
import { setDevicePresence } from "./db/devices";

export class Session extends DurableObject<Env> {
  private controllers = new Map<string, WebSocket>();
  private apps = new Map<string, WebSocket>();
  private lastActivity = Date.now();
  private sessionKey: string | null = null;
  private slotId: string | null = null;
  private intensity = { a: 0, b: 0, known: false };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.restoreAttachments();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") !== "websocket") {
      return this.handleInternal(request);
    }
    const role = (url.searchParams.get("role") ?? "controller") as Role;
    const clientId = url.searchParams.get("clientId") ?? crypto.randomUUID();
    const sessionId = url.searchParams.get("sessionId") ?? this.sessionKey ?? clientId;
    this.sessionKey = sessionId;

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const attachment: Attachment = { role, clientId };
    server.serializeAttachment(attachment);

    if (role === "app") this.attachApp(server, clientId);
    else this.attachController(server, clientId);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    this.touch();
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== "object") return;
    const frame = parsed as { type?: string; clientId?: string; data?: unknown };

    if (frame.type === "heartbeat" || frame.type === "pong" || frame.type === "ping") {
      this.send(ws, { type: "heartbeat", ts: Date.now() });
      return;
    }

    if (frame.type !== "message") return;
    if (attachment.role === "controller") {
      const target = frame.clientId ? this.apps.get(frame.clientId) : undefined;
      if (target) this.send(target, { type: "message", clientId: attachment.clientId, data: frame.data });
      return;
    }
    this.broadcastControllers({ type: "message", clientId: attachment.clientId, data: frame.data });
    this.ingestAppData(frame.data);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment) return;
    if (attachment.role === "controller") {
      this.controllers.delete(attachment.clientId);
      this.broadcastControllers({ type: "controller_left", clientId: attachment.clientId });
      if (this.controllers.size === 0) {
        this.dropApps(Close.CONTROLLER_GONE.code, Close.CONTROLLER_GONE.reason);
        if (this.sessionKey) await setDevicePresence(this.env.DB, this.sessionKey, false);
      }
      await this.ensureAlarm();
      return;
    }
    this.apps.delete(attachment.clientId);
    this.broadcastControllers({ type: "client_disconnected", clientId: attachment.clientId });
    if (this.apps.size === 0) {
      if (this.sessionKey) await setDevicePresence(this.env.DB, this.sessionKey, false);
      await this.ensureAlarm();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    if (this.apps.size === 0 && Date.now() - this.lastActivity >= IDLE_TIMEOUT_MS) {
      this.dropApps(Close.IDLE.code, Close.IDLE.reason);
      for (const [, ws] of this.controllers) this.close(ws, Close.IDLE.code, Close.IDLE.reason);
      this.controllers.clear();
      if (this.sessionKey) await setDevicePresence(this.env.DB, this.sessionKey, false);
      return;
    }
    this.broadcastAll({ type: "heartbeat", ts: Date.now() });
    await this.ensureAlarm();
  }

  private attachController(ws: WebSocket, clientId: string): void {
    this.ctx.acceptWebSocket(ws);
    this.controllers.set(clientId, ws);
    this.touch();
    this.send(ws, { type: "hello", clientId });
    for (const [appId] of this.apps) {
      this.send(ws, { type: "client_attached", clientId: appId });
    }
    void this.ensureAlarm();
  }

  private attachApp(ws: WebSocket, clientId: string): void {
    if (this.controllers.size === 0) {
      this.ctx.acceptWebSocket(ws);
      this.close(ws, Close.CONTROLLER_MISSING.code, Close.CONTROLLER_MISSING.reason);
      return;
    }
    this.ctx.acceptWebSocket(ws);
    this.apps.set(clientId, ws);
    this.touch();
    this.send(ws, { type: "hello", clientId });
    this.send(ws, { type: "controller_attached", clientId: this.sessionKey ?? clientId });
    this.broadcastControllers({ type: "client_attached", clientId });
    if (this.sessionKey) void setDevicePresence(this.env.DB, this.sessionKey, true);
    void this.ensureAlarm();
  }

  private restoreAttachments(): void {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (!attachment) continue;
      if (attachment.role === "controller") this.controllers.set(attachment.clientId, ws);
      else this.apps.set(attachment.clientId, ws);
    }
  }

  private async handleInternal(request: Request): Promise<Response> {
    if (request.method === "GET") return Response.json(this.statusPayload());
    if (request.method !== "POST") return new Response("method", { status: 405 });
    let body: { action?: string; data?: unknown };
    try {
      body = (await request.json()) as { action?: string; data?: unknown };
    } catch {
      return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
    }
    if (body.action === "status") return Response.json(this.statusPayload());
    if (body.action !== "op") return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
    if (this.apps.size === 0) return Response.json({ ok: false, error: "device_offline" });
    this.touch();
    for (const [, app] of this.apps) {
      this.send(app, { type: "message", clientId: "mcp", data: body.data });
    }
    return Response.json({ ok: true, ...this.statusPayload() });
  }

  private statusPayload() {
    return {
      online: this.apps.size > 0,
      apps: this.apps.size,
      controllers: this.controllers.size,
      slotId: this.slotId,
      intensity: this.intensity.known ? { a: this.intensity.a, b: this.intensity.b } : null,
    };
  }

  private ingestAppData(data: unknown): void {
    if (!data || typeof data !== "object") return;
    const rec = data as Record<string, unknown>;
    const devices = rec.devices ?? rec.slots ?? (rec.result as { devices?: unknown } | undefined)?.devices;
    const list = Array.isArray(devices) ? devices : Array.isArray(rec.result) ? rec.result : null;
    if (!list) return;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const d = item as Record<string, unknown>;
      if (typeof d.slotId === "string") this.slotId = d.slotId;
      const props = (d.props ?? {}) as Record<string, unknown>;
      const state = (d.slotState ?? {}) as Record<string, unknown>;
      const channelA = (state.channelA ?? {}) as Record<string, unknown>;
      const channelB = (state.channelB ?? {}) as Record<string, unknown>;
      const a = asNum(props.intensityA) || asNum(channelA.intensity);
      const b = asNum(props.intensityB) || asNum(channelB.intensity);
      if (typeof props.intensityA === "number" || typeof channelA.intensity === "number") {
        this.intensity = { a, b, known: true };
      }
    }
  }

  private dropApps(code: number, reason: string): void {
    for (const [, ws] of this.apps) this.close(ws, code, reason);
    this.apps.clear();
  }

  private broadcastControllers(frame: unknown): void {
    for (const [, ws] of this.controllers) this.send(ws, frame);
  }

  private broadcastAll(frame: unknown): void {
    this.broadcastControllers(frame);
    for (const [, ws] of this.apps) this.send(ws, frame);
  }

  private send(ws: WebSocket, frame: unknown): void {
    try {
      ws.send(JSON.stringify(frame));
    } catch {
      /* closed */
    }
  }

  private close(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason);
    } catch {
      /* already */
    }
  }

  private touch(): void {
    this.lastActivity = Date.now();
  }

  private async ensureAlarm(): Promise<void> {
    const existing = await this.ctx.storage.getAlarm();
    if (existing) return;
    await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
  }
}

function asNum(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
