---
title: 侧边栏与小组件（sidebar）
description: 侧边栏 widgets 数组体系——九种组件挂载与渲染顺序、公共显隐配置（showOnPost/postOnly/hideOnMobile）、粘性定位与各 widget 专属布局参数。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 6
---

侧边栏是主题里可玩性最高的模块：**九种 widget 以数组声明**，类型、顺序、显隐、粘性定位全部可配，配置文件是 `site/src/config/sidebarConfig.ts`。本文讲侧栏这套「功能布局」——挂载哪些组件、按什么顺序渲染、在哪些页面显示；每个 widget 的**内容配置**则分散在各功能自己的文章，见「九种 widget 与专属配置」一节的链接。

## 快速上手

```ts
// site/src/config/sidebarConfig.ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const sidebarConfig: ThemeConfig["sidebar"] = {
	onPost: true, // 文章页启用侧栏（false 时文章页退回悬浮目录）
	widgets: [
		{ type: "profile" },
		{ type: "categories", position: "sticky" },
		{ type: "tags", position: "sticky", specificConfig: { count: 12 } },
	],
};
```

## 顶层配置

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `onPost` | `boolean` | `true` | 文章页是否启用侧栏；`false` 时文章页用悬浮目录替代 |
| `widgets` | `WidgetItem[]` | 主题默认九件套 | **数组整体覆写**主题默认 widgets（见下方注意） |

> [!note]
> `widgets` 数组是**整体覆写**语义，不是合并：只要写了 `widgets`，主题默认的那套就不生效；且非默认字段（如 `position: "sticky"`）必须显式声明，item 内层默认值不继承主题默认。

## 公共配置（每个 widget 项上）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `type` | `WidgetType` | 必填 | 九选一，见下表 |
| `enabled` | `boolean` | `true` | 置 `false` 后该组件在**所有页面**都不渲染 |
| `showOnPost` | `boolean` | `true` | 置 `false` → 仅首页/列表页显示，文章页不出现 |
| `postOnly` | `boolean` | `false` | 置 `true` → 仅文章页显示（如 toc），列表页不出现 |
| `hideOnMobile` | `boolean` | 按 widget | `<768px` 隐藏（calendar/toc 默认 true） |
| `position` | `"top" \| "sticky"` | `"top"` | `sticky` 渲染进粘性容器，≥768px 跟随滚动 |
| `specificConfig` | `object` | `{}` | 该 widget 的专属参数，收在一处 |

两个显隐方向（`showOnPost: false` 与 `postOnly: true`）都缺省时，列表页与文章页侧栏都显示。

## 九种 widget 与专属配置

| type | 组件 | specificConfig 专属键 |
|---|---|---|
| `profile` | 个人资料卡 | 内容在 profileConfig.ts（见[个人资料卡](/posts/profile/)） |
| `announcement` | 公告卡 | 内容在 announcementConfig.ts（见[公告](/posts/announcement/)） |
| `calendar` | 日历卡 | `postTooltip: boolean` — 日历下方文章条目悬停显示全文 title |
| `categories` | 分类卡 | 无 |
| `tags` | 标签卡 | `count: number` — 展示的热门标签数量，`0` = 全部，超出收进「…更多」 |
| `friends` | 友链卡 | `count: number` 展示数量；`random: boolean` 每次构建随机取样；内容配置见[友链](/posts/friends/) |
| `toc` | 文章目录 | 仅文章页渲染（列表页无目录可展示）；目录配置见[文章页功能](/posts/post-features/) |
| `siteInfo` | 站点信息卡 | 无（已运行天数来自 `siteConfig.since`） |
| `advertisement` | 公告位广告 | 内容在 advertisementConfig.ts（见[广告位](/posts/advertisement/)） |

上表只讲**布局**（专属键、渲染规则）；各组件的实际内容——资料卡字段、公告文案、友链数据、广告素材、目录行为——分别见对应链接的文章。

## 本站示例

```ts
export const sidebarConfig: ThemeConfig["sidebar"] = {
	onPost: true,
	widgets: [
		{ type: "profile", enabled: true },
		{ type: "announcement", enabled: false }, // 公告卡关闭
		{ type: "calendar", enabled: true, hideOnMobile: true, position: "sticky",
		  specificConfig: { postTooltip: false } },
		{ type: "categories", enabled: true, position: "sticky" },
		{ type: "tags", enabled: true, position: "sticky",
		  specificConfig: { count: 12 } },
		{ type: "friends", enabled: true, position: "sticky",
		  specificConfig: { count: 3, random: false } },
		{ type: "toc", postOnly: true, enabled: true, hideOnMobile: true, position: "sticky" },
		{ type: "siteInfo", enabled: true, position: "sticky" },
		{ type: "advertisement", enabled: true, position: "sticky" },
	],
};
```

## 使用效果

- 首页/列表页：profile → categories → tags → friends → siteInfo → advertisement 依次竖排
- 文章页：同列基础上**额外**插入 toc 目录卡（`postOnly`），announcement 仍隐藏
- 日历、toc 在手机上不渲染；`position: "sticky"` 的卡片在宽屏下随滚动保持可见
- 调整 widgets 顺序 = 调整卡片渲染顺序；删掉某项 = 该卡从全站消失
