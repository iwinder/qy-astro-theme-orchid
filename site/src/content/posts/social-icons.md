---
title: 社交图标配置：内置图标名替代手写 SVG
description: 资料卡社交链接的 icon 支持内置图标名引用，构建期内联渲染；本文列出全部内置图标与用法。
published: 2026-10-17
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesOrder: 3
---

侧栏个人资料卡（`profile.links`）的社交图标不需要手写 SVG，
`icon` 字段直接填**内置图标名**即可，主题构建期查表内联渲染——
无运行时请求、无 JS 开销，和参考项目 astro-icon 一样是构建期内联，只是零依赖。

## 两种写法

```ts
// site/config/profileConfig.ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const profileConfig: ThemeConfig["profile"] = {
	links: [
		// 写法一（推荐）：内置图标名，见下表
		{ name: "哔哩哔哩", url: "https://space.bilibili.com/xxx", icon: "bilibili" },
		// 写法二：内联 SVG 字符串（以 "<" 开头），兼容自定义图标
		{ name: "自定义", url: "https://example.com", icon: '<svg viewBox="0 0 24 24">...</svg>' },
	],
};
```

- 图标名解析时 trim + 转小写，命中即输出完整 SVG，未命中时**跳过图标只渲染文字链接**（不会构建报错）
- 品牌图标为单色填充（`fill="currentColor"`），线性图标为描边（`stroke: currentColor`），颜色都随文字继承，深浅模式自动适配
- 内联 SVG 写法向后兼容，自定义图标与内置图标可混用

## 内置图标清单

**线性描边**（lucide 风格，`stroke-width: 1.75`，与主题图标语言一致）：

| 图标名 | 说明 |
|---|---|
| `github` | GitHub |
| `email` | 邮箱（配 `mailto:` 链接） |
| `rss` | RSS 订阅 |

**品牌填充**（单色，来源 simple-icons / mdi）：

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
| `douyin` | 抖音 | | |

## 定制提示

- 图标尺寸与间距由主题样式统一约束（`.profile-link-icon`），覆盖该类即可调整大小
- 图标数据内置于主题包 `src/icons.ts`（lucide ISC / mdi Apache-2.0 / simple-icons CC0 许可），
  需要新增图标时可优先用内联 SVG 写法，避免为单一图标升级主题
