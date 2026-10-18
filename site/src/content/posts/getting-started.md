---
title: 快速开始：从零搭建博客
description: 环境要求、安装命令、目录结构、配置文件概览、常用命令与部署——最快路径跑通一个属于你的站点。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 入门
seriesOrder: 1
---

`@windcoder/astro-theme-orchid` 是一个以 **Astro Integration** 形式发布的博客主题：路由、页面、组件、样式全部由主题包注入，站点仓库只保留**配置**和**内容**两层。升级主题只需 `pnpm update`，没有模板 diff 合并。

## 环境要求

- **Node.js ≥ 20**
- **pnpm ≥ 9**（推荐，`npm i -g pnpm`）

## 快速上手

### 方式一：从示例站点开始（推荐）

```bash
git clone https://github.com/iwinder/qy-astro-theme-orchid.git
cd qy-astro-theme-orchid/site
pnpm install
pnpm dev
```

打开 `http://localhost:4321` 即可看到与官方演示一致的站点。接下来把 `src/config/` 里的配置改成你自己的，清空 `src/content/posts/` 里的示例文章开始写作即可。

### 方式二：接入已有 Astro 站点

1. 安装主题与 MDX：

```bash
pnpm add @windcoder/astro-theme-orchid @astrojs/mdx
```

2. 在 `astro.config.ts` 中注册主题：

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import orchidTheme from "@windcoder/astro-theme-orchid";
import { themeConfig } from "./src/config";

export default defineConfig({
	// 站点域名（RSS、sitemap、OG 图都依赖它，必填）
	site: "https://example.com",
	integrations: [mdx(), orchidTheme(themeConfig)],
});
```

3. 定义内容集合（Astro 要求写在站点内）：

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { definePostSchema } from "@windcoder/astro-theme-orchid";

const posts = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: definePostSchema(), // 内置全部文章 frontmatter 字段
});

// about / friends / guestbook 等独立页面正文；缺条目不报错
const spec = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/spec" }),
	schema: z.object({}),
});

export const collections = { posts, spec };
```

frontmatter 字段与写作增强语法见[写作指南](/posts/writing/)。

## 目录结构

```
site/
├── astro.config.ts          # 接入主题（见方式二）
├── src/
│   ├── config/              # 站点配置（14 个模块 + index.ts，见下表）
│   ├── content.config.ts     # 内容集合定义
│   ├── content/
│   │   ├── posts/            # 文章（.md / .mdx）
│   │   └── spec/             # 独立页面正文
│   └── overrides/            # 可选：组件覆盖层
└── public/                  # 静态资源（logo、画廊图片等）
```

## 配置文件概览

所有配置位于 `src/config/`，每个文件负责一个功能模块，`index.ts` 组装全部模块并导出唯一的 `themeConfig`：

| 配置文件 | 说明 | 详细文档 |
|---|---|---|
| `siteConfig.ts` | 站点基础信息：标题、域名、主题色、页宽、页脚 | [站点基础配置](/posts/site-config/) |
| `navBarConfig.ts` | 导航栏菜单与外链 | [导航栏与首页横幅](/posts/nav-and-banner/) |
| `appearanceConfig.ts` | 首页横幅、樱花特效、音乐播放器、看板娘、字体加载 | [导航栏与首页横幅](/posts/nav-and-banner/) · [视觉特效与媒体](/posts/effects-and-media/) |
| `sidebarConfig.ts` | 侧边栏 widget 布局 | [侧边栏与个人资料](/posts/sidebar-and-profile/) |
| `profileConfig.ts` | 个人资料卡与社交图标 | [侧边栏与个人资料](/posts/sidebar-and-profile/) |
| `licenseConfig.ts` | 文章版权声明 | [侧边栏与个人资料](/posts/sidebar-and-profile/) |
| `contentConfig.ts` | 文章列表样式、归档、目录、代码主题、LaTeX、图表、分享等 | [文章列表与归档](/posts/postlist-and-archive/) · [文章页功能](/posts/post-features/) |
| `friendsConfig.ts` | 友链页 | [独立页面与数据](/posts/pages-and-data/) |
| `sponsorConfig.ts` | 赞助页 | [独立页面与数据](/posts/pages-and-data/) |
| `galleryConfig.ts` | 画廊页 | [独立页面与数据](/posts/pages-and-data/) |
| `commentConfig.ts` | 评论系统（五套） | [评论、公告、统计与广告](/posts/comment-and-analytics/) |
| `announcementConfig.ts` | 公告条 | [评论、公告、统计与广告](/posts/comment-and-analytics/) |
| `analyticsConfig.ts` | 访问统计（四家） | [评论、公告、统计与广告](/posts/comment-and-analytics/) |
| `advertisementConfig.ts` | 公告位广告 | [评论、公告、统计与广告](/posts/comment-and-analytics/) |

拆分方式不是强制的——主题只关心最终传入 `orchidTheme()` 的对象，写成一个 `config.ts` 也可以。

> [!note]
> 配置变更不会触发 dev 热更新（config 为构建期快照），修改后需重启 dev server。若启用 MDX，还有一个 `style-to-js` 依赖解析坑需提前了解（一行 overrides 根治），见 [MDX 指南](/posts/mdx-guide/)。

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 本地开发，`http://localhost:4321` |
| `pnpm build` | 生产构建（含字体子集化 + Pagefind 搜索索引） |
| `pnpm check` | `astro check` 类型与语法检查 |
| `pnpm lqip` | 为画廊图片生成 LQIP 占位 |
| `node scripts/new-post.mjs "标题"` | 按模板创建新文章（见[写作指南](/posts/writing/)） |

## 部署

`pnpm build` 产出纯静态 `dist/` 目录，任何静态托管都能用：

- **Vercel / Netlify**：构建命令 `pnpm build`，输出目录 `dist`
- **GitHub Pages**：官方 Astro action 直接可用
- **自建 Nginx / 对象存储**：上传 `dist/` 即可

无任何服务端依赖——评论、统计等第三方能力都是纯前端接入。示例站点的 `build` 由 Astro 构建、字体子集化、Pagefind 三段拼接，自己接入时按需复制（后两段为可选增强）。

## 升级

```bash
pnpm update @windcoder/astro-theme-orchid
```

主题遵循 semver。站点自定义（`overrides/`、配置、内容）全部留在站点仓库，升级不会丢失。

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
| [MDX 指南](/posts/mdx-guide/) | 启用步骤、组件写作、style-to-js 踩坑与修复 |
