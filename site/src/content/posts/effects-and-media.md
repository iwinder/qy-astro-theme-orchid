---
title: 视觉特效与媒体：sakura / music / live2d / fonts 配置
description: appearanceConfig 的四个视觉模块全量配置——樱花飘落粒子、悬浮音乐播放器、Live2D 看板娘（模型/菜单/气泡全键）与字体加载（六种 provider）。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesOrder: 7
---

`appearanceConfig.ts` 收纳页面的"装饰与常驻悬浮件"：banner（见[导航栏与首页横幅](/posts/nav-and-banner/)）、
樱花特效、音乐播放器、看板娘、字体。所有模块默认关闭（fonts 除外），
未出现的字段都有主题默认值兜底。

## 樱花飘落（sakura）

```ts
export const sakura: ThemeConfig["sakura"] = {
	enabled: false,
	density: 24, // 每屏花瓣数
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `density` | `number` | `24` | 花瓣密度（同屏数量），配合屏幕宽度缩放 |

全站 canvas 粒子，花瓣**程序化绘制**（零贴图资产）；系统开启
`prefers-reduced-motion` 时自动停用，无障碍友好。

## 悬浮音乐播放器（music）

### 全部可配置项

```ts
export const music: ThemeConfig["music"] = {
	enabled: false,
	position: "left",    // 悬浮球位置 "left" | "right"
	volume: 0.7,         // 初始音量 0-1
	playMode: "list",    // "list" 列表循环 | "one" 单曲循环 | "random" 随机
	showLyrics: true,    // 显示歌词面板
	playlist: [
		{
			name: "晨光序曲",
			artist: "SoundHelix",
			url: "/music/a.mp3",       // 音频地址（本地 public 或外链）
			cover: "/music/cover-a.jpg", // 封面图，可选
			lrc: "/music/a.lrc",       // 歌词，可选（三种形态见下）
		},
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `position` | `"left" \| "right"` | `"left"` | 悬浮球停靠侧 |
| `volume` | `number` | `0.7` | 初始音量 |
| `playMode` | `"list" \| "one" \| "random"` | `"list"` | 播放模式 |
| `showLyrics` | `boolean` | `true` | 歌词面板 |
| `playlist` | `Track[]` | `[]` | 播放列表 |
| `playlist[].name` / `artist` | `string` | 必填 | 曲名 / 艺术家 |
| `playlist[].url` | `string` | 必填 | 音频地址 |
| `playlist[].cover` | `string` | `""` | 封面图 |
| `playlist[].lrc` | `string` | `""` | 歌词三种形态：`.lrc` 文件路径 / 内联 LRC 文本 / 不配置即无歌词 |

自研播放内核（audio + LRC 解析），**跨页不断播**——SPA 式保活，翻页不重置进度。
zIndex 255，高于看板娘与返回顶部按钮。

## Live2D 看板娘（live2d）

### 全部可配置项

```ts
export const live2d: ThemeConfig["live2d"] = {
	enabled: false,
	model: { path: "https://model.hacxy.cn/cat-black/model.json" },
	position: "bottom-right",
	tips: {
		enable: true,
		welcomeMessage: ["欢迎来到清言集～", "今天也辛苦啦"],
		messages: ["去喝杯水，休息一下吧", "喜欢这篇文章的话留个言吧～"],
		duration: 3000,  // 每条气泡显示时长 ms
		interval: 6000,  // 轮播间隔 ms
	},
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `model` | `object \| object[]` | — | 单模型对象或多模型**数组** |
| `model.path` | `string` | 必填 | model.json 地址（本地 public 或 CDN） |
| `model.volume` | `number` | 库默认 | 语音音量 |
| `model.scale` / `x` / `y` | `number` | 库默认 | 缩放与位移微调 |
| `position` | `string` | `"bottom-right"` | 停靠位（四角可选） |
| `size` | `number` | 库默认 | 画布尺寸 |
| `primaryColor` | `string` | 库默认 | 主题强调色联动 |
| `transitionDuration` / `transitionType` | `number` / `string` | 库默认 | 模型切换过渡 |
| `menus.items` | `Menu[]` | 默认三键 | 自定义菜单按钮 `{icon, label, action, url}` |
| `menus.align` | `string` | 库默认 | 菜单排列方向 |
| `tips.enable` | `boolean` | `true` | `false` 显式关闭气泡 |
| `tips.welcomeMessage` | `string[]` | 库默认 | 进入页面欢迎语（随机抽一条） |
| `tips.messages` | `string[]` | 库默认 | 闲置轮播语 |
| `tips.duration` / `interval` | `number` | `3000` / `6000` | 气泡显示时长 / 轮播间隔 ms |
| `tips.offset` / `typing` | `number` / `boolean` | 库默认 | 气泡位移 / 打字机效果 |
| `responsive.hideOnMobile` | `boolean` | `true` | 移动端隐藏 |
| `responsive.mobileBreakpoint` | `number` | `768` | 移动端断点 px |
| `zIndex` | `number` | `240` | 层级（低于返回顶部 250 / 音乐悬浮球 255） |

要点：

- `model` 传**数组**时，可经菜单 `action: "switchModel"` 在多模型间轮换
- `menus` 不配置时用默认三键（主页 / 回顶部 / 休眠）
- `tips` 整体不配置时用库默认气泡

## 字体（fonts）

基于 **Astro Fonts API** 构建期加载，数组配置多字体：

```ts
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

- 樱花：开启后全站飘落程序化花瓣，不挡交互（canvas pointer-events none）
- 音乐：左下角悬浮球，点开歌词面板；切页不断播
- 看板娘：右下角立绘 + 欢迎气泡 + 三键菜单；手机端自动隐藏
- 字体：正文西文 Inter、中文系统黑体栈；标题/代码角色可分别指定字体
