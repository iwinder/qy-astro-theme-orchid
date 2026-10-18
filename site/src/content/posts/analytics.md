---
title: 站点统计（analytics）
description: 四家站点统计按需填 ID——Google Analytics / Clarity / umami / 51.la，留空零注入，含 umami 会话回放与 51.la 录屏全字段。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 18
---

本篇覆盖站点统计的完整配置——Google Analytics、Microsoft Clarity、Umami、51.la 四家按需选配。

**配置文件**：`site/src/config/analyticsConfig.ts`

## 顶层配置

四家统计按需填 ID，**留空即不注入对应脚本**（零副作用）：

```ts
// site/src/config/analyticsConfig.ts
export const analyticsConfig: ThemeConfig["analytics"] = {
	googleAnalyticsId: "",      // Google Analytics（G-XXXX）
	microsoftClarityId: "",     // Microsoft Clarity 项目 ID
};
```

## Umami

官方云或自建均可：

```ts
// site/src/config/analyticsConfig.ts
umami: {
	websiteId: "",            // Website ID
	scriptUrl: "https://cloud.umami.is/script.js",           // 自建时替换
	replaysScriptUrl: "https://cloud.umami.is/script.replays.js",
	trackOutboundLinks: true, // 追踪出站链接
	collectWebVitals: false,  // 收集 Web Vitals（自建需 v2.9+）
	replays: {
		enabled: false,         // 会话回放（Live）
		sampleRate: 0.15,       // 录制采样率 0-1（0.15 = 15% 会话）
		maskLevel: "moderate",  // 隐私遮罩："moderate" 遮输入框 / "strict" 额外遮全部文本
		maxDuration: 300000,    // 单次录制最大时长 ms
		blockSelector: "",      // 排除录制的元素 CSS 选择器
	},
},
```

## 51.la

`id` 填站点 ID（CK 编码）：

```ts
// site/src/config/analyticsConfig.ts
la51: {
	id: "",               // 站点 ID（CK 编码）
	sdkUrl: "",           // 自定义 SDK 地址（防 DNS 污染），留空用默认
	ck: "",               // 多统计 ID 的数据分离标识，留空用 id
	autoTrack: true,      // 事件分析
	hashMode: false,      // Hash 路由模式（本项目 History 路由，保持 false）
	screenRecord: true,   // 网站录屏
},
```

## 使用效果

- 填入 ID 重新构建后，对应统计脚本注入全站页面；留空的完全不注入
- umami 回放与 51.la 录屏默认关闭，开启前请评估隐私合规
