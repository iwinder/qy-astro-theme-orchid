---
title: 快速开始：从零搭建博客
description: 环境要求、两种上手方式、astro.config 接入、内容集合与目录结构约定、常用命令、部署与升级，一篇跑通最小可用站点。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesOrder: 1
---

`@windcoder/astro-theme-orchid` 是一个以 **Astro Integration** 形式发布的博客主题：
路由、页面、组件、样式全部由主题包注入，站点仓库只保留**配置**和**内容**两层。
这意味着升级主题只需 `pnpm update`，不会产生模板 diff 合并的地狱。

本文带你从零跑通一个最小可用站点，后续各篇再逐模块展开配置。

## 环境要求

- **Node.js ≥ 20**（Astro 7 的最低要求）
- **pnpm ≥ 9**（推荐，`npm i -g pnpm`）

## 两种上手方式

### 方式一：从示例站点开始（推荐）

克隆或下载主题仓库，直接以其中的 `site/` 目录为起点改造——它是官方维护的完整示例，15 个配置文件全部填了真实可运行的值：

```bash
git clone https://github.com/iwinder/qy-astro-theme-orchid.git
cd qy-astro-theme-orchid/site
pnpm install
pnpm dev
```

打开 `http://localhost:4321` 即可看到与官方演示一致的站点。接下来只需要：

1. 把 `site/config/` 里的站点信息改成你自己的（从[站点基础配置](/posts/site-config/)开始）
2. 清空 `src/content/posts/` 里的示例文章，写入你的内容

### 方式二：接入已有 Astro 站点

已有 Astro 项目时，安装主题包并注册 integration 即可：

```bash
pnpm add @windcoder/astro-theme-orchid @astrojs/mdx
```

`astro.config.ts` 只需要做三件事：

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import orchidTheme from "@windcoder/astro-theme-orchid";
import { themeConfig } from "./src/config";

export default defineConfig({
	// 1. 站点域名（RSS、sitemap、OG 图都依赖它，必填）
	site: "https://example.com",
	integrations: [
		// 2. MDX 可选，但推荐（文章可以用 .mdx 增强）
		mdx(),
		// 3. 注册主题并传入配置对象
		orchidTheme(themeConfig),
	],
});
```

> [!note]
> 若使用 MDX，需注意：`.mdx` 文件里内联 `<style>` 标签时会因 `style-to-js` 解析问题报错，CSS 请写到独立样式文件或改用 `is:global` 的 `<style is:inline>` 规避。

## 内容集合

Astro 要求内容集合定义写在站点内。在 `src/content.config.ts` 中复用主题导出的 schema 工厂：

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { definePostSchema } from "@windcoder/astro-theme-orchid";

const posts = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	// 传入 extensions 可扩展文章 frontmatter 字段
	schema: definePostSchema(),
});

// about / friends / guestbook 等独立页面正文
const spec = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/spec" }),
	schema: z.object({}),
});

export const collections = { posts, spec };
```

- `definePostSchema()` 已经内置了**全部 19 个文章 frontmatter 字段**（见[写作指南](/posts/writing/)），站点无需手写
- `spec` 集合放 about、friends、guestbook 页面的正文；**缺条目不会构建失败**，对应页面显示占位内容

## 目录结构约定

主题按以下约定查找文件，站点侧保持这个骨架即可：

```
site/
├── astro.config.ts          # 接入主题（上面三件事）
├── src/
│   ├── content.config.ts    # 内容集合定义
│   ├── config/              # 站点配置（建议拆分模块，见下）
│   │   ├── index.ts         # 组装并导出 themeConfig
│   │   ├── siteConfig.ts    # 站点基础信息
│   │   ├── appearanceConfig.ts
│   │   └── ...              # 共 15 个模块文件
│   ├── content/
│   │   ├── posts/           # 文章（.md / .mdx）
│   │   └── spec/            # 独立页面正文
│   └── overrides/           # 可选：组件覆盖层
└── public/                  # 静态资源（logo、画廊图片等）
```

`src/config/` 的拆分方式不是强制的——主题只关心最终传入 `orchidTheme()` 的那一个对象。拆成 15 个模块文件是示例站点的组织方式，便于逐篇讲解（本系列后面每篇对应一至几个模块）。

最小化组织也可以只有一个 `config.ts`：

```ts
// src/config.ts —— 扁平写法同样有效
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const themeConfig: ThemeConfig = {
	site: { title: "我的博客", lang: "zh-CN" },
	// 其余全部走默认值
};
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 本地开发，`http://localhost:4321` |
| `pnpm build` | 生产构建（含字体子集化 + Pagefind 搜索索引） |
| `pnpm check` | `astro check` 类型与语法检查 |
| `pnpm lqip` | 为画廊图片生成 LQIP 占位 |
| `node scripts/new-post.mjs "标题"` | 按模板创建新文章（见[写作指南](/posts/writing/)） |

> [!note]
> 示例站点的 `build` 脚本是 `astro build && node ../packages/theme/scripts/subset-fonts.mjs && pagefind --site dist`——依次执行 Astro 构建、中文字体子集化、搜索索引生成。自己接入时按需复制，其中子集化与 Pagefind 均为可选增强。

## 部署

`pnpm build` 产出纯静态 `dist/` 目录，任何静态托管都能用：

- **Vercel / Netlify**：构建命令 `pnpm build`，输出目录 `dist`
- **GitHub Pages**：官方 Astro action 直接可用
- **自建 Nginx / 对象存储**：上传 `dist/` 即可

无任何服务端依赖——评论、统计等第三方能力都是纯前端接入。

## 升级

```bash
pnpm update @windcoder/astro-theme-orchid
```

主题遵循 semver：补丁版本随时可升，次版本新功能向后兼容，主版本升级会在 Release Notes 中给出迁移说明。站点自定义（`overrides/`、配置、内容）全部留在站点仓库，升级不会丢失。

## 本系列导览

| 篇目 | 内容 |
|---|---|
| [站点基础配置](/posts/site-config/) | siteConfig 全部键：标题、域名、主题色、页宽、页脚 |
| [导航栏与首页横幅](/posts/nav-and-banner/) | 导航下拉与外链、banner 大图与语录、色相面板 |
| [侧边栏与个人资料](/posts/sidebar-and-profile/) | 九种 widget、资料卡、版权声明 |
| [文章列表与归档](/posts/postlist-and-archive/) | 列表样式、随机封面、分类条、归档折叠 |
| [文章页功能](/posts/post-features/) | 目录、代码块、相关文章、分享海报、过期提醒、LaTeX、图表 |
| [视觉特效与媒体](/posts/effects-and-media/) | 樱花特效、音乐播放器、看板娘、字体加载 |
| [独立页面与数据](/posts/pages-and-data/) | 关于、友链、赞助、画廊页面的开关与数据 |
| [评论、公告、统计与广告](/posts/comment-and-analytics/) | 五套评论系统、公告条、四家统计、公告位广告 |
| [写作指南](/posts/writing/) | frontmatter 全字段、写作增强语法、加密文章、MDX |
| [组件覆盖（override）](/posts/theme-override/) | 用同名文件替换主题组件 |
| [社交图标配置](/posts/social-icons/) | 内置图标名、Iconify 全名、内联 SVG 三种写法 |
