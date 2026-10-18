---
title: 樱花特效（sakura）
description: sakuraConfig 樱花飘落特效配置——总开关与花瓣密度两个键，程序化绘制零贴图资产，尊重系统无障碍偏好。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 12
---

本篇覆盖樱花飘落特效的全部配置；
模块默认关闭，未出现的字段都有主题默认值兜底。

**配置文件**：`site/src/config/sakuraConfig.ts`

## 樱花配置

全站 canvas 粒子，花瓣**程序化绘制**（零贴图资产）；系统开启
`prefers-reduced-motion` 时自动停用，无障碍友好。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `density` | `number` | `24` | 花瓣密度（同屏数量），配合屏幕宽度缩放 |

```ts
// site/src/config/sakuraConfig.ts
export const sakura: ThemeConfig["sakura"] = {
	enabled: false,
	density: 24, // 每屏花瓣数
};
```

## 使用效果

- 樱花：开启后全站飘落程序化花瓣，不挡交互（canvas pointer-events none）
