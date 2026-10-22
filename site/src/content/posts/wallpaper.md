---
title: 壁纸（wallpaper）
description: 统一壁纸 wallpaperConfig 全部配置——横幅/全屏/覆盖透明/纯色四种模式、访客模式切换按钮、视频壁纸、图片轮播动效、首页标题打字机、导航栏透明档与底部波浪渐变装饰。
published: 2026-10-22
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 5
---

本篇讲统一壁纸（wallpaper）：横幅、全屏、覆盖透明、纯色四种模式共用一套配置，首页标题文案也在这里。导航栏菜单是另一套数组配置，见[导航栏](/posts/navbar/)。

**配置文件**：`site/src/config/wallpaperConfig.ts`

> v0.4 起原 `banner`（首页横幅）与 `background`（全站背景）合并为统一的 `wallpaper`，旧两段配置不再读取。

## 四种壁纸模式

`mode` 决定壁纸的呈现形态，也决定它出现在哪些页面上。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mode` | `"banner" \| "fullscreen" \| "overlay" \| "none"` | `"banner"` | `banner` 横幅壁纸（导航栏下方定高区域）/ `fullscreen` 铺满首屏 / `overlay` 覆盖透明（固定垫底，内容卡片半透明透出）/ `none` 纯色背景 |
| `switchable` | `boolean` | `false` | 导航栏露出**模式切换按钮**，访客可在四模式间循环切换（localStorage 记忆，优先于配置值） |

```ts
// site/src/config/wallpaperConfig.ts
mode: "banner",
switchable: true,
```

## 图源

`src.desktop` 是桌面端壁纸，`src.mobile` 是移动端壁纸（未配置时回退桌面图）。多图且未开轮播时构建期随机取一张。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `src.desktop` | `string[]` | `[]` | 桌面端壁纸图列表，为空则不渲染壁纸 |
| `src.mobile` | `string[]` | `[]` | 移动端壁纸图列表（≤767px 生效），空则复用桌面图 |

图源支持三种写法：`/` 开头的 public 绝对路径、`https://` 外链，或相对站点 `src/` 的相对路径（构建期自动解析 `src/assets` 下的图片并参与打包优化）。

```ts
// site/src/config/wallpaperConfig.ts
src: {
	desktop: ["/gallery/demo-spring/photo-01.png"],
	mobile: [],
	playerUrl: [],
},
```

## 视频壁纸

`playerEnable` 开启后自动播放 `src.playerUrl` 里的视频（静音循环，覆盖在图片层之上）；多段视频可配 `playerMode` 顺序或随机起播。视频源仅支持 public 绝对路径与外链，不参与构建期解析。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `playerEnable` | `boolean` | `false` | 视频壁纸总开关，`src.playerUrl` 非空才生效 |
| `src.playerUrl` | `string[]` | `[]` | 视频源列表；多段时导航栏出现上一段/下一段按钮 |
| `common.playerMode` | `"order" \| "random"` | `"random"` | 起播视频选取方式 |

## 首页文案（homeText）

横幅/全屏模式下壁纸中央可放标题与副标题；壁纸关闭（`none`/无图）时文案退回列表上方独立区块。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enable` | `boolean` | `true` | 文案总开关 |
| `title` | `string` | `""` | 主标题，支持 `<em>` 标签做**强调色**渲染 |
| `titleSize` | `string` | `"3.8rem"` | 主标题字号 |
| `subtitle` | `string \| string[]` | `[]` | 副标题，数组多条配合打字机轮播 |
| `subtitleSize` | `string` | `"1.5rem"` | 副标题字号 |
| `typewriter.enable` | `boolean` | `true` | 打字机效果（`subtitle` 为多条数组时逐条打出/删除/轮换） |
| `typewriter.speed` / `deleteSpeed` / `pauseTime` | `number` | `100` / `50` / `2000` | 打字 / 删除间隔与打完停顿（ms） |

```ts
// site/src/config/wallpaperConfig.ts
homeText: {
	enable: true,
	title: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
	subtitle: ["一个关于技术、阅读与日常的安静角落。"],
	typewriter: { enable: true, speed: 100, deleteSpeed: 50, pauseTime: 2000 },
},
```

## 轮播与动效

多图时可开轮播，`transitionEffect` 提供四种切换动效；`kenburns` / `zoom` 的动画时长自动与轮播间隔对齐。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `carousel.enable` | `boolean` | `false` | 多图轮播开关（关闭时随机取一张静态图） |
| `carousel.interval` | `number` | `5000` | 轮播间隔 ms（最小 1000） |
| `carousel.transitionEffect` | `"fade" \| "zoom" \| "slide" \| "kenburns"` | `"fade"` | 切换动效 |
| `common.waves` | `boolean \| { desktop, mobile }` | `false` | 底部双层波浪动画装饰 |
| `common.gradient` | `boolean \| { desktop, mobile, height }` | `false` | 底缘渐变压暗，承托波浪与文案 |

## 导航栏透明档

壁纸可见时（`banner`/`fullscreen`）导航栏不再固定实底，可按喜好选透明档；滚动过阈值自动回实底，移动菜单展开时强制实底保证可读。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `common.navbar.transparentMode` | `"semi" \| "semifull" \| "full"` | `"semi"` | `semi` 顶部半透明 / `semifull` 滚动前全透明 / `full` 始终全透明 |
| `common.navbar.enableBlur` + `blur` | `boolean` + `number` | `true` + `5` | 半透明档的背景模糊半径 px |
| `common.dimOpacity` / `darkDimOpacity` | `number` | `0.2` / `0.65` | 壁纸暗化遮罩（浅色/暗色模式各一档），保证前景可读 |

## 横幅与全屏参数

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `banner.height` | `number` | `60` | 横幅高度，占视口高度百分比（vh） |
| `banner.homeOnly` | `boolean` | `true` | 仅对 `banner`/`fullscreen` 生效：`true` 只在首页显示，其它页面不渲染 |
| `banner.position` / `fullscreen.position` | `string` | `"center"` | 背景图定位（`object-position` 取值：`center` / `top` / `bottom` 等） |

## 覆盖透明模式（overlay）

`overlay` 把壁纸固定垫在整个页面底层（不随滚动），内容卡片变半透明透出壁纸，是四模式里「沉浸感」最强的一档。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `overlay.opacity` | `number` | `0.8` | 壁纸整体不透明度 0–1 |
| `overlay.blur` | `number` | `0` | 模糊半径 px（0–20），模糊时自动轻微放大防止边缘露底 |
| `overlay.cardOpacity` | `number` | `0.5` | 内容卡片不透明度 0–1，越小壁纸透出越明显 |
| `overlay.zIndex` | `number` | `-1` | 壁纸层叠顺序，一般无需改动 |

## 使用效果

- `banner`：首页顶部一张 60vh 高的暗化壁纸，标题大字（`<em>` 强调色）居中，滚过即正文
- `fullscreen`：壁纸铺满整个首屏，滚动后正文滑入
- `overlay`：全站固定壁纸垫底，卡片半透明，页面处处透出壁纸
- `switchable: true` 时访客随时点导航栏按钮切模式，偏好全站记忆
