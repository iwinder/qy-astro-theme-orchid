---
title: 导航栏（nav）
description: 导航栏 navBarConfig 纯数组配置——菜单项、下拉子菜单、外链标记（external）与三条校验规则，以及桌面/移动端渲染效果。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 4
---

本篇讲站点导航栏：菜单项、下拉子菜单与外链标记。统一壁纸（横幅/全屏/覆盖透明/纯色）是另一个独立配置文件，见[壁纸](/posts/wallpaper/)。

**配置文件**：`site/src/config/navBarConfig.ts`

## 菜单项

导航栏是一个纯数组：数组项按声明顺序渲染在导航栏中部，每个菜单项由 `label` 显示文本与 `href` 链接组成，外链再置 `external: true`。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `label` | `string` | 必填 | 显示文本 |
| `href` | `string` | 无 children 时必填 | 站内链接以 `/` 开头；外链填完整 URL 并置 `external: true` |
| `external` | `boolean` | `false` | 标记外链，渲染时新窗口打开并带外链图标 |

```ts
// site/src/config/navBarConfig.ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const navBarConfig: ThemeConfig["nav"] = [
	{ label: "首页", href: "/" },
	{ label: "文章", href: "/archive/" },
];
```

## 子菜单

`children` 非空时，该项渲染为下拉子菜单；父项 `href` 可省略，做成纯展开按钮。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `children` | `NavItem[]` | `[]` | 非空时渲染为下拉子菜单，父项 `href` 可省略（纯展开按钮） |

三条规则：

1. **下拉菜单**：`children` 非空即生成下拉，支持一级嵌套（子项内不再嵌套）
2. **纯展开按钮**：父项只有 `label` + `children`、没有 `href` 时，点击只展开不下跳
3. **无 children 必须提供 href**，否则构建期校验报错

```ts
// site/src/config/navBarConfig.ts
{
	label: "更多",
	children: [
		{ label: "关于", href: "/about/" },
		{ label: "友链", href: "/friends/" },
		{ label: "留言板", href: "/guestbook/" },
	],
},
```

## 本站示例

```ts
// site/src/config/navBarConfig.ts
export const navBarConfig: ThemeConfig["nav"] = [
	{ label: "首页", href: "/" },
	{
		label: "文章",
		children: [
			{ label: "归档", href: "/archive/" },
			{ label: "分类", href: "/categories/" },
			{ label: "标签", href: "/tags/" },
			{ label: "专题", href: "/series/" },
		],
	},
	{ label: "画廊", href: "/gallery/", external: true },
	{
		label: "更多",
		children: [
			{ label: "关于", href: "/about/" },
			{ label: "友链", href: "/friends/" },
			{ label: "留言板", href: "/guestbook/" },
		],
	},
];
```

> [!note]
> 本站的「画廊」标了 `external: true`——示例站把它当独立站处理。如果你的画廊就在本站 `/gallery/`，去掉 `external` 即可正常站内跳转。

## 使用效果

- 桌面端：中部横排，悬停下拉；移动端收进抽屉菜单
- 下拉子项高亮跟随当前路由（`/archive/` 下「归档」呈选中态）
- 导航栏右侧固定功能键：hue 调色面板（`huePanel.enabled`）、深浅切换、搜索
