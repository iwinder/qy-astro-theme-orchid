---
title: PWA（可安装与离线访问）
image: api
description: pwaConfig 完整参考——构建期生成 manifest 与手写 Service Worker，站点可安装、离线兜底、三条缓存策略与发布即换缓存机制。
published: 2026-10-20
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 31
---

本篇讲 PWA 配置：开启后构建期产出 `/manifest.webmanifest` 清单与 `/sw.js` Service Worker（手写实现，**零运行时依赖**），站点可安装到桌面 / 主屏，断网时已访问过的页面仍可打开。

**配置文件**：`site/src/config/pwaConfig.ts`

## 配置项

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关：false 时两路由不生成，head 无 manifest 链接与注册脚本，零痕迹 |
| `name` | `string` | `""` | 安装后的应用名，留空回落站点 `title` |
| `shortName` | `string` | `""` | 启动器短名，留空回落 `name` |
| `description` | `string` | `""` | 应用描述，留空回落站点 `description` |
| `themeColor` | `string` | `"#f6f4ef"` | 清单 theme_color：安装 UI / 标题栏着色 |
| `backgroundColor` | `string` | `"#f6f4ef"` | 清单 background_color：启动画面底色 |
| `display` | `"standalone" \| "fullscreen" \| "minimal-ui" \| "browser"` | `"standalone"` | 显示形态，standalone 即独立应用窗口 |
| `icons` | `{ src, sizes?, type?, purpose? }[]` | `[]` | 图标清单（`public/` 下路径） |

`themeColor` / `backgroundColor` 默认值与主题浅色画布同源，视觉上无割裂；它们只作用于安装后的应用外壳，**不影响**网页自身的 theme-color meta。

```ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const pwa: ThemeConfig["pwa"] = {
	enabled: true,
	name: "清言集",
	shortName: "清言",
	display: "standalone",
	icons: [
		{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
		{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
	],
};
```

## 可安装性

浏览器判定「可安装」要求清单至少提供 **192x192 与 512x512 各一张**图标。把图标放进 `public/`，`src` 写根路径即可：

- `purpose: "any"`：常规图标，各处直接显示
- `purpose: "maskable"`：容错图标，Android 等平台安装后会按设备形状裁切——四边留足安全边距再出图

## 缓存策略

Service Worker 按资源类型分流（`/api/` 与 `/og/` 一律直连不缓存——前者是随机数据，后者是按文章数增长的分享图）：

| 请求类型 | 策略 | 说明 |
|---|---|---|
| 页面导航 | network-first | 联网时永远拿最新页并回填缓存；断网回落缓存，仍没有则兜底打开首页 |
| `/_astro/` 静态产物 | cache-first | 文件名带内容哈希，内容变即名字变，缓存永不过期 |
| 其余同源 GET | stale-while-revalidate | 先回缓存、后台静默更新；缓存桶超 60 条删最早一条防膨胀 |

## 发布即换缓存

SW 缓存名带**构建号**（如 `orchid-pwa-mvgvc3fc`）。每次重新构建部署，所有访客的旧缓存会在下次访问时被整体清空、换成新构建的产物——不需要你维护任何版本号，也不存在「改了样式用户看不到」的缓存顽疾。

## 注意事项

- 开启后访客浏览器会由 SW 接管缓存，**开发调试时**若发现页面不新鲜，在 DevTools → Application → Service Workers 勾选 Update on reload 或 Bypass for network 即可
- SW 只在 **HTTPS**（或 localhost）下生效
- 主题假定站点部署在**根路径**，`start_url` / `scope` 与 SW 拦截范围均以站点根为基准，子路径部署不在支持范围内

## demo 站为何不开

与[追番页](/posts/bangumi/)同属惯例例外：SW 会以构建为单位接管访客浏览器缓存，demo 站频繁重建预览时，旧 SW 缓存会干扰预览新鲜度。真实部署站开启即可，本地体验可临时改 `enabled: true` 后重启 dev server。
