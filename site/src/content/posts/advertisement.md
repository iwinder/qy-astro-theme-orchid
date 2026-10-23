---
title: 侧栏广告位（advertisement）
image: api
description: 侧栏广告位全量配置——广告图、文案、跳转按钮、展示次数限制与到期自动下线，默认关闭按需开启。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 19
---

广告位与公告一样是**侧栏小组件**：挂载与开关在 `site/src/config/sidebarConfig.ts` 的 `widgets` 数组（`type: "advertisement"`）。组件挂载见[侧边栏与小组件](/posts/sidebar/)。

**配置文件**：`site/src/config/advertisementConfig.ts`

## 广告位

默认关闭，完整形态：

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `title` | `string` | `"广告"` | 卡片标题 |
| `image` / `imageLink` / `imageAlt` | `string` | `""` | 广告图 / 点击链接 / 替代文本 |
| `content` | `string` | `""` | 文字广告文案 |
| `link` | `{text, url, external}` | — | 底部跳转按钮 |
| `closable` | `boolean` | `true` | 可关闭（仅前台隐藏） |
| `displayCount` | `number` | `-1` | `-1` 不限次数；`>0` 限制总展示次数 |
| `expireDate` | `string` | `""` | 到期日期（YYYY-MM-DD），过期自动下线 |

```ts
// site/src/config/advertisementConfig.ts
export const advertisementConfig: ThemeConfig["advertisement"] = {
	enabled: true,
	title: "广告",
	image: "/assets/images/ad/banner.png",  // 广告图（public 路径或外链）
	imageLink: "https://example.com",       // 图片点击跳转
	imageAlt: "广告",
	content: "一句话广告文案",
	link: { text: "查看详情", url: "https://example.com", external: true },
	closable: true,
	displayCount: -1,          // >0 时限制总展示次数（前台关闭计数）
	expireDate: "2027-12-31",  // 过期自动下线
};
```

配合 `sidebarConfig.widgets` 的 `{ type: "advertisement" }` 渲染在侧栏（见[侧边栏与小组件](/posts/sidebar/)）。
