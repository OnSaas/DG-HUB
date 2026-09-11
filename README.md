# DG-HUB

Workers + Durable Objects + D1。Device 是业务实体，Session DO 只负责实时连接。协议 Socket V4。

线上：https://dg-hub.onw.workers.dev

## 三种入口

- 路人 `/`：公开介绍 + 去登录。不能进后台。
- 管理员 `/admin/login`：完整后台。不连 APP、不发分享也能进各功能页。
- 被分享者 `/share/:token`：只控签发的那一台。

分享不是进后台的门票。看后台 ≠ 控硬件；未配对时页面能打开，下发会提示先配对。

## 路由

- `/` 公开页
- `/admin/login`
- `/admin/devices` 及 `/admin/devices/:id`（控制台 / 配对 / 波形 / 记录 / 设置）
- `/admin/settings` 本机偏好
- `/share/:token`

未登录访问 `/admin/*` 会回登录。匿名 `/v4?sid=` 仍 401。

## 命令

```bash
pnpm typecheck
pnpm run deploy
```
