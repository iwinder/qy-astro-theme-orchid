---
title: 赞助（sponsor）
description: sponsorConfig 完整参考——打赏方式（收款码图片/跳转链接）、资金用途说明、文章页「打赏支持」按钮与历史赞助名单时间线。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 21
---

本篇讲赞助页（`/sponsor/`）与文章页打赏按钮的配置，全部集中在 `site/src/config/sponsorConfig.ts`：
打赏方式、资金用途说明与赞助名单都写在这一个文件里。页面路由开关在 `siteConfig.pages.sponsor`，
见[独立页面](/posts/pages/)。

## 全部可配置项

```ts
// site/src/config/sponsorConfig.ts
export const sponsorConfig: ThemeConfig["sponsor"] = {
	title: "打赏",
	description: "如果内容对你有帮助，请作者喝杯茶。",
	usage: "你的打赏将用于服务器维护、内容创作与功能开发。",
	showSponsorsList: true,  // 展示赞助名单
	showButtonInPost: true,  // 文章页支持卡出现「打赏支持」按钮
	methods: [
		{
			name: "支付宝",
			icon: "",       // 图标（可选）
			image: "",      // 收款码图片路径（放 site/public/ 后填路径）
			link: "https://example.com/sponsor", // 或跳转链接
			description: "跳转链接打赏演示",
			enabled: true,
		},
	],
	sponsors: [
		{ name: "青山不改", avatar: "", amount: "¥66", date: "2026-09-01" },
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` / `description` / `usage` | `string` | — | 页面标题 / 描述 / 资金用途说明 |
| `showSponsorsList` | `boolean` | `true` | 展示历史赞助名单 |
| `showButtonInPost` | `boolean` | `true` | 文章页「打赏支持」按钮；关闭后支持卡仅保留分享海报 |
| `methods[]` | `Method[]` | `[]` | 打赏方式：`{name, icon, image, link, description, enabled}` |
| `sponsors[]` | `Sponsor[]` | `[]` | 赞助名单：`{name, avatar, amount, date}` |

两条规则：

- 每个 method 的 `image`（收款码）与 `link`（跳转）**至少配一个**，均为空渲染占位框
- 收款码图放 `site/public/` 下，`image` 填 public 路径（如 `/assets/images/sponsor/alipay.png`）

## 使用效果

- `/sponsor/` 页：标题描述 + 各打赏方式卡片（点击看收款码大图或跳转）+ 资金用途 + 赞助名单时间线
- 文章底部支持卡：分享海报按钮 + 打赏按钮（`showButtonInPost`）
