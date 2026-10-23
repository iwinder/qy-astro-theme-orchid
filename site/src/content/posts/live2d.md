---
title: Live2D 看板娘（live2d）
image: api
description: live2dConfig 看板娘全部配置——模型（单模型/多模型数组）、停靠位、自定义菜单与气泡提示全键参考。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 14
---

本篇覆盖 Live2D 看板娘的全部配置——模型、停靠位、菜单与气泡提示；
模块默认关闭，未出现的字段都有主题默认值兜底。

**配置文件**：`site/src/config/live2dConfig.ts`

## 模型与位置

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
| `zIndex` | `number` | `240` | 层级（低于返回顶部 250 / 音乐悬浮球 255） |

```ts
// site/src/config/live2dConfig.ts
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

- `model` 传**数组**时，可经菜单 `action: "switchModel"` 在多模型间轮换

## 自定义菜单（menus）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `menus.items` | `Menu[]` | 默认三键 | 自定义菜单按钮 `{icon, label, action, url}` |
| `menus.align` | `string` | 库默认 | 菜单排列方向 |

- `menus` 不配置时用默认三键（主页 / 回顶部 / 休眠）

## 气泡（tips）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `tips.enable` | `boolean` | `true` | `false` 显式关闭气泡 |
| `tips.welcomeMessage` | `string[]` | 库默认 | 进入页面欢迎语（随机抽一条） |
| `tips.messages` | `string[]` | 库默认 | 闲置轮播语 |
| `tips.duration` / `interval` | `number` | `3000` / `6000` | 气泡显示时长 / 轮播间隔 ms |
| `tips.offset` / `typing` | `number` / `boolean` | 库默认 | 气泡位移 / 打字机效果 |

- `tips` 整体不配置时用库默认气泡

## 响应式（responsive）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `responsive.hideOnMobile` | `boolean` | `true` | 移动端隐藏 |
| `responsive.mobileBreakpoint` | `number` | `768` | 移动端断点 px |

## 使用效果

- 看板娘：右下角立绘 + 欢迎气泡 + 三键菜单；手机端自动隐藏
