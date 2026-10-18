---
title: 字体（fonts）
description: fontConfig 字体加载配置——基于 Astro Fonts API 构建期加载，六种 provider 与三角色映射全键参考。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 15
---

本篇覆盖字体加载的全部配置，对应配置文件 `site/src/config/fontConfig.ts`；
未出现的字段都有主题默认值兜底。

## 全部可配置项

基于 **Astro Fonts API** 构建期加载，数组配置多字体：

```ts
// site/src/config/fontConfig.ts
export const fonts: ThemeConfig["fonts"] = [
	{
		name: "Inter",
		cssVariable: "--font-inter",
		provider: "fontsource",
		weights: [400, 700],
		styles: ["normal", "italic"],
		subsets: ["latin"],
		fallbacks: ["sans-serif"],
		preload: true,
		role: "body",
	},
];
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `name` | `string` | 必填 | 字体名 |
| `cssVariable` | `string` | 必填 | 生成的 CSS 变量名 |
| `provider` | `string` | — | 六选一：`google` / `fontsource` / `local` / `bunny` / `fontshare` / `npm` |
| `weights` | `number[]` | `[]` | 字重 |
| `styles` | `string[]` | `[]` | `"normal"` / `"italic"` |
| `subsets` | `string[]` | `[]` | 字符子集 |
| `fallbacks` | `string[]` | `[]` | 回退字体栈 |
| `display` | `string` | 库默认 | `font-display` 策略 |
| `preload` | `boolean` | `false` | 首屏预载字体文件 |
| `role` | `"body" \| "display" \| "mono"` | — | 映射到主题三角色 |
| `options.variants` | `Variant[]` | — | **仅 `provider: "local"`**：`{src, weight, style}` 声明本地字体文件 |

`role` 的映射规则**保留原角色回退栈**——如上例 Inter 只覆盖 latin 子集，
正文中的数字与西文用 Inter，中文回落 PingFang SC / 微软雅黑，
两者无缝混排。示例站构建时还会执行 `subset-fonts.mjs` 对中文字体做子集化（见[快速开始](/posts/getting-started/#常用命令)）。

## 使用效果

- 字体：正文西文 Inter、中文系统黑体栈；标题/代码角色可分别指定字体
