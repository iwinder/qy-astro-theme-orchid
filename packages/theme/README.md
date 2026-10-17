# @windcoder/astro-theme-orchid

清新简约的 Astro 博客主题，以 **Astro Integration** 形式提供：站点只做三件事——声明域名、接入主题、传入配置；页面、样式引擎、路由全部由主题注入。支持版本化升级与组件覆盖（`src/overrides/` 同名替换，升级永不覆盖站点定制）。

## 特性一览

- **页面**：首页（featured/cover/compact/text 四种卡片混排）、文章页（TOC/相关推荐/分享海报/打赏入口）、归档（按年折叠）、分类、标签、专题、画廊（含加密相册）、友链、留言板、打赏、关于
- **写作增强**：LaTeX（KaTeX + mhchem）、Mermaid 双主题、PlantUML、Callouts、GitHub 卡片、图语法（figure/九宫格）、代码块双主题 + 折叠、邮箱防爬
- **互动系统**：评论五套（Artalk / Twikoo / Waline / Giscus / Disqus）、文章加密、过时提醒、公告、广告位
- **个性化**：深浅模式、hue 动态调色、樱花飘落、背景壁纸、音乐播放器（跨页不断播）、Live2D 看板娘、i18n（zh-CN / en）
- **工程化**：配置启动即校验（Zod）、OG 分享图、LQIP 占位、字体子集化、站点统计四件套（GA / Clarity / Umami / 51.la）、RSS / sitemap

## 快速上手

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
	integrations: [orchidTheme({ title: "我的博客" /* 其余配置见下文 */ })],
});
```

配置在 dev/build 启动即校验（Zod schema），错误会直接报出来。所有配置项都有默认值，只有 `title` 必填。

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

### 4. 站点结构约定

```text
site/
├── astro.config.ts          # 接入主题（见上）
├── config/                  # 配置按模块拆分（推荐做法，也可直接内联）
├── src/content/posts/       # 文章（.md）
├── src/content/spec/        # 独立页内容：about.md / friends.md / guestbook.md
├── src/overrides/           # 组件覆盖（路径镜像主题，见「定制与覆盖」）
└── public/                  # 静态资源（音乐/壁纸/画廊/模型等）
```

独立页 `friends.md` / `guestbook.md` 的 frontmatter 只需 `title`；页面数据（友链列表、打赏码等）来自主题配置（见下文 `friends` / `sponsor`）。

## 配置参考

> **同步约定**：主题新增或修改配置项时，本表同步更新（同一次提交内）。字段语义以 [`src/schema.ts`](./src/schema.ts) 注释为准。

### 基础信息

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` | `string` | （必填） | 站点名 |
| `description` | `string` | `""` | 站点描述（首页与 meta description 默认值） |
| `keywords` | `string[]` | `[]` | 站点级 SEO keywords；文章页由 frontmatter `tags` 覆盖，留空不输出 meta |
| `logo` | `string` | `""` | 导航栏 Logo 图片 URL（public 路径或外链），留空只渲染文字标题 |
| `author` | `string` | `""` | 作者名 |
| `accentColor` | `string` | `"#4a9d8f"` | 强调色（6 位 hex）。构建期转 HSL，全部派生色由公式计算 |
| `lang` | `string` | `"zh-CN"` | 站点语言（`<html lang>`），同时驱动 UI 文案（支持 `zh-CN` / `en`） |
| `pageWidth` | `number` | `1120` | 主容器页宽（800-1920 px），驱动主壳与文章页双列布局 |
| `timezone` | `string` | — | 构建期日期时区（IANA 名，如 `"Asia/Shanghai"`），留空跟随构建环境 |
| `since` | `string` | — | 建站日期 `YYYY-MM-DD`（站点信息卡「已运行」），不配置不显示 |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | 默认深浅模式（仅初值，用户切换后以 localStorage 为准） |
| `favicon` | `{src, type?, sizes?, theme?}[]` | `[]` | 数组非空时替换默认 favicon；`theme: "light"/"dark"` 按系统深浅切换 |
| `footerText` | `string` | `""` | 页脚附加文案 |
| `footer.customHtml` | `string` | `""` | 页脚自定义 HTML（备案号等），渲染在页脚最底部 |

### 导航与背景

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `nav` | `{label, href?, external?, children?}[]` | `[]` | 顶部导航。`children` 非空时父项为下拉入口；`external: true` 新窗口打开 |
| `banner.enabled` | `boolean` | `true` | 首页 banner 总开关（hero 文案 + 背景图合并单配置，§4.42）；`false` 时两者都不渲染 |
| `banner.src` | `string \| string[]` | — | banner 图源。数组时构建期随机选一张（零 JS）；不配置则无图（quote 有值时 hero 文案渲染为列表上方独立区块） |
| `banner.height` | `number` | `32` | banner 高度（10-90 vh） |
| `banner.dimOpacity` | `number` | `0.2` | 黑蒙层不透明度（0-1） |
| `banner.position` | `string` | `"center"` | 图片 object-position |
| `banner.homeOnly` | `boolean` | `true` | `true` 仅首页显示 |
| `banner.quote` / `banner.sub` | `string` | `""` | hero 主句/副句；quote 支持 `<em>` 强调色，留空不渲染。有 banner 图时叠加显示其上，否则为列表上方独立区块 |
| `huePanel.enabled` | `boolean` | `true` | 导航栏 hue 调色面板（预设色板 + 滑杆，运行时覆写 `--accent-h`，持久化 localStorage） |

### 文章列表与侧栏

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `postList.style` | `"cover" \| "compact"` | `"cover"` | 默认卡片形态；frontmatter `cardStyle` 可按篇覆盖、可混排 |
| `postList.pageSize` | `number` | `10` | 每页文章数 |
| `postList.fallbackCover` | `string` | — | 无图文章兜底封面；不配置则降级纯文字卡 |
| `postList.randomCover.apis` | `string[]` | `[]` | 随机封面图源（URL 支持 `{slug}` 占位符）；frontmatter `image: "api"` 的文章从此取图，客户端失败自动重试降级 |
| `postList.allowSwitch` | `boolean` | `false` | 列表/网格切换按钮（用户选择持久化 localStorage） |
| `postList.gridColumnWidth` | `number` | `320` | 网格模式最小列宽（220-600 px） |
| `categoryBar.enabled` | `boolean` | `false` | 分类导航栏（首页列表与文章页正文顶部） |
| `toc.enabled` | `boolean` | `true` | 文章页目录 |
| `archive.fold` | `boolean` | `false` | 归档页按年折叠（最新一年默认展开） |
| `outdated.enabled` / `outdated.threshold` | `boolean` / `number` | `true` / `30` | 文章过时提醒与阈值（天，按最后更新时间计算） |
| `sidebar.onPost` | `boolean` | `false` | 文章详情页是否启用侧栏 |
| `sidebar.widgets` | `{type, enabled?, showOnPost?, postOnly?, hideOnMobile?, position?, specificConfig?}[]` | 公告/分类/标签/友链/日历/TOC/站点信息/广告 | widget 顺序即渲染顺序，公共配置（开关/显隐/位置）配在数组项上，专属参数统一收进 `specificConfig` 入口（§4.52）。类型：`announcement` `categories` `tags` `friends` `calendar` `toc` `siteInfo` `advertisement` `profile`；`showOnPost: false` 仅列表页显示，`postOnly: true` 仅文章页显示，`hideOnMobile: true` 移动端隐藏，`position: "sticky"` ≥768px 跟随滚动 |
| `sidebar.widgets` tags 项 `specificConfig.count` | `number` | `12` | 展示的热门标签数量（0 = 全部展示），超出收进「…更多」入口 |
| `sidebar.widgets` friends 项 `specificConfig.count` / `specificConfig.random` | `number` / `boolean` | `3` / `false` | 友链展示数量；`random: true` 构建期随机取样 |
| `sidebar.widgets` calendar 项 `specificConfig.postTooltip` | `boolean` | `false` | `true` 时日历下方文章列表条目悬停显示全文 title |
| `announcement` | `{title, content, link{text,url,external}, closable}` | content 空 | 侧栏公告卡；`content` 留空整卡不渲染 |
| `advertisement` | `{enabled, title, image, imageLink, imageAlt, content, link{text,url,external}, closable, displayCount, expireDate?}` | `enabled: false` | 侧栏广告位；`displayCount` 按 localStorage 计数限次（-1 不限），`expireDate` 过期不渲染 |
| `profile` | `{avatar, name, bio, url, links[{name,url,icon,showName}]}` | 全空 | 侧栏个人资料卡（`sidebar.widgets` 含 `profile` 时渲染）；icon 为内联 SVG 字符串 |

### 写作增强

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `codeTheme.light` / `codeTheme.dark` | `string` | `"github-light"` / `"github-dark"` | Shiki 双主题名，跟随站点深浅模式 |
| `codeTheme.fold` | `{enabled, threshold, previewLines, defaultCollapsed}` | `false` / `15` / `8` / `true` | 代码块折叠：行数超过 `threshold` 折叠为 `previewLines` 行预览，头部按钮展开/收起；math/mermaid/plantuml 块不参与 |
| `latex.enabled` | `boolean` | `false` | `$...$` / `$$...$$` 数学公式（KaTeX，含 mhchem 化学宏） |
| `diagram.mermaid` | `{enabled, lightTheme, darkTheme}` | `false` / `"github-light"` / `"github-dark"` | Mermaid 构建期双主题静态渲染（` ```mermaid ` 代码块） |
| `diagram.plantuml` | `{enabled, server, lightTheme, darkTheme}` | `false` / 官方服务 / `""` / `""` | PlantUML（` ```plantuml ` 代码块），图片由浏览器访问渲染服务加载 |
| `emailProtection` | `{enabled, method}` | `false` / `"base64"` | mailto 链接构建期编码防爬（`base64` / `rot13`），点击时还原 |
| `og.enabled` | `boolean` | `false` | 构建期生成每篇文章 OG 分享图（1200x630）；Google Fonts 拉取失败降级占位图，不中断构建 |
| `sharePoster.enabled` | `boolean` | `true` | 文章页「生成分享海报」按钮（纯浏览器 canvas，按需加载） |
| `relatedPosts` | `{enabled, count, randomCount}` | `true` / `5` / `5` | 文章页相关/随机推荐（相关栏构建期评分；加密文章不进两个池） |
| `license` | `{enabled, name, url, prefix, suffix}` | `true` / `"CC BY-NC-SA 4.0"` / CC 链接 / `""` / `""` | 版权声明；frontmatter `licenseName/licenseUrl/license` 可按篇覆盖 |

### 独立页与数据

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `pages` | `{about, friends, guestbook, sponsor, gallery, series}` | 全 `true` | 独立页路由开关，`false` 则路由完全不生成 |
| `gallery` | `{title, description, albums[], columnWidth}` | 「画廊」/ `[]` / `240` | 相册数据纯配置驱动。`albums[]`: `{id, name, description?, date?, location?, tags?, cover?, password?, passwordHint?}`；照片来源 `public/gallery/<id>/` 目录扫描 + 同目录 `urls.txt` 远程列表；`password` 非空即加密相册（构建期加密） |
| `friends` | `{title, description, sort, apply, list[]}` | 「友链」/ weight 排序 | `list[]`: `{title, site, image?, desc?, tags?, weight?, enabled?, featured?}`；同时驱动友链页与侧栏 widget；头像留空渲染字头像 |
| `friends.apply` | `{title, description, link, label}` | title 空 | 申请友链卡片，title 留空整卡不渲染 |
| `sponsor` | `{title, description, usage, showSponsorsList, showButtonInPost, methods[], sponsors[]}` | 「打赏」 | `methods[]`: `{name, icon?, image?, link?, description?, enabled?}`（收款码与跳转链接至少配一个）；`sponsors[]`: `{name, avatar?, amount?, date?}` 打赏者名单 |
| `comment` | `{enabled, provider, title, artalk, twikoo, waline, giscus, disqus}` | `false` / `"none"` / 「评论」 | 五套评论按 `provider` 分发；`enabled: false` 或 `provider: "none"` 页面不渲染评论区。各套子配置：`artalk{server, locale, visitorCount}`、`twikoo{envId, jsUrl, cssUrl}`、`waline{serverURL, lang, visitorCount}`、`giscus{repo, repoId, category, categoryId, mapping, strict, reactionsEnabled, emitMetadata, inputPosition, lang, loading}`、`disqus{shortname}`；对应字段留空即不启用该套 |
| `analytics` | `{googleAnalyticsId, microsoftClarityId, umami, la51}` | 全空 | 四选多，ID 留空即不注入。`umami{websiteId, scriptUrl, replaysScriptUrl, trackOutboundLinks, collectWebVitals, replays{...}}`；`la51{id, sdkUrl, ck, autoTrack, hashMode, screenRecord}` |

### 悬浮组件与特效

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `sakura` | `{enabled, density}` | `false` / `24` | 樱花飘落（全站 canvas 粒子，零贴图）；`prefers-reduced-motion` 自动停用 |
| `music` | `{enabled, position, volume, playMode, showLyrics, playlist[]}` | `false` / `"left"` / `0.7` / `"list"` / `true` / `[]` | 音乐播放器（local 模式，`transition:persist` 跨页不断播）。`playlist[]`: `{name, artist?, url, cover?, lrc?}`；`lrc` 支持 `.lrc` 文件路径或内联歌词文本；`playMode`: `list`/`one`/`random`；音量访客调整后记忆。`enabled` 且歌单非空才渲染 |
| `live2d` | 见下 | `enabled: false` | Live2D 看板娘（基于 [l2d-widget](https://l2d-widget.hacxy.cn)），`transition:persist` 跨页常驻 |

#### live2d 详细配置

| 子项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `model` | `{path, volume?, scale?, x?, y?}` 或其数组 | — | 模型配置，数组可多模型切换（默认菜单自动出现「切换模型」）。`path` 为模型 json 的 public 路径或外链；`volume` 动作音量 0-1（默认 0 静音）；`scale` 缩放；`x`/`y` 偏移 -2~2 |
| `position` | `"bottom-left" \| "bottom-right"` | `"bottom-left"` | 显示位置。与音乐播放器（左下）/ 返回顶部（右下）同角时会重叠，注意 `zIndex` 层级取舍 |
| `size` | `number` 或 `{width, height}` | `280` | 画布尺寸（px），数字为正方形边长 |
| `primaryColor` | `string` | `""` | 菜单/气泡等 UI 主题色，留空用库默认 |
| `transitionDuration` / `transitionType` | `number` / `"slide" \| "fade"` | — | 入场/退场动画时长（ms）与类型 |
| `menus.items` | `{icon?, label, action, url?}[]` | 主页/回到顶部/休眠（+切换模型） | 自定义菜单（覆盖默认）。`action` 内置动作：`home` `scrollToTop` `sleep` `switchModel`，或 `"link"` + `url` 跳转外链 |
| `menus.align` | `"left" \| "right"` | `"right"` | 菜单对齐 |
| `tips` | `{enable, welcomeMessage[], messages[], duration, interval, offset{x,y}, typing?}` | — | 提示气泡：欢迎语与循环提示文案（站点个性化内容，自行配置）；`duration` 显示时长 / `interval` 轮换间隔（ms）；不配置用库默认，`enable: false` 关闭 |
| `responsive` | `{hideOnMobile, mobileBreakpoint}` | `true` / `768` | 移动端按断点隐藏 |
| `zIndex` | `number` | `240` | 容器层级（返回顶部 250 / 音乐播放器 255，默认放其下避免按钮被挡） |

## 文章 frontmatter

`definePostSchema` 全量字段（均可选字段见默认值）：

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` | `string` | （必填） | 标题 |
| `description` | `string` | `""` | 摘要描述（构建期另有自动摘要插件兜底） |
| `published` / `updated` | `date` | 必填 / — | 发布/更新时间 |
| `draft` / `pinned` | `boolean` | `false` | 草稿 / 置顶 |
| `image` | `string` | — | 封面图；`"api"` 走 `postList.randomCover.apis` 随机图 |
| `tags` / `category` | `string[]` / `string` | `[]` / — | 标签 / 分类 |
| `password` / `passwordHint` | `string` | — | 非空即加密文章（构建期加密，密码校验在客户端） |
| `cardStyle` | `"cover" \| "compact" \| "text"` | — | 列表卡片形态按篇覆盖 |
| `series` / `seriesOrder` | `string` / `number` | — | 专题名与专题内顺序（聚合到 `/series/<name>/`） |
| `lang` / `author` | `string` | — | 语言 / 作者（空跟随站点） |
| `sourceLink` | `string` | — | 原文链接（转载） |
| `licenseName` / `licenseUrl` / `license` | `string` / `string` / `boolean` | — / — / `true` | 文章级版权覆盖，`license: false` 按篇关闭声明 |
| `comment` | `boolean` | `true` | 本篇是否展示评论 |

## 定制与覆盖

- **组件覆盖**：站点 `src/overrides/` 下镜像主题路径放同名文件即可整体替换，例如
  `src/overrides/components/PostCard.astro` 替换文章卡片。主题内部统一经
  `virtual:theme/components/X.astro` 引用组件，解析时优先命中 overrides，找不到回退包内默认实现；
  overrides 内再 import 同名组件时强制解析到包内默认实现（保留包装扩展的能力）。
- **样式**：主题全局样式经 `@windcoder/astro-theme-orchid/styles/global.css` 注入；强调色派生色全部走 CSS 变量（`--accent-h/s/l`），可通过覆盖变量或 overrides 组件实现深度定制。
- **页脚注入**：`footer.customHtml` 支持注入备案号、自定义脚本/样式等任意 HTML。

## 文档同步约定

- 新增/修改**配置项**：同一次提交内更新本 README「配置参考」对应行，并在 `docs/design.md` 记录功能节（§ 编号）。
- 新增**frontmatter 字段**：同步更新「文章 frontmatter」表。
- 行为变更不涉及配置面时，至少在 `docs/design.md` 留痕。

## 本仓库开发

```text
packages/theme   主题包（exports 直指 src，无构建步骤）
site             中性 demo 站点（config/ 按模块拆分配置，是配置参考的最佳示例）
docs/design.md   设计与实现记录（§ 编号推进，含踩坑与验证口径）
```

```sh
pnpm install
pnpm --filter site dev     # 本地开发
pnpm --filter site build   # 构建
```

> 注意：改动主题渲染管线（rehype/remark 插件）后构建前需清除 content layer 渲染缓存：`rm -rf site/node_modules/.astro`。

## License

MIT
