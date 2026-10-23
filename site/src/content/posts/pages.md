---
title: 独立页面（pages）
image: api
description: 七个独立页面的路由开关 siteConfig.pages，与 about / friends / guestbook 的正文写法（src/content/spec 集合）。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 23
---

主题内置六个独立页面（关于/友链/留言板/赞助/画廊/专题），本篇讲它们的**页面开关**与**正文写法**：
开关在 `site/src/config/siteConfig.ts` 的 `pages`，正文来自 `src/content/spec/` 下的 Markdown 集合。
各页的数据配置另见[友链](/posts/friends/)、[赞助](/posts/sponsor/)、[画廊](/posts/gallery/)。

**配置文件**：

- `site/src/config/siteConfig.ts` → `pages`（页面开关）
- `site/src/content/spec/` → about / friends / guestbook 页面正文

## 页面开关（siteConfig.pages）

置 `false` 后主题**不注入对应路由**——路由在构建期完全不生成，而非运行期 404。

```ts
// site/src/config/siteConfig.ts
pages: {
	about: true,     // /about/    关于页
	friends: true,   // /friends/  友链页
	guestbook: true, // /guestbook/ 留言板
	sponsor: true,   // /sponsor/  赞助页
	gallery: true,   // /gallery/  画廊
	series: true,    // /series/   专题聚合
	moments: true,   // /moments/  说说页
},
```

页面开关与全站其余基础配置的联动见[站点基础配置](/posts/site-config/)。
说说页不走 spec 正文体系（内容来自 moments 集合），单独成篇见[说说页](/posts/moments/)。

## 页面正文（spec 集合）

about、friends、guestbook 三个页面的正文来自 `src/content/spec/` 下的 Markdown 文件：

- 文件名固定（slug 即页面名），frontmatter 只需 `title`
- **缺条目不会构建失败**——对应页面渲染主题内置的占位内容

```
site/src/content/spec/
├── about.md      # 关于页正文
├── friends.md    # 友链页正文（渲染在友链列表上方）
└── guestbook.md  # 留言板页正文（渲染在评论区上方）
```
