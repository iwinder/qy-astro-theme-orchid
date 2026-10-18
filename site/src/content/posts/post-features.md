---
title: 文章页功能：toc / codeTheme / relatedPosts 等九个模块
description: 文章页九大功能模块全量配置——悬浮目录、Expressive Code 代码高亮与折叠、相关推荐、OG 分享图、分享海报、过时提醒、LaTeX、图表、邮箱防爬。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 7
---

文章页是博客的核心阅读场景。主题把它的九个功能模块全部收在
`contentConfig.ts` 里，每个模块一个顶层键，开关即用。本文逐模块给出全部可配置项。

## 目录（toc）

```ts
export const toc: ThemeConfig["toc"] = { enabled: true };
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 悬浮目录总开关 |

两种形态自动切换：`sidebar.onPost: true`（默认）时由**侧栏 toc widget** 承担；
侧栏关闭文章页侧栏时，回退为**悬浮目录**（页面右侧浮动面板）。
侧栏 toc 的显隐配置见[侧边栏与个人资料](/posts/sidebar-and-profile/)。

## 代码高亮（codeTheme）

主题采用 **Expressive Code**（Astro 生态标准方案），Shiki 双主题，构建期渲染零运行时开销：

```ts
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

> [!note]
> 主题接管代码高亮后，`astro.config.mjs` 的 `markdown.syntaxHighlight` 必须保持 `false`（主题接入时已处理），否则双重高亮冲突。

使用效果：每个代码块自带复制按钮；超 15 行的块默认折叠为 8 行预览，点击右上角按钮展开（可看本站[你好，清言集](/posts/hello-world/)中的演示）。

## 相关/随机推荐（relatedPosts）

```ts
export const relatedPosts: ThemeConfig["relatedPosts"] = {
	enabled: true,
	count: 5,       // 相关文章数
	randomCount: 5, // 随机文章数
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 文章底部推荐区总开关 |
| `count` | `number` | `5` | 「相关文章」数量，构建期评分：标签/标题 Jaccard 相似度 + 时间新鲜度 + 同分类加成 |
| `randomCount` | `number` | `5` | 「随机文章」数量，客户端 fetch `/api/allPostMeta.json` |

加密文章**不进两个推荐池**——不会通过推荐区泄露加密文章的存在。

## OG 分享图（og）

```ts
export const og: ThemeConfig["og"] = { enabled: true };
```

构建期为每篇文章生成 **1200×630** 分享图到 `/og/<slug>.png`，
社交媒体（微信、Twitter/X、Telegram 等）分享链接时自动展示。
Google Fonts 拉取失败时自动降级纯形状占位图，**构建不中断**。

## 分享海报（sharePoster）

```ts
export const sharePoster: ThemeConfig["sharePoster"] = { enabled: true };
```

文章页出现「生成分享海报」按钮：纯浏览器端 canvas + 二维码合成站点海报图，
点开才加载依赖，**构建零开销**。海报含标题、摘要、站点信息与访问二维码。

## 过时提醒（outdated）

```ts
export const outdated: ThemeConfig["outdated"] = {
	enabled: true,
	threshold: 30, // 天
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关 |
| `threshold` | `number` | `30` | 距最后更新（`updated ?? published`）超过该天数时提醒 |

天数由**客户端实时计算**（构建期算会随时间失效）——超过阈值时文章顶部出现
「最后更新」卡片与过时警告，提示读者内容可能不再准确。

## LaTeX 数学公式（latex）

```ts
export const latex: ThemeConfig["latex"] = { enabled: true };
```

remark-math + rehype-katex **构建期渲染**，无客户端运行时。行内 `$E=mc^2$`、块级 `$$...$$` 均可；含 mhchem 扩展（化学方程式）。关闭后 `$...$` 按普通文本输出。
语法示例见[写作指南](/posts/writing/)。

## 图表（diagram）

```ts
export const diagram: ThemeConfig["diagram"] = {
	mermaid: {
		enabled: true,
		lightTheme: "github-light",
		darkTheme: "github-dark",
	},
	plantuml: {
		enabled: true,
		server: "https://www.plantuml.com/plantuml",
		lightTheme: "",
		darkTheme: "",
	},
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mermaid.enabled` | `boolean` | `true` | mermaid 围栏代码块构建期渲染为**双主题静态 SVG** |
| `mermaid.lightTheme` / `darkTheme` | `string` | `"github-light"` / `"github-dark"` | mermaid 官方主题名 |
| `plantuml.enabled` | `boolean` | `true` | plantuml 围栏代码块渲染 |
| `plantuml.server` | `string` | plantuml.com | 渲染服务地址，可替换为自建/内网服务 |
| `plantuml.lightTheme` / `darkTheme` | `string` | `""` | 服务端主题参数 |

两者都以 ```` ```mermaid ```` / ```` ```plantuml ```` 围栏代码块书写，语法见[写作指南](/posts/writing/)。

## 邮箱防爬（emailProtection）

```ts
export const emailProtection: ThemeConfig["emailProtection"] = {
	enabled: true,
	method: "base64", // "base64" | "rot13"
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关 |
| `method` | `"base64" \| "rot13"` | `"base64"` | base64 抗爬性更好；rot13 零 atob 依赖 |

文章正文里的 `mailto:` 链接在**构建期编码**，HTML 源码里看不到真实邮箱，
访客点击时内联脚本还原——防采集爬虫，不防人工。

## 模块总览

| 模块键 | 一句话 |
|---|---|
| `toc` | 文章目录（侧栏或悬浮） |
| `codeTheme` | EC 代码高亮、行号、折叠、复制按钮 |
| `relatedPosts` | 底部相关 + 随机推荐 |
| `og` | 每篇一张 OG 分享图 |
| `sharePoster` | 浏览器端分享海报 |
| `outdated` | 超期文章过时提醒 |
| `latex` | KaTeX 数学公式 |
| `diagram` | mermaid / plantuml 图表 |
| `emailProtection` | mailto 编码防爬 |
