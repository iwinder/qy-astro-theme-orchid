---
title: 社交图标配置：内置图标名替代手写 SVG
description: 资料卡社交链接的 icon 支持内置简名、Iconify 全名与内联 SVG 三种写法，构建期内联渲染；本文列出全部内置图标与用法。
published: 2026-10-17
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 进阶
seriesOrder: 25
---

侧栏个人资料卡（`profile.links`）的社交图标不需要手写 SVG，
`icon` 字段填**内置简名**即可——主题基于 [astro-icon](https://docs.astro.build/en/guides/integrations-guide/icon/)
+ Iconify 标准生态构建期内联渲染，无运行时请求、无 JS 开销。

## 三种写法

```ts
// site/src/config/profileConfig.ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const profileConfig: ThemeConfig["profile"] = {
	links: [
		// 写法一（推荐）：内置简名，见下表
		{ name: "哔哩哔哩", url: "https://space.bilibili.com/xxx", icon: "bilibili" },
		// 写法二：Iconify 全名（"集:名"）——站点装任意 @iconify-json/* 集合包即可扩展，
		// 如 pnpm add @iconify-json/tabler 后：
		{ name: "主页", url: "https://example.com", icon: "tabler:home" },
		// 写法三：内联 SVG 字符串（以 "<" 开头），兼容自定义图标
		{ name: "自定义", url: "https://example.com", icon: '<svg viewBox="0 0 24 24">...</svg>' },
	],
};
```

- 图标名解析时 trim + 转小写，命中即输出 SVG，未命中时**跳过图标只渲染文字链接**（不会构建报错）
- 品牌图标为单色填充（`fill="currentColor"`），线性图标为描边（`stroke: currentColor`），颜色都随文字继承，深浅模式自动适配
- 三种写法可混用；主题已内置 astro-icon 集成，站点无需重复配置

## 内置简名清单

**线性描边**（lucide，ISC，与主题图标语言一致）：

| 图标名 | 说明 |
|---|---|
| `github` | GitHub |
| `email` | 邮箱（配 `mailto:` 链接） |
| `rss` | RSS 订阅 |

**品牌填充**（simple-icons，CC0）：

| 图标名 | 说明 | 图标名 | 说明 |
|---|---|---|---|
| `qq` | QQ | `instagram` | Instagram |
| `wechat` | 微信（别名 `weixin`） | `linkedin` | 领英 |
| `weibo` | 微博 | `discord` | Discord |
| `bilibili` | 哔哩哔哩 | `steam` | Steam |
| `xiaohongshu` | 小红书 | `zhihu` | 知乎 |
| `x` | X / Twitter（别名 `twitter`） | `gitee` | Gitee |
| `telegram` | Telegram | `juejin` | 掘金 |
| `youtube` | YouTube | `csdn` | CSDN |
| `douyin` | 抖音（simple-icons 未收录官方形，暂以内联 SVG 兜底） | | |

## 定制提示

- 图标尺寸与间距由主题样式统一约束（`.profile-link-icon`），覆盖该类即可调整大小
- 需要清单之外的图标时，优先用 **Iconify 全名** 写法（站点装对应 `@iconify-json/*` 包），
  或用内联 SVG 写法，避免为单一图标升级主题
