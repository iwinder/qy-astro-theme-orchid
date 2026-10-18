---
title: 文章页功能：toc / codeTheme / relatedPosts 等六个模块
description: 文章页六大功能模块全量配置——目录、Expressive Code 代码高亮与折叠、相关推荐、OG 分享图与分享海报、过时提醒。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 10
---

文章页是博客的核心阅读场景。本篇讲「文章页上的功能模块」——目录、代码高亮、
底部推荐、分享图与海报、过时提醒，每个模块一个独立配置文件，开关即用。
公式、图表、邮箱防爬这三个「内容渲染」模块见[内容渲染](/posts/content-rendering/)。

**配置文件**：

- `site/src/config/tocConfig.ts` → `toc`（目录）
- `site/src/config/expressiveCodeConfig.ts` → `codeTheme`（代码高亮）
- `site/src/config/relatedPostsConfig.ts` → `relatedPosts`（相关/随机推荐）
- `site/src/config/shareConfig.ts` → `og` / `sharePoster`（分享：OG 图与海报）
- `site/src/config/outdatedConfig.ts` → `outdated`（过时提醒）

## 目录（toc）

两种形态自动切换：`sidebar.onPost: true`（默认）时由**侧栏 toc widget** 承担；
侧栏关闭文章页侧栏时，回退为**悬浮目录**（页面右侧浮动面板）。
侧栏 toc 的显隐配置见[侧边栏与小组件](/posts/sidebar/)。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 悬浮目录总开关 |

```ts
// site/src/config/tocConfig.ts
export const toc: ThemeConfig["toc"] = { enabled: true };
```

## 代码高亮（codeTheme）

主题采用 **Expressive Code**（Astro 生态标准方案），Shiki 双主题，构建期渲染零运行时开销：

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `light` / `dark` | `string` | `"github-light"` / `"github-dark"` | Shiki 内置主题名；dark 优先，按 `html.dark` 选择器随站点深浅模式切换 |
| `fold.enabled` | `boolean` | `true` | 长代码块自动折叠 |
| `fold.lineThreshold` | `number` | `15` | 超过该行数才折叠 |
| `fold.previewLines` | `number` | `8` | 折叠时预览行数（底部渐隐） |
| `fold.defaultCollapsed` | `boolean` | `true` | 达阈值时是否默认折叠 |
| `lineNumbers` | `boolean` | `true` | 行号 |
| `languageBadge` | `boolean` | `false` | 代码块右上角语言徽标 |
| `wrap` | `boolean` | `false` | 长行换行（`false` 横向滚动） |

```ts
// site/src/config/expressiveCodeConfig.ts
export const codeTheme: ThemeConfig["codeTheme"] = {
	light: "github-light",
	dark: "github-dark",
	fold: {
		enabled: true,
		lineThreshold: 15, // 超过 15 行才可折叠
		previewLines: 8,   // 折叠时预览 8 行
		defaultCollapsed: true,
	},
	lineNumbers: true,
	languageBadge: false,
	wrap: false,
};
```

> [!note]
> 主题接管代码高亮后，`astro.config.mjs` 的 `markdown.syntaxHighlight` 必须保持 `false`（主题接入时已处理），否则双重高亮冲突。

使用效果：每个代码块自带复制按钮；超 15 行的块默认折叠为 8 行预览，点击右上角按钮展开（可看本站[你好，清言集](/posts/hello-world/)中的演示）。

## 相关/随机推荐（relatedPosts）

文章底部的推荐区：「相关文章」构建期评分选出，「随机文章」客户端拉取。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 文章底部推荐区总开关 |
| `count` | `number` | `5` | 「相关文章」数量，构建期评分：标签/标题 Jaccard 相似度 + 时间新鲜度 + 同分类加成 |
| `randomCount` | `number` | `5` | 「随机文章」数量，客户端 fetch `/api/allPostMeta.json` |

```ts
// site/src/config/relatedPostsConfig.ts
export const relatedPosts: ThemeConfig["relatedPosts"] = {
	enabled: true,
	count: 5,       // 相关文章数
	randomCount: 5, // 随机文章数
};
```

加密文章**不进两个推荐池**——不会通过推荐区泄露加密文章的存在。

## 分享：OG 图与海报（og / sharePoster）

**OG 分享图**：构建期为每篇文章生成 **1200×630** 分享图到 `/og/<slug>.png`，
社交媒体（微信、Twitter/X、Telegram 等）分享链接时自动展示。
Google Fonts 拉取失败时自动降级纯形状占位图，**构建不中断**。

**分享海报**：文章页出现「生成分享海报」按钮：纯浏览器端 canvas + 二维码合成站点海报图，
点开才加载依赖，**构建零开销**。海报含标题、摘要、站点信息与访问二维码。

```ts
// site/src/config/shareConfig.ts
// og —— 构建期为每篇文章生成 OG 分享图
export const og: ThemeConfig["og"] = { enabled: true };

// sharePoster —— 文章页「生成分享海报」按钮
export const sharePoster: ThemeConfig["sharePoster"] = { enabled: true };
```

## 过时提醒（outdated）

天数由**客户端实时计算**（构建期算会随时间失效）——超过阈值时文章顶部出现
「最后更新」卡片与过时警告，提示读者内容可能不再准确。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关 |
| `threshold` | `number` | `30` | 距最后更新（`updated ?? published`）超过该天数时提醒 |

```ts
// site/src/config/outdatedConfig.ts
export const outdated: ThemeConfig["outdated"] = {
	enabled: true,
	threshold: 30, // 天
};
```

## 模块总览

| 模块键 | 配置文件 | 一句话 |
|---|---|---|
| `toc` | `tocConfig.ts` | 文章目录（侧栏或悬浮） |
| `codeTheme` | `expressiveCodeConfig.ts` | EC 代码高亮、行号、折叠、复制按钮 |
| `relatedPosts` | `relatedPostsConfig.ts` | 底部相关 + 随机推荐 |
| `og` / `sharePoster` | `shareConfig.ts` | OG 分享图 + 浏览器端分享海报 |
| `outdated` | `outdatedConfig.ts` | 超期文章过时提醒 |

正文里的公式、图表、邮箱链接由「内容渲染」模块处理，见[内容渲染](/posts/content-rendering/)。
