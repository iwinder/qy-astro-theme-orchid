---
title: 首页横幅（banner）
description: 首页横幅 bannerConfig 全部配置——多图轮换、语录 <em> 强调色、高度与暗化遮罩、homeOnly 开关，以及与导航入口、独立页开关的配合。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 5
---

本篇讲首页横幅（banner）：背景图、语录文案、高度与暗化遮罩，配置在独立文件 `site/src/config/bannerConfig.ts`。导航栏菜单是另一套数组配置，见[导航栏](/posts/navbar/)。

## 快速上手

```ts
// site/src/config/bannerConfig.ts
export const banner: ThemeConfig["banner"] = {
	enabled: true,
	src: "/banner.jpg", // public/banner.jpg
	quote: "把日子过成诗。",
};
```

## 全部可配置项

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关；`false` 时背景图与文案都不渲染 |
| `src` | `string \| string[]` | `""` | 单图 URL 或**多图数组**，数组时构建期随机取一张 |
| `height` | `number` | `32` | banner 高度，占视口高度百分比（vh） |
| `dimOpacity` | `number` | `0.2` | 背景暗化遮罩不透明度 0–1，保证白色文字可读 |
| `position` | `string` | `"center"` | 背景图定位（`background-position` 取值：`center` / `top` / `bottom` 等） |
| `homeOnly` | `boolean` | `true` | `true` 仅首页显示，`false` 全站页顶显示 |
| `quote` | `string` | `""` | 主文案，支持 `<em>` 标签做**强调色**渲染；留空不渲染文案层 |
| `sub` | `string` | `""` | 副文案，主文案下方一行小字 |

## 多图随机

```ts
src: ["/banners/spring.jpg", "/banners/summer.jpg", "/banners/autumn.jpg"],
```

每次构建随机固定一张——同一次部署内所有访客看到同一张，重新构建即换图。

## 语录强调

`quote` 里的 `<em>` 会被主题渲染为强调色（跟随 `accentColor`）：

```ts
quote: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
```

## 使用效果

- 首页顶部一张 32vh 高的暗化壁纸图，文字居中：主语录大字（`<em>` 部分青碧色强调）、副文案小字灰白
- 向下滚动越过 banner 后正文开始；`homeOnly: true` 时其它页面不出现
- 配合 `siteConfig.pageWidth`，banner 是全屏出血的，不受页宽约束

## 导航入口与页面开关的配合

导航项（见[导航栏](/posts/navbar/)）指向的页面由 `siteConfig.pages` 控制（见[站点基础配置](/posts/site-config/#pages-独立页开关)）。若把 `pages.gallery` 关了，记得同步删掉导航里的「画廊」项——路由不生成后，指向它的导航会得到 404。
