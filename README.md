# DG-HUB

Workers + Durable Objects + D1。Device 是业务实体，Session DO 只负责实时连接。协议 Socket V4。

线上：https://dg-hub.onw.workers.dev

## 入口

- 没链接也能逛完整功能树（设备 / 控制台 / 配对 / 波形 / 记录 / 设置）。未登录是只读浏览。
- 登录后才能添加设备、配对、下发 `device.op`、签发分享。
- 分享链接只是「把某台设备交给别人控」，不是进产品的门票。

## 路由

- `/` `/devices` 设备列表
- `/login` 管理员登录 / 首次 setup（`/admin/login` 同）
- `/console` `/pair` `/waves` `/records` `/settings` 浏览页；有设备时用 `/devices/:id/...`
- `/devices/:id` 控制台
- `/devices/:id/pair` 配对
- `/devices/:id/waves` 波形
- `/devices/:id/records` 记录
- `/devices/:id/settings` 改名、删除、分享管理
- `/share/:token` 门闩 + 有限控制台（不进管理侧栏）
- `/admin/*` 旧书签重定向

## 权限（后端未放宽）

- 未登录不能创建设备、不能建立 controller WebSocket。
- 管理员 Cookie `dg_hub_sid`；分享解锁 Cookie `dg_hub_share`。URL token 不当 WS 凭证。
- 控制端：`wss://host/v4?sid=<session_id>`，必须 Cookie。
- APP：`wss://host/v4/?tid=<session_id>`，不需要 Cookie。
- 游客前端不请求 `/api/admin/devices`，不连 `/v4`。

## 命令

```bash
pnpm typecheck
pnpm run deploy
RELAY=http://127.0.0.1:8788 node scripts/relay-e2e.mjs
```
