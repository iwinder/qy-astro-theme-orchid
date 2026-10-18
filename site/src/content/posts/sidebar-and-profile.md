---
title: 侧边栏与个人资料：sidebar / profile / license 配置
description: 侧栏 widget 数组体系（九种组件、公共显隐配置、粘性定位）、资料卡全部字段与社交图标三种写法、文章版权声明配置。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesOrder: 4
---

侧边栏是主题里可玩性最高的模块：**九种 widget 以数组声明**，类型、顺序、显隐、
粘性定位全部可配。资料卡（profile）与版权声明（license）是它的两个配套模块。

## 侧边栏体系

### 快速上手

```ts
// site/config/sidebarConfig.ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const sidebarConfig: ThemeConfig["sidebar"] = {
	onPost: true, // 文章页启用侧栏（false 时文章页退回悬浮目录）
	widgets: [
		{ type: "profile" },
		{ type: "categories", position: "sticky" },
		{ type: "tags", position: "sticky", specificConfig: { count: 12 } },
	],
};
```

### 顶层配置

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `onPost` | `boolean` | `true` | 文章页是否启用侧栏；`false` 时文章页用悬浮目录替代 |
| `widgets` | `WidgetItem[]` | 主题默认九件套 | **数组整体覆写**主题默认 widgets（见下方注意） |

> [!note]
> `widgets` 数组是**整体覆写**语义，不是合并：只要写了 `widgets`，主题默认的那套就不生效；
> 且非默认字段（如 `position: "sticky"`）必须显式声明，item 内层默认值不继承主题默认。

### 公共配置（每个 widget 项上）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `type` | `WidgetType` | 必填 | 九选一，见下表 |
| `enabled` | `boolean` | `true` | 置 `false` 后该组件在**所有页面**都不渲染 |
| `showOnPost` | `boolean` | `true` | 置 `false` → 仅首页/列表页显示，文章页不出现 |
| `postOnly` | `boolean` | `false` | 置 `true` → 仅文章页显示（如 toc），列表页不出现 |
| `hideOnMobile` | `boolean` | 按 widget | `<768px` 隐藏（calendar/toc 默认 true） |
| `position` | `"top" \| "sticky"` | `"top"` | `sticky` 渲染进粘性容器，≥768px 跟随滚动 |
| `specificConfig` | `object` | `{}` | 该 widget 的专属参数，收在一处 |

两个显隐方向（`showOnPost: false` 与 `postOnly: true`）都缺省时，列表页与文章页侧栏都显示。

### 九种 widget 与专属配置

| type | 组件 | specificConfig 专属键 |
|---|---|---|
| `profile` | 个人资料卡 | 内容在 profileConfig.ts（见下节） |
| `announcement` | 公告卡 | 内容在 announcementConfig.ts（见[评论公告统计广告](/posts/comment-and-analytics/)） |
| `calendar` | 日历卡 | `postTooltip: boolean` — 日历下方文章条目悬停显示全文 title |
| `categories` | 分类卡 | 无 |
| `tags` | 标签卡 | `count: number` — 展示的热门标签数量，`0` = 全部，超出收进「…更多」 |
| `friends` | 友链卡 | `count: number` 展示数量；`random: boolean` 每次构建随机取样 |
| `toc` | 文章目录 | 仅文章页渲染（列表页无目录可展示） |
| `siteInfo` | 站点信息卡 | 无（已运行天数来自 `siteConfig.since`） |
| `advertisement` | 公告位广告 | 内容在 advertisementConfig.ts |

### 本站示例

```ts
export const sidebarConfig: ThemeConfig["sidebar"] = {
	onPost: true,
	widgets: [
		{ type: "profile", enabled: true },
		{ type: "announcement", enabled: false }, // 公告卡关闭
		{ type: "calendar", enabled: true, hideOnMobile: true, position: "sticky",
		  specificConfig: { postTooltip: false } },
		{ type: "categories", enabled: true, position: "sticky" },
		{ type: "tags", enabled: true, position: "sticky",
		  specificConfig: { count: 12 } },
		{ type: "friends", enabled: true, position: "sticky",
		  specificConfig: { count: 3, random: false } },
		{ type: "toc", postOnly: true, enabled: true, hideOnMobile: true, position: "sticky" },
		{ type: "siteInfo", enabled: true, position: "sticky" },
		{ type: "advertisement", enabled: true, position: "sticky" },
	],
};
```

### 使用效果

- 首页/列表页：profile → categories → tags → friends → siteInfo → advertisement 依次竖排
- 文章页：同列基础上**额外**插入 toc 目录卡（`postOnly`），announcement 仍隐藏
- 日历、toc 在手机上不渲染；`position: "sticky"` 的卡片在宽屏下随滚动保持可见
- 调整 widgets 顺序 = 调整卡片渲染顺序；删掉某项 = 该卡从全站消失

## 个人资料卡（profile）

### 全部可配置项

```ts
// site/config/profileConfig.ts
export const profileConfig: ThemeConfig["profile"] = {
	avatar: "",            // 头像 URL；留空渲染昵称首字字头像
	name: "windcoder",     // 昵称
	bio: "写点技术，也写点生活。",
	url: "/about/",        // 头像/昵称点击跳转，留空不包链接
	links: [
		{ name: "GitHub", url: "https://github.com/iwinder", icon: "github", showName: false },
		{ name: "邮箱", url: "mailto:hello@example.com", icon: "email", showName: false },
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `avatar` | `string` | `""` | 头像 URL；留空用昵称首字生成占位头像 |
| `name` | `string` | `""` | 昵称 |
| `bio` | `string` | `""` | 一句话简介 |
| `url` | `string` | `""` | 头像/昵称的跳转链接 |
| `links` | `LinkItem[]` | `[]` | 社交链接数组 |
| `links[].name` | `string` | 必填 | 名称（无障碍标签与 `showName` 文字） |
| `links[].url` | `string` | 必填 | 链接，邮箱用 `mailto:` |
| `links[].icon` | `string` | `""` | 三种写法见下 |
| `links[].showName` | `boolean` | `false` | `true` 时在图标旁显示名称文字 |

### 社交图标的三种写法

`icon` 字段支持：

1. **内置简名**（推荐）：`"github"`、`"email"`、`"rss"`、`"qq"`、`"wechat"`、`"weibo"`、`"bilibili"`、`"xiaohongshu"`、`"x"` 等，构建期内联渲染，完整清单见[社交图标配置](/posts/social-icons/)
2. **Iconify 全名**：形如 `"simple-icons:bilibili"`（集：名），站点装对应 `@iconify-json/*` 包即可扩展
3. **内联 SVG 字符串**：以 `<` 开头的 SVG 文本，兼容自定义图标

名字未命中时**跳过图标只渲染文字链接**，不会构建报错。

### 使用效果

- 侧栏顶部一张圆头像卡：头像（或首字头像）+ 昵称 + 简介 + 一行社交图标
- 图标单色跟随文字色，深浅模式自动适配；点击跳转对应主页

## 版权声明（license）

### 全部可配置项

```ts
// site/config/licenseConfig.ts
export const licenseConfig: ThemeConfig["license"] = {
	enabled: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
	prefix: "", // 自定义声明前缀文案
	suffix: "", // 自定义声明后缀文案
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | `false` 全站关闭版权声明 |
| `name` | `string` | `"CC BY-NC-SA 4.0"` | 许可证名称 |
| `url` | `string` | CC 官方链接 | 许可证全文链接 |
| `prefix` | `string` | `""` | 自定义前缀文案，留空用语言包默认 |
| `suffix` | `string` | `""` | 自定义后缀文案 |

### 按篇覆盖

文章 frontmatter 可覆盖全局设置（见[写作指南](/posts/writing/)）：

- `license: false` — 该篇不显示版权声明
- `licenseName` / `licenseUrl` — 该篇使用不同许可证

### 使用效果

每篇文章末尾渲染一行声明：「本文采用 CC BY-NC-SA 4.0 许可，转载请注明出处与作者。」，
许可证名带超链接指向 `url`。
