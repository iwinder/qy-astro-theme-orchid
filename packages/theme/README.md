# @windcoder/astro-theme-orchid

清新简约的 Astro 博客主题，以 **Astro Integration** 形式提供：站点只做三件事——声明域名、接入主题、传入配置；页面、样式引擎、路由全部由主题注入。支持版本化升级与组件覆盖（`src/overrides/` 同名替换，升级永不覆盖站点定制）。

> 部分功能设计参考了 [Firefly](https://github.com/CuteLeaf/Firefly) 主题，在此致谢。

## 特性一览

- **页面**：首页（featured/cover/compact/text 四种卡片混排）、文章页（TOC/相关推荐/分享海报/打赏入口）、归档（按年折叠）、分类、标签、专题、画廊（含加密相册）、友链、追番、留言板、打赏、关于
- **写作增强**：LaTeX（KaTeX + mhchem）、Mermaid 双主题、PlantUML、Callouts、GitHub 卡片、图语法（figure/九宫格）、Expressive Code 代码块（双主题/行号/折叠/复制/语言徽标）、邮箱防爬
- **互动系统**：评论五套（Artalk / Twikoo / Waline / Giscus / Disqus）、文章加密、过时提醒、公告、广告位
- **个性化**：深浅模式、hue 动态调色、樱花飘落、背景壁纸、音乐播放器（跨页不断播）、Live2D 看板娘、i18n（zh-CN / en）
- **工程化**：配置启动即校验（Zod）、OG 分享图、LQIP 占位、字体子集化、站点统计四件套（GA / Clarity / Umami / 51.la）、RSS / sitemap、PWA 可安装（manifest + 离线兜底 Service Worker）

## 快速上手

> 新站点推荐直接从 [astro-theme-orchid-starter](https://github.com/iwinder/astro-theme-orchid-starter) 模板生成（Use this template），配置与内容骨架开箱即用；以下为在已有 Astro 站点上接入主题的步骤。

### 1. 安装

```sh
pnpm add @windcoder/astro-theme-orchid
# peerDependencies: astro ^7.0.0
```

### 2. 接入主题

```ts
// astro.config.ts
import orchidTheme from "@windcoder/astro-theme-orchid";
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://blog.example.com",
	integrations: [orchidTheme({ title: "我的博客" /* 其余配置见 demo 站指南系列 */ })],
});
```

配置在 dev/build 启动即校验（Zod schema），错误会直接报出来。所有配置项都有默认值，无必填项（`title` 缺省为 `"Orchid Blog"`，正式站点应显式配置）。

### 3. 内容集合

Astro 要求 collections 定义在站点项目内，站点通过 `definePostSchema` 在兼容主题字段的基础上扩展自己的 frontmatter：

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { definePostSchema } from "@windcoder/astro-theme-orchid/schema";

const posts = defineCollection({
	type: "content",
	schema: definePostSchema({ /* 站点自定义字段 */ }),
});

export const collections = { posts };
```

#### 可选：启用 MDX

MDX 是站点能力选择：是否写 `.mdx` 文章由站点决定。主题渲染管线与其天然兼容——`@astrojs/mdx` 默认继承站点 `markdown` 配置，主题注册的自定义 unified processor（KaTeX / Mermaid / PlantUML / directives / Expressive Code）原样作用于 `.mdx`。

启用三步：`pnpm add @astrojs/mdx`、在 `integrations` 数组里注册（与主题顺序无关）、集合 loader 扩为 `"**/*.{md,mdx}"`。组件写作、`.md`/`.mdx` 选型，以及已知的 `style-to-js` 依赖坑（含一行 overrides 根治配方），见 demo 站《MDX 指南》一文。

### 4. 站点结构约定

```text
site/
├── astro.config.ts          # 接入主题（见上）
├── config/                  # 配置按模块拆分（推荐做法，也可直接内联）
├── src/content/posts/       # 文章（.md；启用 MDX 后 .mdx 一并收录）
├── src/content/spec/        # 独立页内容：about.md / friends.md / guestbook.md
├── src/overrides/           # 组件覆盖（路径镜像主题，见「定制与覆盖」）
├── scripts/new-post.mjs     # 写作辅助：pnpm new-post <标题>[.md|.mdx]（demo 站）
└── public/                  # 静态资源（音乐/壁纸/画廊/模型等）
```

独立页 `friends.md` / `guestbook.md` 的 frontmatter 只需 `title`；页面数据（友链列表、打赏码等）来自主题配置，见 demo 站《独立页面与数据》一文。

## 配置文档

主题配置项全部有默认值、无必填项，dev/build 启动即经 Zod schema 校验，配错直接报出。字段语义以 [`src/schema.ts`](./src/schema.ts) 注释为准。

完整配置说明与文章 frontmatter 全字段表统一放在 demo 站「主题使用指南」系列文章（源文件在本仓库 `site/src/content/posts/`），按主题分组：

- 基础：《站点基础配置》｜《导航栏》｜《首页横幅》｜《侧边栏与小组件》｜《个人资料卡》｜《版权声明》｜《文章列表与归档》
- 功能：《文章页功能》｜《内容渲染》｜《樱花特效》｜《音乐播放器》｜《Live2D 看板娘》｜《字体》｜《评论系统》｜《公告》｜《站点统计》｜《广告位》｜《友链》｜《追番》｜《PWA》｜《赞助》｜《画廊》｜《独立页面》
- 写作：《写作指南》（frontmatter 全字段与增强语法）｜《MDX 指南》（MDX 启用与踩坑修复）

## 定制与覆盖

- **组件覆盖**：站点 `src/overrides/` 下镜像主题路径放同名文件即可整体替换，例如
  `src/overrides/components/PostCard.astro` 替换文章卡片。主题内部统一经
  `virtual:theme/components/X.astro` 引用组件，解析时优先命中 overrides，找不到回退包内默认实现；
  overrides 内再 import 同名组件时强制解析到包内默认实现（保留包装扩展的能力）。
- **样式**：主题全局样式经 `@windcoder/astro-theme-orchid/styles/global.css` 注入；强调色派生色全部走 CSS 变量（`--accent-h/s/l`），可通过覆盖变量或 overrides 组件实现深度定制。
- **页脚注入**：`footer.customHtml` 支持注入备案号、自定义脚本/样式等任意 HTML。

## 文档同步约定

- 新增/修改**配置项**：同一次提交内更新 demo 站对应指南文章（`site/src/content/posts/`），并在 `docs/design.md` 记录功能节（§ 编号）。
- 新增**frontmatter 字段**：同步更新 demo 站《写作指南》字段表。
- 行为变更不涉及配置面时，至少在 `docs/design.md` 留痕。

## 本仓库开发

```text
packages/theme   主题包（exports 直指 src，无构建步骤）
site             中性 demo 站点（config/ 按模块拆分配置，是指南文章与配置示例的载体）
docs/design.md   设计与实现记录（§ 编号推进，含踩坑与验证口径）
```

```sh
pnpm install
pnpm --filter site dev     # 本地开发
pnpm --filter site build   # 构建
pnpm --filter site new-post "文章标题"   # 生成 frontmatter 骨架到 site/src/content/posts/（.mdx 后缀可显式指定）
```

> 注意：改动主题渲染管线（rehype/remark 插件）后构建前需清除 content layer 渲染缓存：`rm -rf site/node_modules/.astro`。

## License

MIT
