---
title: 画廊（gallery）
description: galleryConfig 完整参考——相册元数据（封面/日期地点/标签）、瀑布流列宽、构建期照片扫描（本地图片与 urls.txt 远程图）与加密相册。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 22
---

本篇讲画廊页（`/gallery/`）的配置，对应文件 `site/src/config/galleryConfig.ts`：
相册元数据与瀑布流参数写在配置里，照片本身由构建期扫描 `site/public/gallery/` 目录入库，不进配置。
页面路由开关在 `siteConfig.pages.gallery`，见[独立页面](/posts/pages/)。

## 全部可配置项

```ts
// site/src/config/galleryConfig.ts
export const galleryConfig: ThemeConfig["gallery"] = {
	title: "画廊",
	description: "用镜头收藏时间的碎片。",
	columnWidth: 240, // 瀑布流最小列宽 px
	albums: [
		{
			id: "demo-spring",              // 对应 public/gallery/<id>/ 目录名
			name: "春日山行",
			description: "清明前后入山，溪水初涨。",
			date: "2026-04-05",
			location: "杭州 · 九溪",
			tags: ["风光", "徒步"],
			// cover: "/gallery/demo-spring/cover.jpg", // 可选，封面
			// password: "secret", passwordHint: "提示", // 加密相册
		},
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` / `description` | `string` | — | 画廊页标题与描述 |
| `columnWidth` | `number` | `240` | 瀑布流最小列宽，实际列数随容器宽自适应 |
| `albums[].id` | `string` | 必填 | 对应 `site/public/gallery/<id>/` 目录 |
| `albums[].name` / `description` | `string` | 必填 / `""` | 相册名与描述 |
| `albums[].date` / `location` | `string` | `""` | 拍摄日期与地点 |
| `albums[].tags` | `string[]` | `[]` | 相册标签 |
| `albums[].cover` | `string` | `""` | 封面；留空依次取目录内 `cover.*` / 第一张照片 |
| `albums[].password` | `string` | `""` | **非空即加密相册** |
| `albums[].passwordHint` | `string` | `""` | 密码提示 |

### 照片来源（构建期扫描）

相册照片不放配置里，按 `albums[].id` 扫描 `site/public/gallery/<id>/` 目录：

1. **本地图片**：目录内图片文件直接扫描入库（建议先跑 `pnpm lqip` 生成 LQIP 占位）
2. **远程图片**：目录内放 `urls.txt`，**每行一个 URL**，与本地图片合并展示

### 加密相册

`password` 非空即加密：画廊页显示锁标记，点入需输密码（客户端校验），
`passwordHint` 显示为输入框下方的提示文字。本演示站的 `demo-secret` 相册密码为 `orchid2026`，可直接体验。

## 使用效果

- `/gallery/` 瀑布流相册墙（封面 + 名称 + 日期地点标签）
- 点入相册后照片大图浏览，本地图带 LQIP 渐进加载
- 侧栏与导航可直达（导航入口见[导航栏](/posts/navbar/)）
