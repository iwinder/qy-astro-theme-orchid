---
title: 说说页（moments）
description: 轻量动态流——每条说说一小段 Markdown，带心情 emoji、配图与标签；pages.moments 开关 + moments 内容集合，构建期分页渲染。
published: 2026-10-20
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 24
---

说说页（`/moments/`）是博客里的轻量动态流：一条说说就是一小段 Markdown，
可带心情 emoji、配图与标签，按发布时间倒序分页展示（每页 20 条）。
与文章不同，说说不需要标题、封面与整套 SEO 字段——适合随手记录。

**配置文件**：

- `site/src/config/siteConfig.ts` → `pages.moments`（页面开关，默认 `false`）
- `site/src/content.config.ts` → `moments` 集合定义
- `site/src/content/moments/` → 说说内容（一个 `.md` 文件一条）

## 开启说说页

两步：`content.config.ts` 定义集合（用主题导出的 `defineMomentSchema()` 工厂），
`siteConfig.ts` 打开开关并按需加导航项。

```ts
// site/src/content.config.ts
import { defineMomentSchema } from "@windcoder/astro-theme-orchid";

const moments = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/moments" }),
	schema: defineMomentSchema(),
});
```

```ts
// site/src/config/siteConfig.ts
pages: {
	// ...
	moments: true, // /moments/ 说说页
},
```

导航入口自己加（见[导航栏](/posts/navbar/)），比如 `{ label: "说说", href: "/moments/" }`。
开关关闭时路由在构建期完全不生成。

## 写一条说说

每个文件一条说说，文件名即 slug（当前未生成单条详情页，文件名建议仍保持语义化）。
frontmatter 只有一个必填字段：

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `published` | `date` | 必填 | 发布时间，列表按它倒序 |
| `mood` | `string` | — | 心情 emoji（如 `🌿`），卡片右上角展示 |
| `tags` | `string[]` | `[]` | 标签，渲染为胶囊并链接到对应标签分页 |
| `images` | `string[]` | `[]` | 配图（public 路径或外链），三列网格展示 |
| `draft` | `boolean` | `false` | 草稿：本地 dev 可见，生产构建剔除 |

```markdown
---
published: 2026-10-20T10:00:00+08:00
mood: "🌿"
tags:
  - 随笔
images:
  - /images/moment-1.jpg
---

正文是一小段 Markdown，主题的写作增强语法（公式、图表等）都可用。
```

## 配图与灯箱

`images` 按三列网格排布（窄屏两列），点击进入与文章页相同的灯箱浏览
（同一条说说的图片自动编为一组，支持左右切换与缩放）。
本地图片放 `public/` 下按路径引用即可。

## 标签联动

说说的 `tags` 复用文章的标签体系：胶囊点击跳 `/tags/<tag>/` 标签分页
（该页列出的是同名标签的**文章**）。想让说说与文章共用标签聚合，用同一标签名即可。
