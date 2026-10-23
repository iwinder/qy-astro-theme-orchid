---
title: 个人资料卡（profile）
image: api
description: 侧栏个人资料卡的内容配置——头像、昵称、简介、跳转链接与社交链接数组，以及社交图标的三种写法（内置简名 / Iconify 全名 / 内联 SVG）。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 7
---

本组件挂在侧栏——即 `site/src/config/sidebarConfig.ts` 的 `widgets` 数组里 `type: "profile"` 的那一项；挂载顺序、显隐与粘性定位等布局问题见[侧边栏与小组件](/posts/sidebar/)。本文讲它的**内容配置**。

**配置文件**：`site/src/config/profileConfig.ts`

## 头像与资料

头像、昵称、一句话简介与点击跳转，构成资料卡的主体信息；头像留空时用昵称首字生成占位头像。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `avatar` | `string` | `""` | 头像 URL；留空用昵称首字生成占位头像 |
| `name` | `string` | `""` | 昵称 |
| `bio` | `string` | `""` | 一句话简介 |
| `url` | `string` | `""` | 头像/昵称的跳转链接 |

```ts
// site/src/config/profileConfig.ts
avatar: "",            // 头像 URL；留空渲染昵称首字字头像
name: "windcoder",     // 昵称
bio: "写点技术，也写点生活。",
url: "/about/",        // 头像/昵称点击跳转，留空不包链接
```

## 社交链接

`links` 数组渲染资料卡下方一行社交图标，每项由名称、链接、图标与文字开关组成。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `links` | `LinkItem[]` | `[]` | 社交链接数组 |
| `links[].name` | `string` | 必填 | 名称（无障碍标签与 `showName` 文字） |
| `links[].url` | `string` | 必填 | 链接，邮箱用 `mailto:` |
| `links[].icon` | `string` | `""` | 三种写法见下 |
| `links[].showName` | `boolean` | `false` | `true` 时在图标旁显示名称文字 |

```ts
// site/src/config/profileConfig.ts
links: [
	{ name: "GitHub", url: "https://github.com/iwinder", icon: "github", showName: false },
	{ name: "邮箱", url: "mailto:hello@example.com", icon: "email", showName: false },
],
```

### 社交图标的三种写法

`icon` 字段支持：

1. **内置简名**（推荐）：`"github"`、`"email"`、`"rss"`、`"qq"`、`"wechat"`、`"weibo"`、`"bilibili"`、`"xiaohongshu"`、`"x"` 等，构建期内联渲染，完整清单见[社交图标配置](/posts/social-icons/)
2. **Iconify 全名**：形如 `"simple-icons:bilibili"`（集：名），站点装对应 `@iconify-json/*` 包即可扩展
3. **内联 SVG 字符串**：以 `<` 开头的 SVG 文本，兼容自定义图标

名字未命中时**跳过图标只渲染文字链接**，不会构建报错。

## 使用效果

- 侧栏顶部一张圆头像卡：头像（或首字头像）+ 昵称 + 简介 + 一行社交图标
- 图标单色跟随文字色，深浅模式自动适配；点击跳转对应主页
