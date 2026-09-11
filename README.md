# DG-HUB

Workers + Durable Objects + D1。Device 是业务实体，Session DO 只负责实时连接。协议 Socket V4。

线上：https://dg-hub.onw.workers.dev

## 路由

- `/` 公开介绍，不能创建/控制/配对
- `/admin/login` 管理员登录 / 首次 setup
- `/admin/devices` 设备列表、添加
- `/admin/devices/:id` 控制台
- `/admin/devices/:id/pair` 配对二维码
- `/admin/devices/:id/waves` 波形
- `/admin/devices/:id/records` 记录
- `/admin/devices/:id/settings` 改名、删除、分享管理
- `/share/:token` 门闩 + 有限控制台（不进管理侧栏）

## 权限

- 未登录不能创建设备、不能建立 controller WebSocket。
- 管理员身份只认 HttpOnly Cookie `dg_hub_sid`。
- 分享链接解锁后发独立 Cookie `dg_hub_share`。URL token 本身不能当 WS 凭证。
- 分享者只能控签发时绑定的那一台；不能看其它设备、不能删、不能再开分享。
- APP 走官方路径：`wss://host/v4/?tid=<session_id>`，不需要 Cookie。
- 控制端：`wss://host/v4?sid=<session_id>`，必须带管理员或分享 Cookie。
- 同一台设备允许多个控制端同时在线（管理员 + 分享者）。

## 命令

```bash
pnpm typecheck
pnpm run deploy
RELAY=http://127.0.0.1:8788 node scripts/relay-e2e.mjs
```
