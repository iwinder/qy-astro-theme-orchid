---
title: 友链（friends）
image: api
description: friendsConfig 全部字段——申请友链区块（支持评论区直接留言申请）、权重排序与列表项（头像兜底、标签、featured 优先、enabled 显隐），一份数据同时驱动友链页与侧栏 friends widget。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 20
---

本篇讲友链页（`/friends/`）的数据配置。
友链数据**同时驱动**友链页与首页侧栏的 friends widget：widget 的**挂载与显隐**在
`sidebarConfig.ts` 的 `widgets` 数组（`type: "friends"`，`specificConfig.count`
控制展示条数、`random: true` 每次构建随机取样），**友链页数据**则全在 `friendsConfig.ts`。
小组件挂载细节见[侧边栏与小组件](/posts/sidebar/)，页面路由开关与正文写法见[独立页面](/posts/pages/)。

**配置文件**：`site/src/config/friendsConfig.ts`

## 站点信息

友链页的标题、描述与排序方式：

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` / `description` | `string` | — | 页面标题与描述 |
| `sort` | `string` | `"weight"` | 排序依据（weight 降序） |

```ts
// site/src/config/friendsConfig.ts
export const friendsConfig: ThemeConfig["friends"] = {
	title: "友链",
	description: "山不在高，有仙则名。",
	sort: "weight", // 排序字段
};
```

## 申请友链区块

页面上邀请交换链接的申请区块：

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `apply` | `ApplyConfig` | — | 申请友链区块（`title`/`description`/`link`/`label`） |

```ts
// site/src/config/friendsConfig.ts
apply: {
	title: "想和清言集交换链接？",
	description: "欢迎写信给我，附上站点名称、链接、头像和一句话介绍。",
	link: "mailto:hi@example.com",
	label: "申请友链",
},
```

## 评论区留言申请

申请区块下方是**评论区**：读者可以直接在评论区留言申请友链，不必跳转邮件或外部表单。
友链页与文章页、留言板共用同一套评论系统（全局 `commentConfig.ts` 的 provider 配置），
任一后端启用后自动出现；`comment.enabled: false` 或 provider 后端地址未配置时整体不渲染，
页面不留空位。评论后端配置详见[评论系统](/posts/comment/)。

## 友链项

友链列表项的站点名、链接、头像、介绍、标签与展示控制：

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `list[].title` / `site` | `string` | 必填 | 站点名 / 链接 |
| `list[].image` | `string` | `""` | 头像，留空渲染首字字头像 |
| `list[].desc` | `string` | `""` | 一句话介绍 |
| `list[].tags` | `string[]` | `[]` | 展示标签 |
| `list[].weight` | `number` | `0` | 权重排序，大在前 |
| `list[].featured` | `boolean` | `false` | `true` 优先展示在首页侧栏（其余按 weight 补足） |
| `list[].enabled` | `boolean` | `true` | `false` 两处都不渲染 |

```ts
// site/src/config/friendsConfig.ts
list: [
	{
		title: "青山不改",           // 站点名称
		site: "https://example.com", // 站点链接
		image: "",                   // 头像；留空用首字字头像兜底
		desc: "山中岁月长，林间无事忙",
		tags: ["技术"],              // 可选，展示用标签
		weight: 10,                  // 权重，大在前
		featured: true,              // 首页/侧栏优先展示
		enabled: true,               // false 则页面与侧栏都不渲染
	},
],
```

## 存活检测（check-friends.mjs）

友链会随时间失联，主题自带一个零依赖检测脚本：读取构建产物里的友链页，并发探测各站点可达性，输出判级报告。**不挂进 build**（构建保持离线可复现），发布后或 CI 定时手动运行。

```bash
# 站点根目录（构建产物已生成后）
node node_modules/@windcoder/astro-theme-orchid/scripts/check-friends.mjs \
	--dist dist --timeout 8000 --retries 1 --concurrency 6 \
	--json friends-report.json --fail-on-dead
```

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--dist` | `dist` | 构建产物目录（读取 `dist/friends/index.html`） |
| `--timeout` | `8000` | 单次请求超时（毫秒） |
| `--retries` | `1` | 网络层失败与 5xx 的重试次数（4xx 重试无意义） |
| `--concurrency` | `6` | 并发探测数 |
| `--json` | — | 额外写一份 JSON 报告（含时间戳与逐条结果） |
| `--fail-on-dead` | — | 存在 dead 站点时以退出码 1 结束（供 CI 门禁） |

判级分三档，避免把"反爬"误判成"失联"：

| 判级 | 含义 | 状态码 |
|---|---|---|
| `ok` | 正常可达 | 2xx / 3xx |
| `warn` | 疑似 WAF/反爬拦截，未必失联，建议浏览器人工复核 | 403 / 405 / 406 / 429 / 999 |
| `dead` | 网络层失败（域名解析/超时/拒绝）或其余 4xx / 5xx | — |

CI 定时巡检示例（GitHub Actions，每周一 04:00 检测并上传报告）：

```yaml
on:
  schedule:
    - cron: "0 4 * * 1" # 每周一 04:00 UTC
jobs:
  friends-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile && pnpm build
      - run: node node_modules/@windcoder/astro-theme-orchid/scripts/check-friends.mjs --dist dist --json friends-report.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: friends-report
          path: friends-report.json
```

注意：脚本读的是**构建产物**而非配置源文件，所以先 `pnpm build` 再检测；`enabled: false` 的友链不参与检测。
