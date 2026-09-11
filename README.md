# DG-HUB

Cloudflare Workers + Durable Objects + D1。Device 是业务实体，Session DO 只负责实时连接。

线上：https://dg-hub.onw.workers.dev

## 分层

- 公开 `/` `/api/public/*`：只读，不能控制
- 管理员 `/admin` `/api/admin/*`：HttpOnly Cookie 会话
- 分享 `/api/share/*`：预留，未开放控制
- APP 配对：`wss://host/v4/?tid=<device.session_id>`
- 控制端：登录后 `wss://host/v4?sid=<device.session_id>`

## 命令

```bash
pnpm install
pnpm typecheck
pnpm run deploy
```
