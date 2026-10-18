---
title: 友链（friends）
description: friendsConfig 全部字段——申请友链区块、权重排序与列表项（头像兜底、标签、featured 优先、enabled 显隐），一份数据同时驱动友链页与侧栏 friends widget。
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
