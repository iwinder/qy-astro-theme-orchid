---
title: 悬浮音乐播放器（music）
description: musicConfig 悬浮音乐播放器全量配置——悬浮球位置、音量、播放模式、歌词面板与播放列表，跨页不断播。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 13
---

本篇覆盖悬浮音乐播放器的全部配置；
模块默认关闭，未出现的字段都有主题默认值兜底。

**配置文件**：`site/src/config/musicConfig.ts`

## 播放器配置

自研播放内核（audio + LRC 解析），**跨页不断播**——SPA 式保活，翻页不重置进度。
zIndex 255，高于看板娘与返回顶部按钮。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `position` | `"left" \| "right"` | `"left"` | 悬浮球停靠侧 |
| `volume` | `number` | `0.7` | 初始音量 |
| `playMode` | `"list" \| "one" \| "random"` | `"list"` | 播放模式 |
| `showLyrics` | `boolean` | `true` | 歌词面板 |
| `playlist` | `Track[]` | `[]` | 播放列表 |

```ts
// site/src/config/musicConfig.ts
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

### 播放列表

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `playlist[].name` / `artist` | `string` | 必填 | 曲名 / 艺术家 |
| `playlist[].url` | `string` | 必填 | 音频地址 |
| `playlist[].cover` | `string` | `""` | 封面图 |
| `playlist[].lrc` | `string` | `""` | 歌词三种形态：`.lrc` 文件路径 / 内联 LRC 文本 / 不配置即无歌词 |

## 使用效果

- 音乐：左下角悬浮球，点开歌词面板；切页不断播
