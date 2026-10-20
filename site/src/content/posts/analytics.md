---
title: 站点统计（analytics）
description: 四家站点统计按需填 ID——Google Analytics / Clarity / umami / 51.la，留空零注入；另有厂商无关的 Web Vitals 通用上报（自建端点）。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 18
---

本篇覆盖站点统计的完整配置——Google Analytics、Microsoft Clarity、Umami、51.la 四家按需选配，以及厂商无关的 Web Vitals 通用上报。

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

## Web Vitals 通用上报（webVitals）

不依赖任何统计厂商：Google 官方 [web-vitals](https://github.com/GoogleChrome/web-vitals) 库采集 LCP / CLS / INP / FCP / TTFB 五项核心指标，指标就绪即 POST 到你自建的端点。`endpoint` 留空完全不注入采集代码。

```ts
// site/src/config/analyticsConfig.ts
webVitals: {
	endpoint: "",     // 上报端点（POST）；留空不采集
	siteId: "",       // 站点标识，随载荷上报（多站共用端点时区分来源）
	sampleRate: 1,    // 采样率 0-1，默认全量
	debug: false,     // 控制台打印载荷（调试用）
},
```

载荷为 JSON（以 `text/plain` 发送，免 CORS 预检）：

```json
{
	"name": "LCP",        // 指标名 LCP / CLS / INP / FCP / TTFB
	"value": 1234,        // 该次会话的值（ms；CLS 为无量纲小数）
	"rating": "good",     // "good" | "needs-improvement" | "poor"
	"delta": 1234,
	"id": "v6-…",         // 指标会话唯一 ID（去重用）
	"navType": "navigate",
	"path": "/posts/foo/",
	"site": "my-site"
}
```

端点最小实现（任意 Serverless/自建服务，返回 204 即可）：

```js
// 例：Node http
req.on("data", () => {});
req.on("end", () => res.writeHead(204).end());
```

注意：

- 发送走 `navigator.sendBeacon`，排队失败回退 `fetch keepalive`——页面关闭瞬间也能送达
- 指标以**整文档**口径采集：开启视图过渡（ClientRouter）软导航不重置会话，TTFB/FCP 仅首载有意义，LCP/CLS/INP 反映整个文档生命周期
- demo 站默认不开启（无真实端点，指向占位地址只会刷控制台报错）

## 使用效果

- 填入 ID 重新构建后，对应统计脚本注入全站页面；留空的完全不注入
- umami 回放与 51.la 录屏默认关闭，开启前请评估隐私合规
