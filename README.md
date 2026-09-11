# DG-HUB

Workers + Durable Objects + D1。Device 是业务实体，Session DO 只负责实时连接。

线上：https://dg-hub.onw.workers.dev

## 路由

- `/` 公开层
- `/admin/login` 管理员
- `/admin/devices` 设备列表
- `/admin/devices/:id` 控制台（强度/波形/急停）
- `/share/:token` 预留，本阶段不能控

## 权限

未登录不能创建设备、不能控制。知道 sessionId 不够。管理员身份只认 HttpOnly Cookie。
Public API 只返回 `public_pages` 开启后的脱敏字段，不含 session_id。

## 命令

```bash
pnpm typecheck
pnpm run deploy
```
