---
title: 首页横幅（banner）
description: 首页横幅 bannerConfig 全部配置——多图轮换、语录 <em> 强调色、高度与暗化遮罩、homeOnly 开关、与导航入口/独立页开关的配合，附全站背景壁纸（background）。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 5
---

本篇讲首页横幅（banner）：背景图、语录文案、高度与暗化遮罩。导航栏菜单是另一套数组配置，见[导航栏](/posts/navbar/)。

**配置文件**：`site/src/config/bannerConfig.ts`

## 图像与尺寸

`src` 决定背景图，`height` 定高度，`dimOpacity` 加暗化遮罩保证白色文字可读，`position` 控制背景定位。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `src` | `string \| string[]` | `""` | 单图 URL 或**多图数组**，数组时构建期随机取一张 |
| `height` | `number` | `32` | banner 高度，占视口高度百分比（vh） |
| `dimOpacity` | `number` | `0.2` | 背景暗化遮罩不透明度 0–1，保证白色文字可读 |
| `position` | `string` | `"center"` | 背景图定位（`background-position` 取值：`center` / `top` / `bottom` 等） |

```ts
// site/src/config/bannerConfig.ts
src: "/banner.jpg", // public/banner.jpg
height: 32,
dimOpacity: 0.2,
position: "center",
```

`src` 也接受多图数组，数组时构建期随机取一张：

```ts
// site/src/config/bannerConfig.ts
src: ["/banners/spring.jpg", "/banners/summer.jpg", "/banners/autumn.jpg"],
```

每次构建随机固定一张——同一次部署内所有访客看到同一张，重新构建即换图。

## 显示范围

`enabled` 是总开关，`homeOnly` 决定横幅只出现在首页还是全站页顶。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关；`false` 时背景图与文案都不渲染 |
| `homeOnly` | `boolean` | `true` | `true` 仅首页显示，`false` 全站页顶显示 |

```ts
// site/src/config/bannerConfig.ts
enabled: true,
homeOnly: true,
```

## 文案

`quote` 是主文案，`sub` 是其下方一行副文案；`quote` 留空不渲染文案层。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `quote` | `string` | `""` | 主文案，支持 `<em>` 标签做**强调色**渲染；留空不渲染文案层 |
| `sub` | `string` | `""` | 副文案，主文案下方一行小字 |

```ts
// site/src/config/bannerConfig.ts
quote: "把日子过成诗。",
sub: "一个关于技术、阅读与日常的安静角落。",
```

`quote` 里的 `<em>` 会被主题渲染为强调色（跟随 `accentColor`）：

```ts
// site/src/config/bannerConfig.ts
quote: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
```

## 使用效果

- 首页顶部一张 32vh 高的暗化壁纸图，文字居中：主语录大字（`<em>` 部分青碧色强调）、副文案小字灰白
- 向下滚动越过 banner 后正文开始；`homeOnly: true` 时其它页面不出现
- 配合 `siteConfig.pageWidth`，banner 是全屏出血的，不受页宽约束

## 导航入口与页面开关的配合

导航项（见[导航栏](/posts/navbar/)）指向的页面由 `siteConfig.pages` 控制（见[站点基础配置](/posts/site-config/#pages-独立页开关)）。若把 `pages.gallery` 关了，记得同步删掉导航里的「画廊」项——路由不生成后，指向它的导航会得到 404。

## 全站背景壁纸（background）

banner 是页顶横幅，`background` 则是铺满视口的**全站背景壁纸**：固定不随滚动，从页缝与卡片间隙透出。两者相互独立、可同时开启。**配置文件**：`site/src/config/backgroundConfig.ts`，默认关闭。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关，`false` 时即使配了 `src` 也不渲染 |
| `src` | `string \| string[]` | `""` | 单图 URL 或多图数组（构建期随机取一张，同 banner 惯例） |
| `dimOpacity` | `number` | `0.45` | 浅色模式遮罩不透明度 0–1，压暗壁纸保证正文可读 |
| `darkDimOpacity` | `number` | `0.65` | 暗色模式遮罩不透明度 0–1，暗色下压更暗 |
| `blur` | `number` | `0` | 模糊半径 px（0–20），模糊时自动轻微放大防止边缘露底 |

```ts
// site/src/config/backgroundConfig.ts
export const background: ThemeConfig["background"] = {
	enabled: true,
	src: ["/wallpaper/a.jpg", "/wallpaper/b.jpg"],
	dimOpacity: 0.45,
	darkDimOpacity: 0.65,
	blur: 0,
};
```

要点：

- 壁纸 `position: fixed` 铺满视口、滚动不动（未用 `background-attachment: fixed`，iOS Safari 同样安全）
- 正文卡片保持不透明，壁纸从卡片间隙、页面边缘与半透明导航栏透出；壁纸加载中或失败时仍有主题底色兜底，暗色模式不会闪白
- 遮罩浅/暗各一档，切深色模式自动加深，任意壁纸下正文对比度都有保障
- 与 banner 叠用时注意「图上叠图」：壁纸偏花哨时可加大 `blur` 或 `dimOpacity` 让它退为氛围层
