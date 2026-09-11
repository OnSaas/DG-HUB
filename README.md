# DG-HUB

Cloudflare Workers + Durable Objects，DG-Lab **Socket V4** 网页主控。被控端：DG-LAB 4.0 APP。

线上：https://dg-hub.onw.workers.dev

基本控设备对齐 [AI-for-Coyote](https://github.com/indhg/AI-for-Coyote) 的 V4 客户端：`device.op` 帧、官方 24 波形、本机循环下发、急停清零。不包含 AI / 摄像头 / 地牢。

## 连接

- 控制端：`wss://<host>/v4` → `{ type: "hello", clientId }`
- APP：`wss://<host>/v4/?tid=<clientId>`
- 二维码：`https://dungeon-lab.cn/s/?v=1&action=socket&url=<encodeURIComponent(APP_WS)>`

`/api/*`、`/health`、`/ws`、`/v4` 走 Worker；页面走 Assets。

## 控

- 强度：`device.op t=3` 相对加减（绝对值用目标 − 当前）
- 归零：`t=7 v=0`；急停再加 `device.op.clear`
- 波形：`t=0` 帧列表；循环由浏览器每 30s 重发（不信 App `d=0`）
- 单步上限 40

## 界面

侧栏：控制台 / 配对 / 波形库 / 记录 / 设置。顶栏急停常驻。记录存在本机 localStorage。

## 命令

```bash
pnpm install
pnpm typecheck
pnpm dev:worker
pnpm dev
pnpm deploy
```
