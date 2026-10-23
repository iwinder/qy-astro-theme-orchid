---
title: 公告（announcement）
image: api
description: 侧栏公告卡完整配置——标题、正文、可选跳转按钮与关闭行为，content 留空即整卡不渲染。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 17
---

公告是一个**侧栏小组件**：挂载与开关在 `site/src/config/sidebarConfig.ts` 的 `widgets` 数组（`type: "announcement"`）。组件挂载见[侧边栏与小组件](/posts/sidebar/)。

**配置文件**：`site/src/config/announcementConfig.ts`

## 公告卡

公告卡的标题、正文、可选跳转按钮与关闭行为：

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` | `string` | — | 公告卡标题 |
| `content` | `string` | `""` | 公告正文；**留空则整卡不渲染** |
| `link` | `{text, url, external}` | — | 可选跳转按钮，`external: true` 新窗口 |
| `closable` | `boolean` | `true` | 显示关闭按钮（仅前台隐藏，刷新恢复） |

```ts
// site/src/config/announcementConfig.ts
export const announcementConfig: ThemeConfig["announcement"] = {
	title: "公告",
	content: "主题已支持公告栏、广告位与站点统计，欢迎体验。",
	link: { text: "了解更多", url: "/about/", external: false },
	closable: true,
};
```

配合侧栏 widget 使用：`sidebarConfig.widgets` 里的 `{ type: "announcement", enabled: true }`（见[侧边栏与小组件](/posts/sidebar/)）。
