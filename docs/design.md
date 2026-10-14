# @windcoder/astro-theme-orchid 设计文档

> 清新简约个人博客主题。目标：**主题以 npm 包形式独立升级版本号，站点定制不被升级覆盖**。
> 参考项目：`orchid-blog`（Firefly 模板 v6.13.7）——只对齐功能，不复制代码与视觉。
> 状态：M1 已完成并通过 dev 验证；功能取舍已确认（见第 6 节决策记录，2026-10-11）。当前阶段：**高保真 HTML 原型定视觉**。

---

## 1. 方案选型：方案 D（pnpm monorepo + 主题 npm 包）

| 候选 | 结论 |
|---|---|
| A. 项目级 Template/Starter（现状） | 升级 = 手工搬代码，定制易丢，否决 |
| B. fork 改造 | 与上游同步困难，否决 |
| C. 主题 npm 包 | 可行，但开发期每次改动要发包 |
| **D. pnpm monorepo（选定）** | 方案 C 的开发期形态：`packages/theme` 以 `workspace:*` 链接进 `site`，开发期零发包；成熟后 `packages/theme` 单独发布，站点改版本号即升级（Starlight 同路线） |

## 2. 架构设计

### 2.1 目录结构

```
qy-astro-theme-orchid/
├── pnpm-workspace.yaml / package.json / .npmrc / .gitignore
├── docs/design.md                    ← 本文档
├── packages/theme/                   # @windcoder/astro-theme-orchid
│   ├── package.json                  # exports: ./schema、./routes/*、./components/*、./styles/*；peerDeps: astro ^7
│   └── src/
│       ├── index.ts                  # defineTheme()：Integration 入口
│       ├── vite.ts                   # 虚拟模块 + override 解析插件
│       ├── schema.ts                 # themeConfigSchema + definePostSchema
│       ├── utils.ts
│       ├── styles/global.css         # Tailwind v4 + .qy-prose 排版
│       ├── components/               # BaseLayout / Header / Footer / PostCard
│       └── routes/                   # index.astro（/）、posts/[...slug].astro
└── site/                             # 用户站点：只做配置、内容、override
    ├── astro.config.ts               # defineTheme({...}) 主题配置
    ├── src/content.config.ts         # schema: definePostSchema({...})
    ├── src/content/posts/*.md
    └── src/overrides/                # 路径镜像虚拟 id，见 2.3
```

### 2.2 defineTheme() Integration

- `astro:config:setup`：`injectRoute` 注入主题路由（entrypoint 指向包内文件，站点零复制页面）；`updateConfig` 注入 `@tailwindcss/vite` + 两个 Vite 插件
- `astro:config:done`：`injectTypes` 为虚拟模块生成类型声明（**注意：astro 7 中 injectTypes 只在此 hook 提供**，`astro:config:setup` 上没有）
- 配置在 `defineTheme(userConfig)` 调用时立即过 `themeConfigSchema.parse`，配置错误在启动时报出
- 所有配置项必须给 default，保证老站点升级后零改动（向后兼容原则）

### 2.3 组件覆盖（override）机制

主题内组件统一 `import X from 'virtual:theme/components/X.astro'`。Vite 插件 `enforce: 'pre'` 解析优先级：

```
site/src/overrides/<rel>  存在且 importer 不在 overrides 内  →  用站点覆盖
否则                                                        →  包内默认实现
```

- 路径**镜像虚拟 id 去掉前缀**：`virtual:theme/components/PostCard.astro` → `site/src/overrides/components/PostCard.astro`
- override 文件内部再 import 同一虚拟路径时强制回退包内默认 → 支持**包装式定制**，无自引用死循环
- ⚠️ Vite 会缓存虚拟模块的 resolveId 结果：**新增/移动 override 文件后需重启 dev server**

### 2.4 内容 schema 工厂 definePostSchema

Astro 要求 collections 定义在站点项目内，故主题导出工厂：

```ts
// site/src/content.config.ts
schema: definePostSchema({ /* 站点自定义字段 */ })
```

主题内置字段（与 orchid-blog frontmatter 兼容）：`title, description, published, updated, draft, pinned, image, tags, category, password, passwordHint`。

### 2.5 虚拟模块

- `virtual:theme/config` → 注入已校验的主题配置对象（带类型）
- `virtual:theme/components/*` → 组件解析（见 2.3）

## 3. M1 已落地内容（已完成）

- [x] monorepo 根配置（pnpm-workspace / .npmrc / .gitignore）
- [x] 主题包：defineTheme + 路由注入 + 4 个组件 + schema + Tailwind v4 样式
- [x] 站点：astro.config + content.config + 2 篇示例文章 + PostCard override 示例
- [x] dev 验证：`/`、`/posts/hello-world`、`/posts/theme-override` 全 200；override 圆点标记 ×2；包装默认实现无死循环；injectTypes 类型生成正常

## 4. 功能清单（源自 orchid-blog 全量盘点）

> 复杂度 = 迁移到本主题的工作量粗估。P0/P1/P2 为初始建议分级，**实际取舍见第 6 节决策记录**（2026-10-11 已确认）。

### 4.1 P0 —— 主题核心，默认实现（M3a）✅ 已完成（2026-10-11）

| 功能 | 具体内容 | orchid-blog 实现 | 复杂度 |
|---|---|---|---|
| 代码高亮 | Expressive Code 双主题、复制按钮、行号、折叠（15 行阈值）、语言角标 | `astro.config.mjs`、`src/config/expressiveCodeConfig.ts` | 低 |
| 文章页 | 字数/阅读时长、上下篇导航、版权声明（全局 CC + 文章级覆盖）、JSON-LD | `pages/posts/[...slug].astro`、`plugins/remark-reading-time.mjs`、`misc/License.astro` | 中 |
| TOC | 文章页侧边目录 | `widget/SidebarTOC.astro`（依赖 sectionize + slug） | 中 |
| 标签/分类页 | 标签云页、分类列表页、按标签/分类筛选文章列表 | `pages/tags/`、`pages/categories/` | 低 |
| 归档页 | 按年月分组的文章归档（简化版：静态生成，不做 Svelte 面板） | `pages/archive.astro` | 中 |
| 暗色模式 | light/dark/system 三态、class 切换、localStorage 持久化、跟随系统 | `controls/LightDarkSwitch.svelte`、`utils/setting-utils.ts` | 中 |
| Markdown 基础增强 | 标题锚点 + sectionize、外链 `_blank + noopener`、callouts 提示块、figure 语义化 | `plugins/`（sectionize/slug/external-links/callouts/figure） | 中 |
| 灯箱 | 文章图片点击放大 | `features/FancyboxManager.astro`（@fancyapps/ui） | 低 |
| RSS + sitemap + robots | 全文 RSS、sitemap、动态 robots.txt | `pages/rss.xml.ts`、`@astrojs/sitemap`、`robots.txt.ts` | 中 |
| 404 页 | 自定义 404 | `pages/404.astro` | 低 |
| 返回顶部 | 右下角悬浮按钮 | `controls/BackToTop.astro` | 低 |
| 页面过渡 | 路由切换动画（用 Astro 内置 View Transitions，不引入 swup） | `@swup/astro`（本主题改用内置方案） | 低 |

**M3a 实现偏差清单**（与上表 orchid-blog 原实现的差异，均已验证可用）：

| 偏差 | 原因 | 主题实现 |
|---|---|---|
| Shiki 替代 Expressive Code | EC 依赖重且与主题包耦合；Shiki 为 Astro 内置 | `shikiConfig: { theme: 'github-dark' }` + 自实现代码块包装（复制按钮）；**无行号/折叠/语言角标**（如需后续补） |
| RSS 为摘要版 | 全文 RSS 需在构建期二次渲染全文，成本高 | description 取 excerpt 插件产物；站点可在 override 中改全文 |
| 无 sectionize | TOC 依赖它做包裹锚点；Astro 原生 `render()` 已返回 headings | 标题锚点插件直接给 h1-h6 加 `id`；TOC 组件读官方 headings + IntersectionObserver 高亮 |
| 标签/分类筛选路由化 | 原站为 Svelte 客户端筛选 | `/tags/[tag]/`、`/categories/[category]/` 静态聚合页（SSG 更符合主题包形态） |
| 侧栏无公告/友链卡 | 属 P1（公告）/P2→P1（友链 widget）范围 | Sidebar 预留 widget 插槽结构，M3b 填充 |
| **新增依赖 `@astrojs/markdown-remark@^7.3.2`** | Astro 7 默认 Sätteri（Rust）处理器**不执行 remark/rehype JS 插件**，仅装包不够，须显式声明 unified 处理器 | `markdown.processor: unified({ remarkPlugins, rehypePlugins })`（`packages/theme/src/index.ts`）；legacy `remarkPlugins/rehypePlugins` 写法在 Astro 7.3.8 只警告不生效 |

**M3a 验证记录**（dev 实测，2026-10-11）：13 条路由全部 200/404 符合预期；remark 插件（字数/时长/摘要写入 `remarkPluginFrontmatter`）与 rehype 插件（外链/callouts/figure/首图/锚点/代码块包装）全部生效；featured 置顶卡仅首页渲染；分页/归档时间线/标签云（字号分级）/分类聚合正常；RSS/sitemap/robots 均中性占位域名。

### 4.2 P1 —— 已确认全部采用（M3b）

| # | 功能 | 具体内容 | orchid-blog 实现 | 复杂度 | 建议 |
|---|---|---|---|---|---|
| 1 | 评论系统 | 5 套可切换：Artalk/Twikoo/Waline/Giscus/Disqus | `components/comment/`、`commentConfig.ts` | 中 | **已确认**：M3b 先实现 Artalk（站点当前在用），其余 4 套留出统一实现口（评论适配层） |
| 2 | 搜索 | Pagefind 构建后静态索引 + 导航栏即时搜索（独立高级搜索页可不做） | `pagefind.yml`、`controls/Search.svelte` | 中 | **建议要**（纯静态、零后端） |
| 3 | 加密文章 | 构建时 AES-256-GCM + PBKDF2 加密、客户端 Web Crypto 解密、密码 sessionStorage 缓存、密码提示 | `utils/crypto-utils.ts`、`features/EncryptedPost.astro` | 高 | schema 字段 M1 已预留；功能复杂度高，看你是否真会写加密文章 |
| 4 | 友链页 | 数据驱动（标题/头像/描述/权重/启用/随机排序） | `pages/friends.astro`、`friendsConfig.ts` | 低 | 成本很低，建议要 |
| 5 | 关于页 | 渲染 markdown 正文 | `pages/about.astro` + `content/spec/about.md` | 低 | 建议要 |
| 6 | 留言板 | 独立页 + 评论组件 | `pages/guestbook.astro` | 低 | 若要评论则顺手 |
| 7 | 打赏 | 赞助页（支付宝/微信/爱发电）+ 文章内按钮 | `pages/sponsor.astro`、`sponsorConfig.ts` | 低 | 看需求 |
| 8 | 画廊/相册 | 相册列表/详情、标签筛选、**加密相册**、LQIP 占位 | `pages/gallery/`、`galleryConfig.ts` | 中 | 看需求 |
| 9 | LaTeX 公式 | remark-math + rehype-katex（含 mhchem）、按需加载 | `plugins/`、`features/KatexManager.astro` | 中 | 写技术文可能用到 |
| 10 | Mermaid 图表 | 代码块构建时渲染静态 SVG（双主题） | `plugins/remark-mermaid.js`、`rehype-mermaid.js` | 中-高 | 可选 |
| 11 | OG 分享图 | satori 构建时生成每篇文章分享图 | `pages/og/[...slug].ts` | 中 | 可选（默认关） |
| 12 | 相关文章推荐 | 文章底部 5 篇 | `misc/RecommendedPost.astro` | 中 | 可选 |
| 13 | 分享海报 | 文章生成分享图（含二维码） | `misc/SharePoster.svelte` | 中 | 可选 |
| 14 | 图片体系 | LQIP 占位图构建生成、随机封面 API 回退 | `scripts/generate-lqips.ts`、`coverImageConfig.ts` | 中 | **已确认要 LQIP**；随机封面与简约风不符，维持舍弃 |
| 15 | 字体子集化 | Astro Font API + 构建时 subset-font | `config/fontConfig.ts`、`scripts/subset-fonts.ts` | 中 | ✅ M4-3 完成（实现与原版差异见 §4.5） |
| 16 | 站点统计 | GA / Umami / Clarity / 51la（四选几） | `analyticsConfig.ts`、`components/analytics/` | 低 | 成本低 |
| 17 | 公告栏 | 侧边栏公告小部件 | `widget/Announcement.astro` | 低 | 成本低 |

**M3b 批次划分**：b0 环境修复 → b1 独立页四件套（P1-4/5/6/7 + 侧栏友链 widget）→ b2 评论适配层（P1-1，先 Artalk）→ b3 公告/广告/站点统计（P1-16/17 + P2 广告位）→ b4 内容插件（P1-9/10 + P2 PlantUML/邮箱防爬）→ b5 hue 调色 + i18n（P2）→ b6 搜索（P1-2）→ b7 加密文章（P1-3）→ b8 画廊（P1-8）→ b9 LQIP/OG/相关文章/分享海报（P1-11/12/13/14）

**M3b-b1 实现记录**（✅ 2026-10-11）：

| 功能 | 实现 |
|---|---|
| 关于页 /friends 同模式 | `/about` 路由 + `getEntry('spec','about')`，spec 集合或条目缺失时降级为占位提示（不 throw，比 orchid-blog 更健壮） |
| 友链页（P1-4） | `/friends` 路由，数据驱动 `friends.list`（title/image/desc/tags/weight/enabled）；`sort: 'weight'`（降序）或 `'random'`（构建期）；头像留空渲染 title 首字字头像兜底；`friends.apply` 卡片（title 留空不渲染）；正文可来自 `spec/friends.md` |
| 留言板（P1-6） | `/guestbook` 路由 + spec 正文 + 评论占位（b2 评论适配层接入后替换） |
| 打赏页（P1-7） | `/sponsor` 路由：usage 说明 + methods 网格三态（image 收款码 / link 跳转按钮 / 双空占位框）+ 打赏者名单（首字母头像兜底） |
| 侧栏友链 widget（决策 8） | 与友链页同源 `friends.list`；`sidebar.friends: { enabled: true, count: 3, random: false }` 默认开 |
| 独立页开关 | `pages.about/friends/guestbook/sponsor`（默认全开），关闭则 integration 阶段**完全不注入路由**（非运行期跳转） |
| spec 集合 | site 侧 `content.config.ts` 新增 `spec` 集合（`z.object({})` 空 schema，md 可无 frontmatter，与 orchid-blog 一致）；site 新增 about/friends/guestbook 三篇中性示例文 |

**M3b-b1 偏差清单**：

| 偏差 | 原因 | 主题实现 |
|---|---|---|
| 打赏无文章内按钮 | orchid-blog 的 `showButtonInPost` 依赖打赏浮层；与简约风不符 | 仅独立 `/sponsor` 页；后续需要再评估 |
| 评论占位而非评论区 | b2 评论适配层尚未实现 | guestbook 页预留 `comment-placeholder`，b2 替换 |
| 无独立路由配置项（路径固定 /about 等） | orchid-blog 路径同样固定 | 站点改路径需求用 Astro `routes` 覆盖即可，不设配置 |

**M3b-b1 验证记录**（dev 实测，2026-10-11）：`/`（侧栏友链 widget 显示 weight 前三）、`/about/`、`/friends/`（5 条全渲染、字头像兜底、apply 卡、tags）、`/guestbook/`（spec 正文 + 评论占位）、`/sponsor/`（link 型 + 双空占位型 method、打赏名单）、`/404`（404）、`/archive/`、`/tags/`、文章页回归全通过；dev 日志无 ERROR。

**M3b-b2 实现记录**（✅ 2026-10-11）：

| 功能 | 实现 |
|---|---|
| 评论适配层（P1-1） | `components/Comment.astro` 按 `config.comment.provider` 分发（可 override 整体覆盖）；schema 新增 `comment` section（enabled 默认 false / provider 枚举 / title / artalk 子配置，全部显式默认值） |
| Artalk 实现 | `components/comments/Artalk.astro` 移植 orchid-blog：unpkg ESM + `is:inline define:vars`、CSS 变量映射主题令牌（--accent/--surface/--border）、`html.dark` MutationObserver 暗色跟随；**pageKey 口径与 orchid-blog 完全一致**（`/posts/<id>`、`/guestbook` 无尾斜杠），M2.5 迁移时既有评论数据无缝延续 |
| VT 兼容 | Astro ClientRouter 对 **identical inline 脚本按内容去重不重跑**：换页 swap 时仅内容不同的脚本才重新执行。文章页之间 pageKey 不同 → 脚本内容不同，天然重跑；但 guestbook → 其他页 → guestbook（脚本内容相同）二次进入不会重执行导致评论区空白。**b3 修正：脚本加 `data-astro-rerun` 强制每次 swap 重跑**；旧 MutationObserver 经 `window.__orchidArtalkObserver` 句柄在下次执行时 disconnect，防泄漏 |
| 文章页接入 | `posts/[...slug].astro` 在 PostNav 后渲染 `<Comment path={`/posts/${post.id}`} enabled={d.comment} />`（frontmatter `comment: false` 按篇关闭，M2 预留字段正式启用） |
| 留言板接入 | guestbook 评论开 → `<Comment path="/guestbook" />`；关 → 保留「评论区即将开放」占位 |

**M3b-b2 偏差清单**：

| 偏差 | 原因 | 主题实现 |
|---|---|---|
| 其余 4 套评论未实现 | 决策 3：M3b 先 Artalk | 适配层 provider 枚举已含扩展位，后续各加一个分支 |
| 无评论区装饰性背景/副标题 | orchid-blog 的装饰与 i18n 副标题属其视觉体系 | 与冻结原型对齐：section-title 标题 + `.comments` 容器 |
| visitorCount 仅生成配置 | Artalk pageview 挂载点（`#artalk-pv`）由站点在需要处自行放置 | 主题不强插 PV 元素，避免与文章 meta 重复 |

**M3b-b2 验证记录**（dev 实测，2026-10-11）：8 条路由全 200；文章页 HTML 含 `#comments` 区块 + `#artalk` 挂载点 + 占位 server（artalk.example.com）注入 + Artalk.css 引入；guestbook 的占位 DOM 已被评论组件替换（comment-placeholder 仅存于 CSS）；dev 日志无 ERROR。Artalk 后端为占位地址，脚本运行期请求失败不影响页面其余部分（真实后端在 M2.5 站点迁移时配置）。

**M3b-b3 实现记录**（✅ 2026-10-11）：

| 功能 | 实现 |
|---|---|
| 侧栏公告（P1-17） | schema 新增 `announcement` section（content 空 → 整卡不渲染）；Sidebar 公告卡置顶：正文（`white-space: pre-line` 支持换行）+ 可选链接按钮（`btn-ghost` 复用）+ closable 内联 onclick 前台隐藏（无持久化，与 orchid-blog 行为一致） |
| 侧栏广告位（P2 保留项） | schema 新增 `advertisement` section（**enabled 默认 false**）；Sidebar 广告卡置底：图（可带 imageLink）/文本/链接按钮三段式 + hover 淡入关闭钮（`__orchidCloseAd` 滑出动画）+ expireDate 构建期过期判断 + displayCount localStorage 计数超限隐藏；初始化脚本**置于模板顶层**（条件表达式内脚本体含 `{}`/`=>` 会被 Astro 模板编译器误解析）+ `data-astro-rerun` 保证 VT 换页后重绑关闭钮/重计数 |
| 站点统计（P1-16） | `components/analytics/` 四实现（GA gtag / Clarity / Umami（含 replays + 外链追踪 astro:page-load 重扫）/ 51la js-sdk-pro）+ `components/Analytics.astro` 聚合；**ID 留空即完全不注入对应脚本**，全部留空零输出；BaseLayout body 尾挂载（与 orchid-blog 口径一致） |
| b2 VT 修正 | Artalk 脚本补 `data-astro-rerun`（修正 identical inline 脚本 guestbook 二次进入不重跑的问题，见上表 b2 VT 行修正说明） |

**M3b-b3 偏差清单**：

| 偏差 | 原因 | 主题实现 |
|---|---|---|
| 广告配置扁平化 | orchid-blog 的 `image{src/link/alt/external}` 嵌套对象配置冗余 | 扁平为 `image/imageLink/imageAlt`，语义不变 |
| 去掉 WidgetLayout/astro-icon/Tailwind 依赖 | 主题无 astro-icon、无 Tailwind | 复用 `.side-card card` 结构 + `btn-ghost`，关闭钮用 `✕` 字符替代图标 |
| 广告 displayCount 计数键固定 | orchid-blog 用随机 widgetId（静态构建下每页随机 → 计数键不一致，实际失效） | 卡片 id 固定 `advertisement`，键 `ad-display-advertisement`，跨页计数一致（顺带修复原实现缺陷） |
| 关闭动画 translateX(24px) | orchid-blog 为 translateX(100%)，侧栏卡片滑出全宽会扫过正文 | 缩短位移仅淡出+微移，视觉更克制 |
| 统计脚本去 swup 标记 | `data-swup-ignore-script` 为 swup 专属 | 主题用 ClientRouter，无对应语义，直接移除 |
| Umami 外链追踪改 astro:page-load | orchid-blog 监听 swup 的 `contentReplaced` 事件 | document 级监听跨 VT swap 持久，`astro:page-load` 重扫新 DOM 外链 |
| widget 置位 | orchid-blog 公告/广告位置由 widget 配置数组决定 | 主题固定：公告卡侧栏置顶、广告卡置底（简约风固定信息架构） |

**M3b-b3 验证记录**（dev 实测，2026-10-11）：8 条路由全 200；首页公告卡渲染（`id="announcement"` + 演示文案 + 关闭钮）；广告默认关 → `id="advertisement"` 零渲染但 init 脚本在场（`__orchidCloseAd` + `data-astro-rerun`）；临时开启广告 → 卡片/内容/关闭钮/`ad-display-advertisement` 计数键全部在场，验证后还原默认关闭；统计 ID 全空 → 全页无 googletagmanager/clarity.ms/umami/51.la 任何脚本痕迹；文章页与 guestbook 的 Artalk 脚本均带 `data-astro-rerun`；dev 日志无 ERROR。

**M3b-b4 实现记录**（✅ 2026-10-11）：

| 功能 | 实现 |
|---|---|
| Astro 7 markdown 接线（b4 核心） | Astro 7 默认 Sätteri 原生处理器**不执行 JS remark/rehype 插件**（仅警告）→ integration `updateConfig({ markdown: { processor: unified({ remarkPlugins, rehypePlugins }), shikiConfig: { theme: 'github-dark' } } })` 切回 unified 处理器；顶层 `shikiConfig` 由 content-layer 传入 `createRenderer(shikiConfig)`，与 unified 处理器兼容 |
| unified 插件装配（⚠️ 铁律） | 插件数组元素**一律是 attacher（插件工厂本体）**；带参用 `[plugin, options]` 元组（loadPlugins 展开 → `parser.use(plugin, opts)`）。绝不能 push 已调用的 transformer（如 `remarkMermaid()`）——unified freeze 时会把它当 attacher **二次调用（首参 tree=undefined）**，报 `Cannot read properties of undefined (reading 'children')`，且插件根本不注册、与文档内容无关（无图表的文档同样崩，因为 freeze 统一执行） |
| LaTeX（P1-9） | `latex.enabled`（默认 false）→ remark-math + rehype-katex；mhchem 化学宏以 `import 'katex/dist/contrib/mhchem.mjs'` 副作用注册进 katex 单实例（pnpm-workspace.yaml `overrides` 把 rehype-katex 等统一到同一 katex 版本，共享单例后宏对 rehype-katex 直接生效）；**不传 `{ katex }` 选项**（rehype-katex 7.x 模块级 import 不支持实例覆盖，settings 会原样展开进 `renderToString` 成无效选项） |
| Mermaid（P1-10） | `remarkMermaid`：```mermaid 代码块 → `div.mermaid-container[data-mermaid-code]`；`rehypeMermaid`：构建期 beautiful-mermaid 渲染 light/dark **双静态 SVG**（`.mermaid-svg-light/-dark` 包裹、CSS 按主题显隐，零客户端运行时）；渲染失败降级 `.mermaid-error` + `pre.mermaid-fallback-code` 源码展示 + stderr 日志 |
| PlantUML（P2） | `remarkPlantuml`：```plantuml 代码块 → 自实现零依赖 URL 编码 → `div.plantuml-wrapper[data-light-src/-dark-src]`（服务器渲染模式，外部 plantuml 服务出图）；`rehypePlantuml` → `img.plantuml-image` + 客户端 plantuml-theme-switch.js 主题切换/加载失败重试 |
| 邮箱防爬（P2） | `rehypeEmailProtection`：mailto 链接 → base64 编码 `a[data-encoded-email]`，客户端解码还原（`emailProtection.method` 配置） |
| pan-zoom | `rehypeDiagramPanZoom`：diagram-panzoom.js（拖拽平移/缩放控制栏/双击/全屏/VT 换页兼容），**仅对实际含 `.diagram-container` 的 tree 注入一次** |

**M3b-b4 偏差清单**：

| 偏差 | 原因 | 主题实现 |
|---|---|---|
| 客户端脚本 readFileSync 替代 `?raw` | orchid 经 Vite `?raw` 引入脚本 | 模块顶层 `readFileSync(new URL('./scripts/…js', import.meta.url))` 读入，主题源码与 Vite 特性解耦 |
| panzoom 条件注入 | orchid 无条件对每篇文档注入脚本 | 仅对含图表的文章注入（WeakSet 每 tree 防重） |
| plantuml wrapper 去随机 id | orchid 随机 id → 静态构建产物不可复现 | 固定结构，产物可复现 |
| 代码高亮 shiki 替代 Expressive Code | 主题不引 EC（零新依赖原则） | Astro 内置 shiki（github-dark）；`rehypeCodeBlock` 仍负责 `.code-block/.code-head/.copy-btn` 包装，pre 内容由 shiki 填充 |
| callout 首子节点查找方式（b4 补充验证发现的 M3a 潜在缺陷修复） | Astro 7 的 mdast→hast 转换给 blockquote 塞入首尾 `"\n"` 空白文本节点，原 `children[0]` 拿到文本节点导致 callout 静默不转换 | 改按类型查找首个元素子节点；全库 grep 确认仅此一处同类假设 |

**M3b-b4 验证记录**（2026-10-11）：

- **独立探针**（`/tmp/b4-probe`：`createMarkdownProcessor` 按 G0 base → G1 +math/katex → G2 +mermaid → G3 +plantuml/panzoom → G4 +email 分组渲染）：5 组全 OK；G4 demo 产物 katex 85 / katex-display 4 / mermaid-container 3 / plantuml-container 2 / data-light-src 3 / data-encoded-email 3
- **补充探针**：坏 mermaid（无效 header，beautiful-mermaid 抛 `Invalid mermaid header`）→ `.mermaid-error` + `pre.mermaid-fallback-code` 降级 + stderr 日志 ✓；普通 ts 代码块 → `pre.astro-code` + `.code-block` 包装 ✓；`> [!NOTE]` callout → `div.callout.info` ✓（修复后）
- **dev 实测**（重启前清 `site/.astro/`）：干净启动零 ERROR；features-demo 文章 article 71052 bytes、katex 85、katex-display 4、mhchem `mord` 153、mermaid-container 3（svg 9）、plantuml-container 2（img 带 data-light-src/-dark-src）、`a[data-encoded-email]` 1、panzoom + plantuml 切换脚本注入 ✓；文章页头渲染 "3 字 / 约 1 分钟"（reading-time 生效）；hello-world 正常
- **排查过程存档**：初版接线把已调用 transformer（`remarkMermaid()` 等 6 处）push 进插件数组 → 全站 md 渲染崩溃；dev 日志无堆栈，用独立探针（绕开 Astro dev，Node `--experimental-strip-types` + module resolve hook 重映射 `.js→.ts`）拿完整堆栈，二分 + `unified@11.0.5` freeze 源码（`attacher.call(self, ...options)`）定位根因，修正后三层验证全绿

**M3b-b5 实现记录**（✅ 2026-10-11）：

| 功能 | 实现 |
|---|---|
| i18n 框架（P2） | **构建期 only**（无客户端语言切换）：`i18n/zh-CN.ts` 为键源（`UiKey = keyof typeof zhCN`，75 键）；`en.ts` 用 `Record<UiKey, string>` 强制完整覆盖；`i18n/resolve.ts` 纯函数解析（packs 注册 en/en-us/en-gb，语言归一化小写 + `_`→`-`，主语言段回退，缺译回退中文键源）；`i18n/index.ts` 薄壳 `t(key, vars?)`（读 `virtual:theme/config.lang`，`{name}` 占位符 replaceAll） |
| i18n 架构红线 | **astro.config 静态 import 链上的 node 侧模块不能 import `virtual:theme/config`**——virtual 模块由 integration 在 astro:config:setup 注入，config 文件加载期（module-runner fetchModule）尚未注册，顶层 import 直接报 `Cannot find module`。路由/组件（vite 运行期）走 `i18n/index.js`；rehype 等 node 侧插件走 `resolveLabel(lang, key)` 显式传 `config.lang`（b5 实测踩坑，dev 起不来） |
| hue 调色面板（P2） | 构建期 `hexToHsl(accentColor)` 在 BaseLayout html style 注入 `--accent-h/s/l` + `data-accent-h`；运行时仅覆写 `--accent-h`（`root.style.setProperty`，s/l 恒为配置值）；`huePanel.enabled`（schema，默认开）；10 档预设色板（代码级常量 `[0,30,60,100,140,170,210,250,290,330]`）+ 0–360 滑杆 + 重置；持久化 `localStorage('qy-hue')` |
| hue VT 兼容 | `applySavedHue()` 挂 `astro:after-swap`（swap 替换 html style 属性后重应用）；面板 DOM 随 swap 重建回服务端态 → `initPalette()` 在 `astro:page-load` 收起面板并同步滑杆/徽章/swatch is-active（差值 `<1° || >359` 判定，含 0/360 环绕）；外点收起检查放 click 委托**开头**（在 modeToggle/navToggle 等分支 return 前生效，且不拦截后续行为） |
| i18n 路由转换 | 11 个路由（archive/tags/categories/posts/[...slug]/404/about/friends/guestbook/sponsor 等）+ 8 组件 + BaseLayout 全部 `t()` 化；客户端动态文案经 BaseLayout head `<script type="application/json" id="qy-ui-labels">` 载体（lightbox/close/prevImage/nextImage/copy/copied 六键），app.ts 顶层惰性读取缓存 + `UI_FALLBACK` 中文兜底 |
| 代码块复制 i18n 收口 | `rehypeCodeBlock` 加 `{ uiLang }` 参数（index.ts 传 `config.lang` 元组），复制按钮初始文案 `resolveLabel(uiLang,'copy')` 跟随站点语言；**math 块（language-math）不生成复制按钮**（rehype-katex 会整体替换 pre 内容，无可复制代码，修复 b4 遗留无效按钮） |

**M3b-b5 偏差清单**：

| 偏差 | 原因 | 主题实现 |
|---|---|---|
| astro check 未跑 | TRAE 沙箱拦截 `pnpm add -D @astrojs/check typescript`（禁写 pnpm store bin 目录），不为可选校验打断沙箱规则 | 以 dev 全页渲染 + 浏览器交互验证替代（覆盖全部改动面）；类型风险低（t() 键由 UiKey 类型约束） |
| friends.astro 局部改名 `t → ft` | `f.tags.map((t) => …)` 参数名与 i18n `t()` 撞名（shadow） | map 参数改名 `(ft)` |
| 色板预设不进 schema | orchid-blog 为 Svelte 运行时组件，配置面广 | 预设与面板 DOM 固化为代码常量，仅保留 `huePanel.enabled` 开关（简约原则） |

**M3b-b5 验证记录**（2026-10-11）：

- **dev 渲染**（重启前清 `site/.astro/`，零 ERROR）：首页/归档/标签页均含 `data-accent-h`、`#qy-ui-labels`、`paletteToggle/palettePop/hueSlider/hueBadge/hueReset` 与 10 个 swatch；ui-labels JSON 六键中文齐全；归档副标题「共 61 篇文章 · 2026 – 2013」（跨年区间格式）；文章页 meta「2026-10-10 发布 / 133 字 / 约 1 分钟 / 置顶」；关于/友链/留言板/打赏页标题 `· 清言集`；标签详情「标签：影视」；各路由 200、404 页返回 404
- **浏览器交互**（TRAE browseruse 实测）：toggle 开/收 + aria-expanded 同步；点 swatch 250 → inline `--accent-h=250` + 滑杆/徽章/is-active 同步 + `--accent` 计算值变 `hsl(250 36% 45%)`；刷新后 inline 250 覆盖服务端 170（localStorage 持久化 + applySavedHue 生效）；**VT 客户端换页**（点归档链接）after-swap 后 hue 保持 250；重置 → `removeProperty` 回落 `hsl(170 36% 45%)` + UI 同步 + 持久化清除（刷新仍 170）；外点收起（含点击深浅模式按钮场景）；滑杆 input 委托（合成事件 → applyHue 全链路）；复制按钮「复制 → 已复制」1200ms 还原
- **修复回归**：math 块不再带 copy-btn；代码块 copy-btn 初始「复制」→「已复制」链路正常；首页/归档/文章页 i18n 渲染回归通过；浏览器 localStorage 已重置回默认色

**M3b-b6 实现记录**（✅ 2026-10-11，搜索 P1-2）：

| 功能 | 实现 |
|---|---|
| 搜索 UI | Header `search-wrap` 单图标按钮 + 浮层（与调色面板同设计语言，桌面/移动统一，不做 orchid 的桌面内联输入双方案）；浮层 = `search-bar`（图标 + 无边框 input）+ `search-results`（max-height 56vh 滚动）；无独立搜索页故无「查看更多」，取前 8 条 |
| 搜索逻辑（app.ts） | 模块级 `pagefind` 三态缓存（undefined=未加载 / null=不可用 / 实例，VT 换页不重复加载）；`loadPagefind()` 先 `fetch('/pagefind/pagefind.js', { method:'HEAD' })` 探测再动态 `import`（**变量形式 + @vite-ignore**——字面量在 vite 8 仍被 import-analysis 静态解析导致 dev 崩，orchid 原版同为变量形式）；`runSearch()` 300ms 防抖 + `searchSeq` 递增序号双重丢弃过期响应；结果 `slice(0,8).map(r=>r.data())` 渲染 title（`meta.title` 兜底 url）+ excerpt（pagefind 受限 `<mark>` 片段，非用户输入，innerHTML 安全） |
| 交互接线 | click 委托：`.search-wrap` 外点收起（检查在 handler 开头，palette 同款）；`#searchToggle` 开关 + aria-expanded + 打开即 focus；`.search-item` 点击收起后放行默认导航（VT 接管）；input 委托 `#searchInput` → runSearch；keydown Escape 关浮层（优先于灯箱分支） |
| 索引标记 | 文章页 h1 `data-pagefind-body data-pagefind-weight="10" data-pagefind-meta="title"` + `article.prose` `data-pagefind-body`（h1 在 article 外，双 body 标记；pagefind 语义：出现 body 后只索引含 body 的元素 → 评论/TOC/文章导航天然排除）；`rehypeCodeBlock` 的 `.code-head` 加 `data-pagefind-ignore`（语言标签/复制按钮文本不进索引）；邮箱防爬仅改属性值（编码在 data-encoded-email，不污染文本索引），与 orchid 原版一致不排除 |
| 构建接线 | `site/package.json`：`build = astro build && pagefind --site dist`，devDependencies `pagefind ^1.5.2`；`site/pagefind.yml`：exclude `span.katex` / `span.katex-display` / `[data-pagefind-ignore]` / `.search-pop` / `#searchPop`（浮层自身文本不进索引） |
| i18n | 新增 5 键（search/searchLoading/searchNoResults/searchUnavailable/searchTypeSomething，zh-CN 键源 + en 全量）；placeholder 服务端渲染，其余经 `#qy-ui-labels` 载体（6→10 键）+ UI_FALLBACK 兜底；dev 无索引时提示「搜索索引需构建后可用」 |

**M3b-b6 偏差清单**：

| 偏差 | 原因 | 状态 |
|---|---|---|
| pagefind 包未实际安装 | `pnpm add` 写 store（/Volumes/zhitai/Work/repositories/pnpm/bin/_tmp_*）被沙箱拦（EXDEV + restricted） | package.json 已手动写入 devDependency；**用户需手动执行 `cd site && pnpm add -D pagefind` 后方可 build/preview 真实索引 e2e**；运行时代码已接好线（HEAD 探测 → 动态 import → options → search） |
| rehype.ts 改动未能在 dev 热验证 | config reload 触发 vite deps re-optimize → unlink `site/node_modules/.vite` 缓存被沙箱拦 → "Continuing with previous valid configuration"（旧插件继续运行） | 静态审查确认（properties 加一个 boolean attr，模式与 b4 已验证管线一致）；build 验证随上一条偏差一并补做 |

**M3b-b6 验证记录**（2026-10-11，dev + TRAE browseruse 实测）：

- 搜索按钮渲染于 header-actions 首位（aria-label「搜索」，collapsed）；点击开浮层：aria-expanded=true、浮层显示、input 自动聚焦、placeholder「搜索」
- 输入关键词 → 300ms 防抖 → HEAD 404 → 结果区显示降级提示「搜索索引需构建后可用」✓
- Esc 关闭（浮层隐藏 + aria-expanded=false，且优先于灯箱分支不冲突）；外点收起（点击 banner 空白）→ 浮层隐藏 + input/results 清空 ✓
- VT 客户端换页（首页 → features-demo 文章页）后：按钮存在、开关/Esc 正常（委托监听不失联）
- 文章页 h1 带 data-pagefind-body/weight=10/meta=title、article.prose 带 data-pagefind-body ✓（模板改动 HMR 生效）
- 修复回归：app.ts 动态 import 字面量 → 变量形式（dev 启动不再报 import-analysis 错误，页面 200）

**M3b-b7 实现记录**（✅ 2026-10-11，加密文章 P1-3）：

| 功能 | 实现 |
|---|---|
| 构建期加密 | `utils/crypto.ts`：与原版 `crypto-utils.ts` 算法参数完全一致——PBKDF2-SHA256 100000 轮派生 256 位 key，AES-256-GCM，输出 `base64(salt[16] + iv[12] + authTag[16] + ciphertext)`；**确定性 salt/iv**（`HMAC-SHA256(password, "salt:"+slug / "iv:"+slug)` 截断）→ 同文同密码每次构建产出相同密文，sessionStorage 缓存跨刷新/跨构建稳定有效 |
| 锁组件 | `components/EncryptedContent.astro`（虚拟组件自动可覆写）：Props `{password, slug, hint?}`，构建期 `Astro.slots.render('default')` → `encryptContent`；DOM = `#encryptedContainer.enc-box[data-encrypted][data-slug]`（盾锁 stroke SVG + 标题/描述/条件提示 + 密码表单 + 错误行）+ 兄弟节点 `#decryptedContent.enc-content[hidden]`（解密注入点）；全部文案构建期 `t()` 渲染，无运行时动态文案 |
| 客户端解密 | app.ts `initEncrypted()`（`initPage` 接线，VT 安全）：Web Crypto `importKey(PBKDF2) → deriveKey → decrypt(AES-GCM)`，node:crypto 分离的 authTag 拼接至 ciphertext 尾部（`combined = ct + tag`）后解密；成功 → innerHTML 注入 + 双向 hidden 切换 + `initReveal()` 重跑（b4 mermaid 为构建期静态 SVG，无需重建）+ `sessionStorage['qy-pw:'+slug]` 缓存密码；失败 → 显示错误行；初始尝试缓存密码自动解密，失败则 removeItem |
| 条件接入 | `[...slug].astro`：`d.password ? <EncryptedContent>…<Content/></EncryptedContent> : <Content/>`；**TOC 一并隐藏**（headings 来自构建期明文解析，会在锁旁泄漏标题结构，原版未处理此泄漏）；评论禁用（`d.comment && !d.password`）；License/PostNav 留锁外（无敏感内容）；PostCard/文章页 meta 加文字锁标 `.enc-flag`「已加密」 |
| 范围取舍 | RSS 不改（主题包 RSS 为摘要版只输出 description，无正文泄漏，与原版行为不同故无需原版的 RSS 提示键）；列表锁标用文字而非图标；示例文章 `encrypted-demo.md`（密码 demo1234，中性演示内容） |

**M3b-b7 验证记录**（2026-10-11，dev + TRAE browseruse 实测，示例密码 demo1234）：

- 页面源码零明文：正文 HTML 全量在 `data-encrypted` base64 密文中，明文关键词 grep 计数 0 ✓
- 锁 UI 完整渲染：盾锁图标/「密码保护」标题/描述/「提示：示例密码 demo1234」/占位「请输入密码」/「解锁」按钮 ✓；列表与文章页 meta 锁标「已加密」✓
- 错误密码 → 「密码错误，请重试。」显示、正文保持隐藏、sessionStorage 不写入 ✓
- 正确密码 → 解密渲染（h2/代码块/引用块齐全）、锁 UI 隐藏、`qy-pw:encrypted-demo` 入缓存 ✓
- 刷新页面 → 缓存密码自动解密（确定性 salt/iv 跨构建有效）✓
- TOC 与评论区均不渲染（curl 源码 grep 计数 0）✓
- VT 客户端换页（文章 → 首页 → 返回）后 `initEncrypted` 经 `astro:after-swap` 重接线，缓存密码自动解锁 ✓
- （环境备注：TRAE browseruse 出现 tab 视口归零导致滚动/点击失效，重开 tab 恢复，与主题无关）

**M3b-b8 实现记录**（✅ 2026-10-11，画廊/相册 P1-8；**偏差：LQIP 占位推迟至 b9** 与 OG 图同批处理）：

| 功能 | 实现 |
|---|---|
| 配置 schema | `pages.gallery` 开关（关闭则两路由完全不生成）+ `gallery` 块：`title/description/columnWidth`（瀑布流最小列宽 px，默认 240）+ `albums[]`（`id` 对应 `public/gallery/<id>/`；`name/description/date/location/tags`；`cover` 留空依次取 `cover.*` 文件 → 第一张照片；`password` 非空即加密相册 + `passwordHint`） |
| 照片扫描 | `utils/gallery.ts`（构建期，`process.cwd()/public/gallery/<id>/`）：本地图片文件名排序、`cover.*` 提前；`urls.txt`（每行一个远程 URL，`#` 注释）追加在本地之后；目录不存在 = 空相册（合法，渲染空态）；`buildAlbumIndex` 一次完成扫描+封面+计数 |
| 列表页 | `routes/gallery/index.astro`：`archive-head` + `<gallery-filter>` custom element（`is:inline` + `customElements.get` 防重复 define，VT 换页新 DOM 自动 re-connect）——搜索框（`data-search` 全文匹配）+ 标签 chips（`data-tags` 匹配，`is-on` 态）+ `gallery-grid`（AlbumCard）+ 搜索/筛选无结果空态 |
| 详情页 | `routes/gallery/[album].astro`（getStaticPaths 按 `albums[].id` 展开）：有封面 → `.gallery-banner` 横幅（渐变遮罩 + 左上「返回相册」胶囊 + 标题/描述/日期/地点/照片数/标签 meta）；无封面 → `.gallery-head-plain` 卡式头部降级；照片区 `.gallery-masonry` CSS 多列瀑布流（`--col-width` inline 传入）+ PhotoCard（`data-lightbox-item`） |
| 灯箱组模式 | app.ts 点击委托扩展：`[data-lightbox-group]` 容器内点 `[data-lightbox-item]` → 收集组内全部 `img` → `openLb(items, clickedIdx)` 整组浏览（prev/next/键盘/计数）；明文瀑布流与**解密注入后的**瀑布流同样生效（doc 级委托） |
| 加密相册 | 详情页复用 b7 `EncryptedContent`（slug = album.id）：构建期整块瀑布流加密，锁卡 + 提示语；列表卡 `.lock-badge`「加密相册」锁标（blur 胶囊） |
| 组件/样式 | `AlbumCard.astro`（封面/兜底相机图标/名称/照片数/日期地点/标签 chips slice(0,4)）+ `PhotoCard.astro`；global.css §9 扩展：`.gallery-search/.gallery-empty/.gallery-banner/.gallery-back/.gallery-masonry/.gallery-photo/.album-sub/.album-cover-fallback` 及无封面降级 meta 配色覆盖、`gallery-filter { display: block }` |
| i18n | 8 新键（zh-CN/en 同步）：`galleryPhotos/backToAlbums/searchAlbums/allTags/galleryNoAlbums/galleryNoPhotos/encryptedAlbum/searchAlbumNoResults` |
| 演示数据 | 3 相册（中性，`site/public/` 不忽略可入库）：`demo-spring` 本地 6 张渐变 PNG（含 `cover.png`，临时 Node 脚本生成后即删）；`demo-remote` `urls.txt` 5 张远程图（验证 urls.txt 通路 + photos[0] 兜底封面）；`demo-secret` 加密相册（密码 `orchid2026`）；nav 加「画廊」、`pages.gallery: true` |

**M3b-b8 验证记录**（2026-10-11，dev + TRAE browseruse 实测）：

- 列表页：3 相册卡片、chips「全部/日常/风光/徒步」、搜索框、加密卡锁标与 aria-label ✓
- 筛选：点「徒步」→ 仅春日山行可见；搜索「私人」→ 仅私人胶片可见、空态 hidden ✓
- demo-spring 详情：横幅（cover.png）+ 瀑布流 6 张（cover 首位）+ `--col-width: 240px` ✓
- 灯箱组：点首图 → `1 / 6`（cover.png）→ next 按钮 `2 / 6` → ArrowRight `3 / 6` → Esc 关闭 ✓
- demo-remote：5 张远程照片渲染、photos[0] 兜底封面生效 ✓
- demo-secret：锁卡 + 提示语；错误路径外正确密码 `orchid2026` → 解锁注入 3 张照片 → 灯箱组 `1 / 3` ✓
- VT 客户端换页（列表 → 详情 → 返回相册）后点「日常」chip 筛选正常（gallery-filter re-connect）✓
- 修复记录：详情页 frontmatter 内 JSX 片段赋值在 dev 触发 import-analysis 报错 → 改为模板内条件渲染后正常

**M3b-b9 实现记录**（✅ 2026-10-11，LQIP / OG 分享图 / 相关文章+随机栏 / 分享海报，P1-11/12/13/14，M3b 收尾批次）：

| 项 | 实现 |
|---|---|
| 相关文章（P1-12） | `utils/related.ts`：同标签×2 + 同分类×1 打分取前 count 篇，不足按最新补齐；`RecommendedPost.astro` 构建期渲染 `.related-grid` 卡片（封面 LQIP + 标题 + 日期）；`relatedPosts: { enabled, count, randomCount }` 可配，enabled 才注入数据路由 |
| 随机栏 | 同组件右栏客户端 fetch `/api/allPostMeta.json`（构建期产物，加密文不进随机池），Fisher-Yates 抽 randomCount 篇 |
| OG 分享图（P1-11，默认关） | `routes/og/[...slug].ts`：satori 对象树→1200×630 SVG + sharp 转 PNG；Noto Sans SC woff2 经 Google Fonts CSS2 拉取、模块级缓存，**失败降级 sharp 占位图**（修复原版 satori "No font provided" 崩构建缺陷）；草稿/加密文不生成；`og.enabled` 才 injectRoute（site 未开启 → dist/og 无产物 = 预期） |
| LQIP（P1-14） | `scripts/generate-lqips.mjs`（sharp 三主色 → 18 字符 compact hex）产出 `site/lqips.json`；`vite.ts` themeLqipsPlugin 构建期读取注入 `virtual:theme/lqips`；`utils/lqip.ts` getLqipStyle 内联渐变占位；文章卡/相册卡/照片卡/画廊页封面接入 |
| 分享海报（P1-13） | `scripts/share-poster.ts`：纯浏览器 canvas + qrcode 动态 import 分包（点开才加载）；布局移植原版 `SharePoster.svelte`（850px 宽 / 标题 3 行 clamp / 摘要 6 行 / footer 64px 二维码），数据经按钮 `data-*` 传入；文案读 `#qy-ui-labels` + FALLBACK 兜底；封面失败降级 accent 色块；modal 骨架静态结构 + DOM API 填动态文本（防标题引号破坏属性）；加密文章不出按钮 |
| i18n | 7 新键三处同步（zh-CN.ts / en.ts / `#qy-ui-labels`）：`sharePoster/generatingPoster/copyLink/savePoster/scanToRead/author` |
| 样式 | global.css §18 LQIP 占位层 + §19 分享海报（`.poster-modal` z-index 330 > lightbox 320；poster-fade/pop 动画；reduced-motion 降级） |
| 工程 | theme +`satori` +`sharp` +`qrcode`（dev +`@types/qrcode`）；site scripts +`lqip`；pnpm-workspace.yaml 显式 `storeDir` 绝对路径（绕开 pnpm 临时文件探测在沙箱下的 EXDEV 误报，store 数据位置不变） |

**M3b-b9 验证记录**（2026-10-11，dev + build 实测）：

- dev：首页 LQIP 占位 ✓；普通文章页 `#qy-share-btn` + `.related-grid` ✓；加密文章页无海报按钮 ✓；`/api/allPostMeta.json` 200 ✓；qrcode 进入 Vite deps 优化列表（动态分包生效）✓
- build：115 页构建成功 ✓；dist 首页 LQIP 3 处 ✓；features-demo 页海报按钮 + 推荐栏 ✓；加密页 0 按钮 ✓；`dist/api/allPostMeta.json` 存在 ✓；OG 默认关未注入路由（dist/og 无产物 = 预期）✓
- LQIP 数据：9 张演示图全部生成

### 4.3 P2 —— 拆分处理（2026-10-11 已确认：保留 5 项、暂时舍弃 4 项）

原建议整体舍弃，经确认拆分如下。

**保留（排期靠后，建议 M3b 内或之后穿插）**：

| 功能 | orchid-blog 实现 | 备注 |
|---|---|---|
| hue 动态调色面板（oklch + `--hue` 运行时调节） | `variables.styl`、`DisplaySettings.svelte` | 与静态 `accentColor` 配置共存；提供预设色板 + 自定义 hue |
| i18n | `src/i18n/` | 先建中/英两语框架（可扩展），UI 文案收敛为语言包 |
| PlantUML（服务器渲染） | `plugins/remark-plantuml.js` | 依赖外部渲染服务，文档标注部署要求 |
| 广告位小部件 | `widget/Advertisement.astro` | 可选开关，默认关闭 |
| 邮箱防爬混淆 | `plugins/rehype-email-protection.js` | 成本低 |

**暂时舍弃（不进排期，记录于此便于将来回捞）**：

| 功能 | orchid-blog 实现 | 舍弃理由 |
|---|---|---|
| 音乐播放器（Meting/本地双模式、歌词、全局单例） | `musicConfig.ts`、`features/MusicManager.astro` | 体积与复杂度高，与简约风冲突 |
| 看板娘（Spine + Live2D） | `pioConfig.ts`、`features/SpineModel.astro`、`Live2DWidget.astro` | 同上 |
| 番组/追番页（Bangumi/Bilibili/TMDB API） | `pages/bangumi.astro`、`anime.astro` | 外部 API 依赖重 |
| 背景壁纸系统（4 模式/背景视频/水波纹/樱花/轮播/打字机） | `backgroundWallpaper.ts`、`features/SakuraEffect.astro` | 特效堆砌 |

> 备注：orchid-blog **没有**「动态/说说」功能（仅灯箱里有 `.moment-images` 兼容残留）、**没有**外链中转确认页（仅 `_blank + noopener`）。这两个如果想要属于全新开发，工作量另计。

### 4.4 orchid-blog 全量对照（速查）

| 功能域 | 位置 | 说明 |
|---|---|---|
| 页面路由 ×20 | `src/pages/` | 首页分页、文章页、archive、tags、categories、about、friends、guestbook、sponsor、search、gallery×2、bangumi、anime、rss×2、og、api/allPostMeta.json、robots.txt、404 |
| 组件 ~80 个 | `src/components/`（layout/controls/common/widget/features/pages/comment/analytics/misc 9 组） | 混用 Astro + Svelte 5（本主题**纯 Astro**，不引入 Svelte） |
| 自研插件 ×18 | `src/plugins/` | reading-time/excerpt/mermaid/plantuml/external-links/email-protection/figure/github-card/link-card/image-grid/sectionize 等 |
| 站点配置 ×21 | `src/config/` | site/nav/comment/sidebar/music/friends/gallery/pio/sponsor/wallpaper/effects/expressiveCode/coverImage/license/announcement/analytics/footer/plantuml/mermaid/font |
| 内容集合 | `src/content.config.ts` | posts（17 字段，含 password/pinned/license/comment）+ spec（about/friends/guestbook 正文） |
| 评论 ×5 | `components/comment/` | 组件内嵌脚本，无 npm 依赖 |
| 构建流水线 5 步 | `package.json scripts.build` | 图标生成 → LQIP → astro build → 字体子集化 → pagefind 索引 |
| CI ×5 | `.github/workflows/`、`.gitea/workflows/` | GitHub Pages / rsync 自部署 / 1Panel / build 矩阵 / biome |
| 未使用依赖 | `@astrojs/markdown-satteri`、`satteri` | 源码零引用，迁移忽略 |

### 4.5 M4 工程化实现记录（✅ 2026-10-11 完成）

四批次：CI → biome → 字体子集化 → 发版流程；本地验证全绿，真实验证待 push（见本节末）。

**M4-1 CI 工作流**（22ff823）：

| 项 | 内容 |
|---|---|
| 触发 | push/PR 到 main；`concurrency` 同 ref 取消旧运行 |
| jobs | `lint`（biomejs/setup-biome 固定 2.5.15 执行 `biome check .`）+ `build` 矩阵（Node 20/22 × ubuntu）：checkout → pnpm/action-setup（读根 packageManager）→ setup-node（cache pnpm）→ `pnpm install --frozen-lockfile` → `pnpm test` → LQIP → build（astro build + 字体子集化 + pagefind）→ 校验 `pagefind-entry.json` 产物 |
| 安全基线 | 全 action 按 commit SHA pin（checkout v4.2.2 / setup-node v4.3.0 / pnpm/action-setup v4.1.0 / biomejs/setup-biome v2.5.0）；permissions 最小化 `contents: read` |
| 已知边界 | tag push（v*）不触发 ci.yml → 发布验证由 release.yml 自带（见 M4-4） |

**M4-2 biome 门禁**（1c05149）：

- biome 2.5.15 全仓 format + lint；`pnpm lint`；CI 独立 lint job 执行
- 门禁口径：**0 error 才过**（存量 353 warnings 不阻塞，逐步消化）；新代码必须过 format（tab 缩进 + 双引号 + 行宽 80）
- 暂降级 4 条规则（`noInnerDeclarations` + a11y 三项）待后续批次清理

**M4-3 字体子集化流水线**（7f7e0d2，对应 §4.2 P1-15）：

| 项 | 内容 |
|---|---|
| 与原版差异 | orchid-blog 的 `__SUBSET_FONT_{id}__` 占位符**只有替换方无生成方**（半成品），且原版管线休眠（`selected: system`、唯一本地字体未被引用）→ 主题改用**构建后直接 URL 重写**，不耦合 Astro Font API 与站点 src/config |
| 脚本 | `packages/theme/scripts/subset-fonts.mjs`：读 `site/subset-fonts.json` 清单（`fonts[]: { src, id?, extraChars? }`，**无清单 no-op exit 0**，CI 安全）→ 收集 dist HTML 文本（剥 script/style，收 alt/title/aria-label/placeholder 属性值）→ `subset-font`（wasm/harfbuzzjs）子集化输出 `dist/assets/fonts/{id}.{hash}.woff2`（内容哈希命名，日志含体积对比）→ 重写 dist 内 CSS/HTML 引用（`url()` 与 href/src 两形态）→ 删 dist 原字体 |
| 接线 | site build 链 = `astro build → subset-fonts.mjs → pagefind`；dev 不受影响（public 源文件保留，仅构建产物被子集化） |
| 测试 | `node --test` 内置运行器（根 `pnpm test`，零测试依赖）；3 用例：无清单 no-op / 端到端（woff2 产出 + CSS/HTML 重写 + 子集小于原字体）/ dist 字体缺失（stderr 提示，spawnSync 合并流断言）；fixture 复用主题已有依赖 katex 的 TTF，仓库零二进制增量；`subset-font` 进 theme devDependencies（scripts/ 不在 files 白名单，不随包发布） |
| demo 站取舍 | 不加真实 webfont（当前全系统字体栈）；是否启用子集化属站点设计决策，留 M2.5 站点迁移时定 |

**M4-4 主题包发版流程**（9e4d26b）：

| 项 | 内容 |
|---|---|
| 包名定案 | `@windcoder/astro-theme-orchid`——npm scope `windcoder` 为用户已注册账号（发布硬约束）；GitHub 仓库名 `iwinder/qy-astro-theme-orchid` 与 scope 分离：`repository.url` 指 GitHub、`directory` 标注 monorepo 子目录，互不冲突 |
| 包元数据 | `license: MIT` + 仓库根 LICENSE；`publishConfig: { access: "public", registry: 官方 }`（scoped 包发布必需）；homepage/bugs 指 GitHub |
| release.yml | tag `v*` 触发；permissions `contents: read` + `id-token: write`（provenance）；发布前自带验证：tag 与 package.json 版本一致性校验（不一致 `::error::` 退出）→ `pnpm test` → lqip + 完整 build → `npm publish --provenance`（`NODE_AUTH_TOKEN: secrets.NPM_TOKEN`，working-directory packages/theme） |
| dry-run 验证 | `npm publish --dry-run`：tarball 85 kB，66 文件仅 package.json + `src/**`（files 白名单生效：scripts/site/docs/测试均不随包发布），public access 生效；无私人内容（统计/评论 ID 均为消费方经 schema 注入，包内为空实现） |

**M4 验证口径与真实验证路径**：

- 本地已验证：actionlint（ci.yml + release.yml）、CI 各步骤命令本地逐条跑通、`pnpm lint` 0 error、`pnpm test` 3/3、`pnpm --filter site build` 无回归（62 页 pagefind 索引）、`npm publish --dry-run` 包内容核对
- 待 push 后真实验证：GitHub Actions 页面看 CI 矩阵与 Release 全流程；发版前置 = 仓库 Secrets 配 `NPM_TOKEN`（npmjs.com Automation token，对 @windcoder scope 有发布权）；发版操作 = `git tag v0.1.0 && git push origin v0.1.0`

### 4.6 侧栏体系与文章页交互改造（✅ 2026-10-11 完成）

源自用户 8 条体验反馈；全部本地验证通过（build 62 页 + dev 渲染 + 交互实测）。

| # | 需求 | 实现 |
|---|---|---|
| 1 | 相关/随机文章模块撑破页面横向滚动 | `.related-grid` 改 `repeat(2, minmax(0,1fr))` + `.related-card` 加 `min-width:0; overflow:hidden`（grid item 的 `min-width:auto` 缺省是根因）；tags/categories 页复用同卡片已确认无副作用 |
| 2 | 许可声明可关可改 | `license.prefix/suffix` 自定义声明文案（留空用语言包默认）；`license.enabled` 全站开关；文章 frontmatter `license: false` 按篇关闭、`licenseName/licenseUrl` 按篇覆盖名称与链接（License.astro 统一裁决：文章级开关 false 强制隐藏） |
| 3 | 文章页只有分享没有打赏 | 原「分享海报」按钮行升级为 `.support-card` 支持卡：左侧标题+文案，右侧「打赏支持」（`/sponsor/`）+「生成分享海报」双按钮；`sponsor.showButtonInPost` 控制打赏按钮；share-poster.ts 绑定契约不变（#qy-share-btn + data-*） |
| 4 | 侧栏组件自由配置 | `sidebar.widgets` 数组化：8 种 widget（announcement/categories/tags/friends/calendar/toc/siteInfo/advertisement），数组顺序即渲染顺序，`enabled` 单项开关、`showOnPost` 控制是否出现在文章页侧栏 |
| 5 | 文章页侧栏 | `sidebar.onPost: true` 开启；Sidebar.astro 增加 `variant="post"`（接收 headings/posts 聚合数据）；toc widget 在侧栏内联渲染（原悬浮目录退位）；加密文章不显示侧栏 |
| 6 | 友链首页/内页分配 | friends 条目新增 `featured`：侧栏取样时 featured 优先、其余按 weight 补足（`random: true` 时仍全量洗牌）；友链页不受影响 |
| 7 | 日历热力图 | 新增 Calendar.astro + `<qy-calendar>` custom element（VT 兼容：is:inline + get 防重复 define）：月视图（周一起始、当月发文日高亮、今日描边、翻月不可越界到未来）+ 近 12 月活跃度热力图（每月 4 周段，透明度 5 档 0/.45/.65/.85/1）；数据复用 `/api/allPostMeta.json`，与 random-posts 共享 `window.__qyAllPostMetaCache` |
| 8 | 与参考项目差距 | 已输出对照报告：P0/P1 功能全部落地；仍缺项均为参考项目可选特性（追番页、独立搜索页、音乐播放器、Live2D、壁纸四模式、打字机副标题、布局切换、FloatingTOC、过时提醒、MDX、excerpt），暂不阻塞发布 |

验证记录：dev 全页渲染（首页 widgets 顺序/日历月视图+热力图 12×4/今日标记/翻月边界；文章页侧栏 7 widget + 支持卡双按钮 + 许可行；frontmatter `license: false` 隐藏、`licenseName: "禁止转载"` 覆盖生效后还原）；`pnpm --filter site build` 62 页无回归；控制台仅 Artalk 占位服务器预期报错。i18n 新增键（calendarTitle/activityTitle/dayPostsCount/supportTitle/supportDesc/sponsorMe）zh-CN 与 en 已同步。

### 4.7 文章页左右布局 + 站点配置拆分（✅ 2026-10-11 完成）

源自用户 2 条体验反馈；build 62 页 + dev 渲染 + 多视口探针验证通过。

**1）文章页侧栏左右布局修复**（原症状：侧栏被单独堆在内容下方，无左右分栏）

- 根因：`.post-layout` 断点 1025px 过高——用户视口 ≤1024px（IDE 内置预览等窄窗口）时退化为单列，aside 全宽横在正文下方
- 修复：正文列收拢 `.post-main`（仿参考模板 staticBarClass）——post-header/封面/prose/License/PostNav/支持卡/相关文章/评论全部移入左列，Sidebar/Toc 独占右列；断点 1025→768px（对齐参考模板 md）；`.post-main { min-width: 0 }` 防 nowrap 撑破轨道
- 清理宽度体系割裂：post-header/article-cover/comments 的 max-width（760/900px）与独立居中移除，统一随网格列宽；删除响应式段冗余的 `.post-layout` 覆盖
- 探针实测（iframe 法，iframe 宽度决定内部媒体查询）：1440px → `grid-template-columns: 816px 220px`，license/postNav/comments 与正文列 x/w 完全对齐；900px（原堆叠区间）→ 581px+220px 右列；603px（<768）→ 单列堆叠符合预期；首页 `.home-layout` 无回归

**2）站点配置拆分为多文件**（对齐参考模板 orchid-blog `src/config/` 模式）

- site 侧新增 `site/config/`：siteConfig（siteUrl+元信息+pages 独立页开关）/ navBarConfig / sidebarConfig / friendsConfig / galleryConfig / sponsorConfig / commentConfig / announcementConfig / advertisementConfig / analyticsConfig / licenseConfig / contentConfig（postList/toc/latex/diagram/emailProtection）共 12 个模块文件 + index.ts（组装 `themeConfig` satisfies ThemeConfig + 再导出各模块）
- `packages/theme` index.ts 补命名导出 `export type { ThemeConfig } from "./schema"`（z.input 入参类型）：各拆分文件用 `ThemeConfig["nav"]` 等索引类型标注，解决纯对象字面量宽类型推断问题（如 `provider: "artalk"` 会被推断为 string 而非字面量联合）并获得 IDE 补全
- astro.config.ts 258 行 → 15 行：仅 `site: siteConfig.siteUrl` + `orchidTheme(themeConfig)`；`site` 是 Astro 全局键不属主题入参，故 siteUrl 放在 siteConfig 内
- 验证：7 个独立页（归档/标签/画廊/关于/友链/留言板/打赏）+ 首页 + 文章页全部正常渲染，配置数据完整进入主题；`pnpm build` 62 页 exit 0；控制台仅 Artalk 占位服务器预期报错

### 4.8 侧栏 widget 双向显隐配置（✅ 2026-10-12 完成）

源自用户需求：首页侧栏与内容页侧栏应可分别配置显隐（对齐参考模板 orchid-blog `sidebarConfig.ts` 的 `showOnPostPage` / `hideOnNonPostPage` 双布尔模型）。

**发现的语义 bug**：Sidebar.astro 旧过滤 `isPost ? true : w.showOnPost` 实际效果与 schema 注释**完全相反**——`showOnPost: false` 的 widget 被列表页过滤、只在文章页显示，注释却写「不进文章页侧栏」。

**修复：双布尔正交模型**（单份 widgets 配置派生两页显隐，与参考模板同构）：

| 配置 | 效果 | 参考模板对应 |
|---|---|---|
| 缺省 | 列表页 + 文章页侧栏都显示 | 双 true |
| `showOnPost: false` | 仅首页/列表页显示 | `showOnPostPage: false` |
| `postOnly: true` | 仅文章页侧栏显示（如 toc） | `hideOnNonPostPage: true` |

- schema.ts：widget 对象新增 `postOnly`（默认 false）并修正 `showOnPost` 注释；两处默认 widgets 数组（数组级 default + Zod v4 section 级完整字面量 default）的 toc 均改为 `{ type: "toc", postOnly: true }`
- Sidebar.astro 过滤改为 `w.enabled && (isPost ? w.showOnPost : !w.postOnly)`；文章页侧栏整体开关仍由 `sidebar.onPost`（路由层）把关
- site/config/sidebarConfig.ts：toc 标注 `postOnly: true`，注释重写为双向显隐语义说明

验证记录：`postOnly`（toc）——首页 6 卡（公告/分类/标签/友链/日历/站点信息）无目录，文章页 7 卡含「目录」✓；`showOnPost: false`（临时挂 announcement 实测）——文章页公告消失、首页保留，验证后还原 ✓；`pnpm build` exit 0（115 html / Pagefind 62 页索引）无回归。

### 4.9 公式块可读性修复（✅ 2026-10-12 完成，同日按用户决策改方案）

源自用户反馈：文章页块级公式背景为黑色、公式看不清。

- 根因：remark-math 将 `$$…$$` 序列化为 `<pre><code class="language-math">`；rehype 顺序中 rehypeCodeBlock 在 rehype-katex **之前**运行，math pre 被包进深色 `div.code-block`（bg #1d2124）；katex 替换内层 pre 后，KaTeX 文字取 `currentColor` 继承正文深色 rgb(47,45,42)——深字压深底不可读
- 首版方案（跳过 math 包装）当日被用户否决：**用户要求保留公式块的代码块深底外观**，仅修文字可读性
- **最终方案**：rehypeCodeBlock 维持原状（math 块照常包装、code-head 标 `math`、无复制按钮）；global.css 新增一条规则 `.prose .code-block .katex-display { color: #d6dbdf }`（与代码正文同色系），亮/暗模式均深底浅字可读
- 验证：features-demo 结构恢复 `code-block → code-head(math) → katex-display`，提亮规则注入页面 ✓；theme-override 普通代码块不受影响（未触碰）✓；`pnpm build` 115 页无回归
- 踩坑记录：改 rehype 插件后仅重启 dev server **不够**——Astro content store（`site/.astro/`）缓存旧渲染产物，须先删 `.astro/` 再重启（§7 已有备忘，本次实测再次命中）

### 4.10 图片网格 + GitHub 仓库卡片 + callout 扩充（✅ 2026-10-12 完成）

三特性移植自参考模板 orchid-blog 对应插件，同时补齐 Markdown 指令（directive）语法链路：

**A1 图片网格 `[grid]`**（`remark-image-grid.ts` + global.css `.image-grid`）
- 语法两形态：同段 `[grid] ![a](…) ![b](…) [/grid]`；跨段 `[grid]` 独行、图片段落若干、`[/grid]` 独行（未闭合原样输出不转换）
- 列数 = 网格内图片数（上限 4，无图缺省 2），输出 `div.image-grid[data-cols="N"]`；布局由主题 CSS 按 `data-cols` 生成，不用参考模板的 tailwind 动态拼接类（`md:grid-cols-N` 在 node_modules symlink 源码中不可靠扫描）

**A2 GitHub 仓库卡片**（`remark-directives.ts` + `rehype-github-card.ts` + global.css `.card-github/.gc-*`）
- 语法：`::github{repo="user/repo"}`（leaf 指令，两个冒号）
- 链路：remarkDirectives 将非 admonition 指令经 hastscript 转同名自定义标签 `<github repo="…">` → rehypeGithubCard walk 替换为 `a.card-github.fetch-waiting` 卡片骨架（titlebar + description + infobar）+ 内联脚本客户端 fetch `api.github.com` 回填 star/fork/描述；样式带 hover 反馈，fetch 失败降级显示仓库名

**A3 callout 扩充至 26 种**（`remark-directives.ts` ADMONITION_TYPES）
- GitHub 原生 6 种 + Obsidian 风格别名扩充（abstract/summary/tldr、success/check/done、question/help/faq、failure/missing/fail、danger/error/bug、example、quote/cite、info/todo 等），共用既有 5+2 配色（note/tip/success/question/warning + 引用系/危险系）
- 容器指令双形态：`:::note` 无标题；`:::tip[自定义标题]` 带标题——统一在首段注入 `[!TYPE]` 标记后转 blockquote，**复用既有 rehypeCallouts 渲染**（含图标/配色/暗色模式），零重复实现

**directive 三段处理链**（`index.ts` remarkPlugins，缺一不可）
1. `remarkDirective`（官方 remark-directive）：`:::`/`::`/`:` 语法 → containerDirective/leafDirective/textDirective 节点
2. `remarkDirectives`（自写分发）：26 种 admonition 容器 → blockquote + `[!TYPE]` 标记；其余指令 → `data.hName/hProperties` 同名自定义标签
3. `rehypeGithubCard`：tagName==="github" → 仓库卡片

**版本陷阱（重要踩坑）**：micromark-extension-directive@4.0.0 依赖 micromark-util-character `^2.0.0`，但 **2.0.0 的 `unicodePunctuation` 正则为 `/\p{P}/u`（不含 `\p{S}` 符号类）**——`=` 属 Sm 类不匹配，指令属性状态机 name 在 `=` 处不退出：带 `=` initializer 的属性（`repo="x/y"`、官方 README 例 `key="quoted value"`）全部解析失败回退段落；`{a=b}` 假象通过实为 name 吞掉整体。**2.1.x 起修复为 `/\p{P}|\p{S}/u`**。因 pnpm v11 的 `pnpm up` 不更新 transitive 依赖、overrides 也已迁出 package.json 的 `pnpm` 字段，最终在 **pnpm-workspace.yaml `overrides`** 锁 `micromark-util-character: ^2.1.1`（附注释防回退）
- 排障记录：dev HTML 断言 → 最小复现（remark-parse+remark-directive 纯管线）→ 属性形式二分 → micromark 源码状态机走查 + 注入日志定位 name 未在 `=` 退出 → 对比 unpkg 2.0.0/2.1.1 确认版本差异。期间 index.ts 曾漏挂官方 `remarkDirective`（容器指令失效），已补
- 验证：features-demo 断言 GitHub 卡片 ×2（含 api.github.com 内联脚本/fetch-waiting/gc-description）、image-grid data-cols=4/2、callout info×2 + tip/success/quote/warn 各 1、自定义标题（`[!NOTE] xxx` 与 `:::tip[x]` 两形态）均渲染、无残留 `<github>` 字面标签；`pnpm build` 通过

### 4.11 评论系统五套收官 + 文章过时提醒（✅ 2026-10-12 完成）

兑现决策 3 的「留口」：补齐 Twikoo/Waline/Giscus/Disqus 四套实现，评论适配层五套（含 Artalk）全可切换；同步移植 orchid-blog 的文章过时提醒卡片。

**评论四套组件**（`components/comments/{Twikoo,Waline,Giscus,Disqus}.astro` + `Comment.astro` 分发）
- **Twikoo**：CSS link（`cssUrl` 非空才加载）+ external `jsUrl`（默认 npmmirror CDN 1.7.13）+ inline init；`typeof twikoo === "undefined"` 时 500ms 重试链（`window.__orchidTwikooTimer` 句柄，VT 重进先 clearTimeout 清旧定时器），init 前 `el.innerHTML = ""` 防重复挂载
- **Waline**：unpkg `@waline/client@v3` CSS + inline module `await import(...waline.js)` 动态初始化；`dark: "html.dark"` 跟随主题暗色；`visitorCount` 开启时传 `pageview: true`
- **Giscus**：`<giscus-widget>` 服务端渲染全部配置属性（repo/repoId/category/categoryId/mapping/strict/reactions/emitMetadata/inputPosition/lang/loading）；**esm.sh 版合并为单个 inline module**（`await import("https://esm.sh/giscus")` 幂等——模块缓存使 customElements.define 不重复执行）+ `data-astro-rerun`，MutationObserver 监听 `html.dark` 切 theme（`window.__orchidGiscusObserver` 句柄防泄漏）。对比 orchid 原版（external script + 独立观察器 inline）规避了 VT identical-script 去重导致观察器不重建的隐患
- **Disqus**：`disqus_config` 三件套——`url = Astro.site.href 去尾斜杠 + path`、`identifier = path 去首尾斜杠 || "index"`（与 orchid 的 `removeFileExtension(post.id)` 迁移口径一致，posts/<id> 与 guestbook 通用）、`title` 透传文章标题；重进先移除旧 `#qy-disqus-embed` 再注入 embed.js
- **分发层**：`Comment.astro` 按 `provider` 五路条件分发，新增可选 `title` prop（Disqus 用，缺省回退 path）；`[...slug].astro` 传 `title={d.title}`，guestbook 沿用 `path="/guestbook"` 不变
- schema：provider 枚举扩为 6 值（含 none），四个子配置全部显式完整默认值字面量（Zod v4 `.default({})` 不解析内层默认值铁律）

**过时提醒卡片**（`components/OutdatedCard.astro` + schema `outdated` section + i18n 三键）
- 配置 `{ enabled: true, threshold: 30 }`：距最后更新（`updated ?? published`）超过 threshold 天才显示——与 orchid-blog `showLastModified/outdatedThreshold` 对齐
- **天数必须客户端算**（静态站构建期计算会随访问时间失效）：构建期输出 `hidden` 卡片 + `data-date`（ISO）+ `data-threshold`；inline 脚本（`data-astro-rerun`）算 `daysDiff >= threshold` 才取消隐藏、填充天数文本、显示警告行
- i18n 方案：`data-template` 服务端渲染模板进 DOM（`"，距今已过 {days} 天"`），客户端仅 `replace("{days}")`——绕开 `#qy-ui-labels` 载体扩展，三键（zh-CN/en）进 `t()` 体系
- 位置：许可卡之前，`{!d.password && ...}` 加密文章不渲染；样式为琥珀色警示调卡片（icon 圆角块 + 警告行加重），明暗双模式
- 显隐一律原生 `hidden` 属性（主题无全局 `.hidden` class，仅有 `.album-card.hidden`）

**验证**：dev 重启（config 传递依赖不热更）逐 provider 断言——artalk（`#artalk` + Artalk.css）、twikoo（`#tcomment` + twikoo.min.js，artalk 0 残留）、waline（`#waline` + waline.css/js + serverURL 注入）、giscus（`<giscus-widget>` 全属性 + esm.sh import）、disqus（`#disqus_thread` + disqus_config 三件套 + embed 注入）全部命中后还原 artalk；过时卡片 browser 实测——2013 年旧文卡片显示、天数「4832 天」填充、警告行可见、computed style 琥珀色系生效，features-demo（30 天内）保持 hidden；`pnpm --filter site build` 回归通过（62 页）

### 4.12 站点体验与 SEO 头部优化（✅ 2026-10-12 完成）

审计既有能力（back-top/复制按钮/语言标签/skip-link/reduced-motion/外链新窗口/OG·Twitter/JSON-LD/灯箱键盘均已具备）后的查漏补缺，三件套：

**SEO 头部补全**（`BaseLayout.astro` head）
- `canonical`：`Astro.site` 存在才输出（`new URL(Astro.url.pathname, Astro.site)`），防聚合页重复内容
- `<link rel="alternate" type="application/rss+xml">`：供阅读器自动发现订阅（`Astro.site` 拼绝对地址，缺省回退 `/rss.xml`）
- `og:site_name`（站点名）与 `og:locale`（`config.lang` 的 `-` 转 `_`）
- `theme-color` 双 `media`（light `#f6f4ef` / dark `#131516`）——色值与 global.css `:root` 的 `--bg` 同步，浏览器地址栏跟随深浅模式

**阅读进度条**（`[...slug].astro` 元素 + `.read-progress` 样式 + app.ts 驱动）
- 仅文章页渲染 `<div class="read-progress" id="readProgress" aria-hidden="true">`（post-layout 顶部）；fixed 顶边 3px、`transform: scaleX()` 驱动（零重排），`transform-origin: 0 50%`，accent 渐变，`pointer-events: none`
- 层级 z-index 150：盖过 header(100)、让位 skip-link(200)
- app.ts `updateReadProgress()`：`max = scrollHeight - innerHeight`，`max <= 0`（内容不足一屏）时 `hidden`；scroll 监听合并回调（`updateBackTop` + `updateReadProgress`），另挂 resize 防窗口变化后比例失真；`initPage()` 尾部初始化（VT 换页后元素现查，与 back-top 同模式）

**搜索快捷键**（app.ts keydown + Header title + i18n）
- `/` 或 ⌘/Ctrl+K 打开搜索浮层：新增 `openSearch()`（`pop.hidden = false` + `aria-expanded` + input 聚焦，已开不重复聚焦）
- 守卫：输入态（INPUT/TEXTAREA/SELECT/contenteditable）与灯箱打开时不触发；Alt/Shift 组合跳过；命中即 `preventDefault()`（拦 `/` 的 Firefox 快速查找与 ⌘K 浏览器行为）
- `#searchToggle` 加 `title={t('searchShortcut')}`（zh: 「按 / 或 Ctrl+K 快速搜索」/ en: 「Press / or Ctrl+K to search」），i18n 两语言同步 `UiKey` 推导

**验证**：dev 重启后 curl 断言——首页 canonical/rss alternate/theme-color ×2/og:site_name/og:locale 六项全中且无 read-progress，文章页 canonical 指向文章 URL、进度条元素与按钮 title 命中；`pnpm --filter site build` 回归通过（62 页），dist 产物复核（首页 meta 齐、`read-progress` 文章页 1 次/首页 0 次）。进度条滚动与按键交互的 browser 实测因 IDE 浏览器桥卡死（自动化窗口失焦致输入类事件不生效，导航等待拖垮桥接会话）未能完成，逻辑与已实测的 back-top/closeSearch/点击 toggle 同构，留待手动验证

### 4.13 移动端自适应修复（✅ 2026-10-12 完成）

针对「页面横向滚动/左右晃动」的四项修复（均 global.css）：

- **横向滚动兜底**：`html, body` 加 `overflow-x: hidden`（旧浏览器回退）+ `overflow-x: clip`（clip 不产生滚动容器、不影响 sticky）
- **宽表滚动容器化**：`.prose table` 改 `display: block + width: max-content + max-width: 100% + overflow-x: auto`，多列宽表窄屏内滚不撑破页面
- **长词换行**：prose 区域 `overflow-wrap: break-word`，长英文词/URL 不再撑破窄屏容器
- **小屏留白收紧**（≤640px）：`.shell` 24px→16px，`.post-body`/`.side-card`/`.site-main` 同步收紧

### 4.14 文章 meta 区改造（✅ 2026-10-12 完成）

参考 orchid-blog PostMeta，改造 `routes/posts/[...slug].astro` + global.css：

- **meta 区图标化**：日期/更新时间/字数/时长/置顶/加密 各配 1.75 stroke 内联 SVG；`.post-meta.meta-icons` flex-wrap 自动换行适配窄屏
- **标签行**：分类 chip 保持标题上方，标签 `#tag` chips 移至 meta 行下方（`.post-tags.post-header-tags`）
- **字数/预计阅读时长**：取 remarkPluginFrontmatter 的 `words`/`minutes`（reading-time 插件），有值才渲染（i18n wordsCount/minutesCount）
- **浏览量**：复用评论系统 pageview 能力——artalk/waline 由 SDK init 自动扫描填充选择器（`.artalk-pv-count`/`.waline-pageview-count`），twikoo 由 Twikoo.astro `getCommentsCount` 填充 `#twikoo_visitors`（与 orchid-blog 口径一致）；渲染条件 = 评论启用 + provider 支持计数 + 文章允许评论且未加密（评论不渲染时无数据来源）

### 4.15 分类导航栏 + 个人资料组件（✅ 2026-10-12 完成）

- **CategoryBar**（新组件）：`categoryBar.enabled` 开关（默认 false），挂 BaseLayout `.shell` 内 slot 之前全站生效；组件内自取 `getCollection("posts")` + `collectCategories` 聚合（仅取分类名与计数，不需 hydrate）；结构 = 首页 pill + 归档 pill + 分隔线 + 分类横向滚动区（pill + count 徽标）；激活态用 `Astro.url.pathname` 去尾斜杠后 SSR 判断（首页/归档/分类页），零 JS；i18n 两语言加 categoryNav
- **Profile widget**（新）：schema 加顶层 `profile`（avatar/name/bio/url + links[]{name,url,icon,showName}，icon 为内联 SVG 字符串经 set:html 渲染）+ widgets 枚举加 `"profile"`；Sidebar 渲染 profile-head（头像 56px 圆形，留空渲染首字 fallback）+ profile-name/bar 装饰 + bio + profile-links（外链 target=_blank rel=noopener noreferrer）；三要素全空则整卡不渲染（默认 widgets 数组不含 profile，保持主题中性）
- **site 演示**：新建 `site/config/profileConfig.ts`（name/bio/url + GitHub/邮箱/RSS 三链接），sidebarConfig widgets 首位加 `{type:"profile"}`，siteConfig 加 `categoryBar:{enabled:true}`

### 4.16 配置补齐：nav 子菜单/外链 + footer 自定义 HTML + colorMode（✅ 2026-10-12 完成）

对照 orchid-blog config 差距清单的 P0 三项（postList meta 细化留 P1；effects/music/pio/背景壁纸/keywords/随机封面/双侧栏等维持舍弃，见 §4.3）：

- **nav 子菜单与外链**：nav item 加 `children[]`（label/href/external）与 `external` 标记；children 非空渲染下拉（父项有 href 渲染 a，无则渲染 button `.nav-sub-toggle`，href 可省略）；桌面 hover 纯 CSS 展开 + 无 href 父项点击 toggle `.open-sub`（app.ts 事件委托 + aria-expanded），移动端 ≤860px 静态内联展开；高亮 app.ts `initNavActive` 改「先清全部 `.nav-item.is-active` 再按子链接激活并传播父项」（防同容器内子链接遍历误删父项高亮）
- **footer customHtml**：`footer.customHtml`（默认空串）经 set:html 渲染于 footer-sub 之后（备案号等合规信息刚需，内容安全由作者自担）；留空不渲染
- **colorMode**：顶层枚举 `light/dark/system` 默认 system，作访客未手动选择时的初值——html `data-color-mode` 属性 → boot inline script 兜底（localStorage `qy-mode` 优先）→ app.ts applyPreferredDark 同源逻辑，三处一致防 FOUC/视图切换态不一致
- **site 演示**：navBarConfig 改「首页/归档/标签/画廊 + 更多（children：关于/友链/留言板）」演示下拉与用法注释；siteConfig 加 `colorMode`/`footer` 散键并经 index.ts 组装

**验证**：`pnpm --filter site build` 回归通过（62 页）；dev 重启后 12 项 curl 断言全过——`data-color-mode="system"`、`nav-item has-sub`/`nav-sub-toggle` DOM、下拉 3 子项、footer-custom 留空不渲染（dev 内联 CSS 规则名会污染类名 grep，须按 `<div class="footer-custom">` 元素匹配）、category-bar/profile 回归、首页/归档 pill 激活正确（注意 CategoryBar pill href 为无尾斜杠 `/archive`）

### 4.17 代码高亮双主题（✅ 2026-10-12 完成）

代码块 light/dark 跟随站点深浅模式（P1 备选池，替代原 §4.9 常驻深底方案）：

- **方案**：Astro 内置 Shiki `shikiConfig: { themes: { light, dark }, defaultColor: false }`——token inline style 只写 `--shiki-light:#xxx;--shiki-dark:#yyy` 变量定义（不写 `color:`），由 CSS 按主题取值；与站点 `html.dark` 切换同源（无 FOUC）、零新依赖。orchid-blog 用 astro-expressive-code + JS 切 `data-theme`，不采用
- **schema/config**：顶层 `codeTheme: { light: "github-light", dark: "github-dark" }`（值为 Shiki 内置主题名，schema 默认 github 系）；site 演示接线 siteConfig + index.ts 组装
- **global.css**：`.prose .code-block pre span { color: var(--shiki-light) }` + `html.dark` 下 `color: var(--shiki-dark) !important`（!important 覆盖 inline 变量为切换所必需）；pre 自带 `--shiki-*-bg` 仍由 `background: transparent !important` 压回容器底；代码块容器/head/copy-btn/file/KaTeX 提亮全部双主题化（base=亮色值 + `html.dark` 覆盖=暗色值）——亮色底 `#f6f8fa` 浅底、暗色维持 `#101314` 深底
- **教训**：`defaultColor: false` 下 shiki 不写 `color:` 属性，仅靠 `html.dark` 覆盖会让亮色 token 全部继承 pre 单色（语法高亮丢失）——首验即发现，补 `color: var(--shiki-light)` 亮色规则

### 4.18 CategoryBar 溢出折叠进「更多」下拉（✅ 2026-10-12 完成）

分类按屏幕宽度只展示放得下的一部分，放不下的收进「更多」下拉（orchid-blog 的「更多」实为固定跳转 `/categories/` 链接、溢出走横向滚动，按用户要求实现真折叠）：

- **SSR 双份全量渲染**：滚动区 9 个 pill 与「更多」面板 9 个链接均带 `data-cat={name}` 关联；「更多」按钮/分割线默认 `display:none`——无 JS 时回落为整条横向滚动，完美降级
- **客户端测量**（app.ts `initCategoryBar`）：逐 pill 判溢出（`p.getBoundingClientRect().right - scroll.getBoundingClientRect().left > scroll.clientWidth + 1`，不用 offsetLeft 避开 offsetParent 基准歧义）——溢出 pill 加 `.is-overflow` 隐藏、面板对应项解除 `.is-redundant` 隐藏；有溢出时 `.category-bar.has-more` 显形按钮；`document.fonts.ready` 后重测防字体加载误差；resize 监听经模块级 `catBarResize` 持引用先 remove 再 add（防 VT 换页重复注册泄漏）
- **激活传播**：激活分类被收进面板时「更多」按钮同步 `.is-active`；面板交互与 nav 子菜单同模式（点击 toggle `.open-more` + aria-expanded，document 点击外部关闭）
- **i18n**：zh-CN `more: "更多"` / en `more: "More"`

**验证**：`pnpm --filter site build` 回归通过（62 页）；dev 重启（删 `site/.astro`）后 curl 断言全过——`bar-more`/`bar-more-toggle`/`bar-more-panel` DOM 存在、panel 9 个 `bar-more-link` 与 bar-scroll 9 个 pill 集合一致且 `data-cat`/href 对应（分类实际 9 个）、SSR DOM 无 `has-more`、`aria-expanded="false"` 初始、theme-override 页 17 个 token span 均带 `--shiki-light/-dark` 变量且 CSS 双规则注入。注意：新加的全局 shiki CSS 规则经 dev 内联会污染「页含 --shiki 字样」类断言（无代码块的 hello-world 也命中），token 断言须匹配 `<span style="...--shiki-light...">` 属性级格式

### 4.19 站点级 SEO keywords（✅ 2026-10-12 完成）

配置缺失盘点（对照 orchid-blog 全部 22 个配置文件与 theme schema）后确认补齐的第一项（其余缺失项：favicon 配置化/归档折叠/导航样式开关/pageWidth 等按简约定位或约定路径替代不补，字体系统与 postList meta 细化维持 P1）：

- **schema**：顶层 `keywords: string[]`（default `[]`）——非文章页注入 `<meta name="keywords">`，留空不输出
- **BaseLayout**：Props 加 `keywords?: string[]`（默认 `config.keywords`），`keywords.length > 0` 才输出 meta；文章页传 `keywords={d.tags}` 覆盖（JSON-LD keywords 原本就是 tags，meta 现在与其对齐）
- **site 演示**：siteConfig `keywords: ["技术", "生活", "博客", "Astro"]` + index.ts 组装

### 4.20 导航栏 Logo（✅ 2026-10-12 完成）

同盘点确认补齐的第二项（orchid-blog `navbar.logo` 支持 icon/本地图/网络图三类，主题保持简约只收图片 URL）：

- **schema**：顶层 `logo: string`（default `""`，public 路径或外链），留空只渲染文字标题（向后兼容）
- **Header.astro**：`.site-title` 内 `{logo && <img class="nav-logo" src alt={config.title} />}` 前置于标题文字，alt 复用站点名
- **global.css**：`.site-title` 改 `inline-flex + align-items:center + gap:8px`（不同高度图片垂直居中）；`.nav-logo` 高 26px / 宽 auto / 圆角 5px / `flex:none`
- **site 演示**：`logo: "/favicon.svg"`

**验证（§4.19-4.20）**：`pnpm --filter site build` 回归通过（62 页）；dev 重启后 curl 断言全过——首页 meta keywords = 站点配置、hello-world 文章页 keywords = 「随笔」（该文 tags，覆盖生效）、header `<a class="site-title"><img class="nav-logo" src="/favicon.svg" alt="清言集">清言集</a>` 结构正确。再次踩 dev 坑：Astro dev 给元素加 `data-astro-source-*` 尾属性，DOM 断言正则不能假定 `href="/"` 是开标签末尾

### 4.21 分类栏首页化 +「更多」固定链接（✅ 2026-10-13 完成）

用户反馈两点：① 分类导航横跨全页宽度不合适，应在「置顶/近期文章」上面那一块（首页列宽内）；② 「更多」应始终显示且方便进入分类页面——即回到 orchid-blog 原版「更多 = 分类总览页入口」的语义。**§4.18 的折叠下拉方案整体废弃**：

- **CategoryBar.astro**：删 `bar-more-toggle` 按钮与下拉面板结构，「更多」改为固定 `<a class="category-pill bar-more" href="/categories/">` + 箭头 svg，始终渲染、零客户端依赖；头注释同步 §4.21 行为（仅首页、横向滚动、全量分类见「更多」页）
- **BaseLayout.astro**：移除 `import CategoryBar` 与 `.shell` 内渲染——分类栏不再全站全宽
- **index.astro**：`home-layout > post-list` 顶部插入 `<CategoryBar />`，与置顶/近期文章同列宽（仅首页可见）
- **溢出处理**：从折叠下拉改回横向滚动 + 右缘渐隐——`.bar-scroll` 天然可滚，`.is-scrollable` 时 `mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent)` 提示可滑（只作用于滚动区，不影响「更多」）
- **app.ts**：删 toggle 委托分支与「点击外部关闭」整段；`initCategoryBar` 简化为 `scrollWidth > clientWidth + 1` 检测（`+1` 容差防亚像素抖动），toggle `.is-scrollable`；resize 监听存模块级引用防 VT 换页重复注册泄漏；`document.fonts.ready` 后重测（字体加载改变量宽）
- **schema.ts**：`categoryBar` 注释同步「仅首页 post-list 顶部渲染」

### 4.22 文章 meta 内联（✅ 2026-10-13 完成）

用户反馈：分类/关键字不应「一个在上一个在下」，要像 orchid-blog PostMeta 一样跟在日期后面。对齐 orchid-blog 单行 flex-wrap 结构（置顶 → 日期 → 更新 → 分类 → 标签 → 其余）：

- **posts/[...slug].astro** 三处：① 删标题上方分类 chip；② meta 行 updated 之后插入分类项（书图标 + 文字链接）与标签项（tag 图标 + 文字链接，多标签用 `tag-sep`（`/`）分隔，非逐个 chip）；③ 删 meta 行下方 `post-header-tags` 标签行
- **global.css**：删 `.post-header-tags`；新增 `.post-meta .meta-item a`（`color:inherit` + hover 变 accent 色 + `white-space:nowrap`）、`.tag-sep`（muted 弱化）、`.meta-tags-item`（组内 `flex-wrap` + `row-gap:2px`，标签多时组内换行、整组仍作为一个 meta 项参与整行换行）

**验证（§4.21-4.22）**：build 回归通过（62 页）；dev 重启（杀 4321 + 删 `.astro`）后 curl 断言 17 项全过——首页 bar 在 `post-list` 内且不在 shell 直下、「更多」为 `<a href="/categories/">` 非 button、SSR 无 `is-scrollable`（JS 运行时才加）、归档/分类页无 bar、文章页 post-header 内无 chip、无 `post-header-tags`、meta 行顺序 日期→分类「开始」→标签「随笔」正确。断言方法论沉淀：dev 尾属性须先整体剥离（`data-astro-source-*` + `<style>` 块）再断言；懒惰正则会跨项匹配导致位置比较失真，顺序断言用 `find()` 位置索引

### 4.23 分类栏文章页可见（✅ 2026-10-13 完成）

用户反馈分类导航在文章页面也要能看到。对齐 §4.21 位置语义（不全宽、与正文同列宽），而非恢复 BaseLayout 全站横条：

- **posts/[...slug].astro**：`.post-main` 顶部（post-header 之前）插入 `<CategoryBar />` + 补 import——与首页 post-list 顶部位置对等；文章页激活态由组件内 `Astro.url.pathname` 构建期判断自动命中当前分类 pill；加密文章同样渲染（纯导航无泄漏风险）
- **schema.ts**：`categoryBar` 注释同步「首页 post-list 与文章页 post-main 顶部渲染……关闭则全站不渲染」；CategoryBar.astro 零改动（`config.categoryBar.enabled` 判断内置）
- 范围保持：归档/分类/标签等列表页仍不渲染 bar（用户仅要求文章页）

### 4.24 首页移动端横向溢出修复（✅ 2026-10-13 完成）

用户反馈首页移动端等小窗口未自适应，分类导航栏与文章列表过长导致横向滚动。**根因：grid 隐式下限**——`.home-layout` 单列断点（≤1024px）写裸 `grid-template-columns: 1fr`，`1fr` 等价 `minmax(auto, 1fr)`，轨道下限是被容内容 min-content：分类栏 pill（`white-space:nowrap`、`flex:none`）与文章卡内容把轨道撑到视口宽之外 → 整页横向滚动（双列断点早已是 `minmax(0,1fr) 280px`，故桌面无此问题）。

- **global.css**：`.home-layout` 单列改 `grid-template-columns: minmax(0, 1fr)` + 注释。修复链闭环：轨道下限归零后，bar 内 `.bar-scroll`（`flex:1; min-width:0; overflow-x:auto`）收缩为内部横向滚动，`.post-card`（`min-width:0 + overflow:hidden`）正常截断
- **同类项排查**（均已有防护，无需改）：`.post-layout` 单列已是 `minmax(0,1fr)` + `.post-main` 有 `min-width:0`；`.post-meta`/`.post-tags` 均 `flex-wrap`；`.related-title/desc` 的 nowrap 配 `overflow:hidden + text-overflow`；`.pagination` 项数少无 nowrap
- 浏览器实测尝试：Exec 沙箱内 browser 工具静默失败（无输出无异常），回退 CSS 静态审计 + min-content 机制推演定位根因，dev 断言验证修复落盘

### 4.25 侧边栏组件开关显式化（✅ 2026-10-13 完成）

用户要求侧边栏每个组件像 orchid-blog 一样有启用开关、关闭后任何页面不展示。**能力确认已存在**（§4.15 起）：schema `sidebar.widgets[]` 每项 `enabled`（默认 `true`）/`showOnPost`（默认 `true`）/`postOnly`（默认 `false`）三开关，Sidebar.astro 过滤 `w.enabled && (isPost ? w.showOnPost : !w.postOnly)`——`enabled: false` 即列表页+文章页全站不渲染。本节仅做配置显式化：

- **site/config/sidebarConfig.ts**：9 个 widget 全部显式写出 `enabled: true` + 逐项注释说明「置 false 后该组件在所有页面都不渲染」，向使用者直观暴露开关能力

**验证（§4.23-4.25）**：build 回归通过（62 页）；dev 重启后 curl 断言 12 项全过——首页 bar 在 post-list 内 + sidebar profile 卡（`side-card … profile-card`）在、hello-world 文章页 bar 在 post-main 内且在 post-header 之前 + 「更多」链接在、加密文章页 bar 在、归档页无 bar、源码 `.home-layout` 单列为 `minmax(0,1fr)`。断言修正两处：profile 卡实际 class 是 `profile-card` 非 `widget-profile`；`post-header` 需按 `<header class="post-header` 前缀匹配（带 reveal 后缀）

### 4.26 演示站配置补齐 + 配置热更行为说明（✅ 2026-10-13 完成）

两起：① 用户调整 navBarConfig（首页 →「文章」下拉归档/分类/标签、画廊、更多下拉）后 dev 未生效——根因是 `virtual:theme/config` 为**构建期快照**（themeConfigPlugin 在 astro.config 加载期 `JSON.stringify(config)`，虚拟模块与 site/config/*.ts 无模块图依赖），改配置必须重启 dev，已在 site/config/index.ts 头注释写明；② 全面比对 orchid-blog 配置面查漏。

- **index.ts 组装补齐 6 个 schema 已支持的顶层键**（此前全部走 schema 默认值、未显式暴露）：`lang`（zh-CN）、`huePanel`、`relatedPosts`（5+5）、`og`（**改显式 true**，默认 false）、`sharePoster`、`outdated`（threshold 30）
- **og 开启暴露缺失依赖**：satori/sharp 是主题包 peerDependencies，site 需自装（og 关闭时无感）——`pnpm --filter site add sharp satori` 补齐，build 生成 `/og/<slug>.png` 全量分享图
- **对齐结论**（与 orchid-blog/src/config 逐文件比对）：核心骨架（导航/侧栏/评论/统计/公告/友链/相册/打赏/许可/图表）已对齐；承接映射成立（expressiveCode→Shiki codeTheme、footerConfig→footer.customHtml、mermaid/plantuml→diagram、coverImage→postList.fallbackCover 口）；壁纸/樱花特效/音乐播放器/看板娘/字体子集化/导航搜索/番组页等属主题未实现的能力边界，非配置缺失；giscus mapping 等 demo 未启用 provider 的细化项留待接入真实服务时配置

**验证（§4.26）**：dev 重启后 curl 断言全过——`<html lang="zh-CN">`、nav 含「文章」下拉（归档/分类/标签）、文章页 `og:image` 指向 `/og/hello-world.png`；`pnpm --filter site build` 通过（og 路由生成 7 张分享图、0 error）

### 4.27 导航父项 chevron 标识（✅ 2026-10-14 完成）

对齐 orchid-blog：有子菜单的父项文字后加下拉标识。**Header.astro** 两个父项渲染分支（`<a class="nav-link">` 与 `<button class="nav-link nav-sub-toggle">`）label 后内联 chevron-down SVG（14px，`.nav-caret`）；**踩坑**：frontmatter 定义 JSX 元素常量（`const caret = (<svg…/>)`）触发 PARSE_ERROR——Astro frontmatter 不是 JSX 运行时，改为模板分支内单行内联。**global.css**：`.has-sub > .nav-link` inline-flex 对齐 + 860px 断点 `justify-content: flex-start`；桌面 hover 与移动端 `.open-sub` 展开（§4.16 既有交互，桌面 hover / 移动点击均复用同一 DOM）时 `.nav-caret` 旋转 180°。移动端 burger 折叠菜单内的父项共用同一 DOM 自然带图标。

### 4.28 搜索可用性验证 + 未实现项分批（✅ 2026-10-14 完成）

**结论：导航搜索已实现且可用**（§M3b-b6）：Header 浮层 UI + app.ts 防抖/高亮/键盘导航完整，pagefind 构建期索引 62 页 8009 词；dev 下无索引仅是设计内降级（`searchUnavailable` 提示文案），非缺陷，无需修改。

**「没实现的都实现」分批**：经 12 项逐一调查（机制/依赖/复杂度），本批先做 4 个零外部依赖轻量项（见 §4.30），其余列入下批清单：随机封面（第三方 API，orchid-blog 无随机跳转 API，只有 slug hash 确定性随机图）、音乐播放器（自研 meting/local 双模式，建议 local 先行）、Live2D 看板娘（l2d-widget npm 包）、bangumi 番组页（bgm.tv，建议 dynamic 先行）、pageWidth 全量变量化（主题硬编码 1120/900/760px 待收敛 `--page-width`）、postList 网格/切换（与主题 cover/compact 概念重叠需先决策）、背景壁纸（参考站自述屎山，建议只裁 banner 单模式）、代码块折叠徽章（expressive-code 插件与主题 Shiki 管线架构冲突，需选型决策）。

### 4.30 轻量四项：favicon / timezone / 归档折叠 / 樱花特效（✅ 2026-10-14 完成）

- **favicon 配置**：schema `favicon[]`（src/type/sizes/theme，theme="light"/"dark" 经 `media="(prefers-color-scheme: …)"` 切换双图标）；BaseLayout 非空 map 渲染、空数组回退默认 `/favicon.svg`
- **timezone 配置**：schema `timezone`（IANA 名）；utils.ts `formatDate` 加 `timeZone: config.timezone || undefined`，9 个调用点零改动；utils.ts 已核实仅被构建期引用（app.ts 不 import），虚拟模块引入安全
- **归档按年折叠**（对齐参考站 foldArticle）：schema `archive.fold`；archive.astro fold 开启时年份头渲染为 `button.archive-year`（含 `.year-caret` chevron，aria-expanded），`collapsed = fold && years.length > 1 && i > 0`（最新一年默认展开）；app.ts document 级委托（照 nav-sub-toggle 模式：`classList.toggle("fold")` 返回 true=已收起 → aria-expanded "false"）；CSS：button 原生样式重置 + `.timeline.fold` 收起时间线/旋转 caret
- **樱花特效**：schema `sakura.enabled/density(1-200)`；新建 components/SakuraEffect.astro——**程序化贝塞尔泪滴花瓣（零贴图资产）**，3 档粉调，摆动下落+旋转；**VT 兼容关键**：`<script>`（bundled）+ `astro:page-load` 监听重初始化（body swap 后 canvas 重建），模块级 raf 单例 + cleanup 清旧动画循环与监听；prefers-reduced-motion 停用、visibilitychange 页签隐藏暂停；密度经 `data-density` 属性传递（define:vars 仅 is:inline 可用）

### 4.31 专题（series）功能（✅ 2026-10-14 完成）

方案：**frontmatter 声明式**，零新内容类型。schema `definePostSchema` 加 `series`（专题名）/`seriesOrder`（组内序，缺省排最后）；`PostLike.data` 同步两字段；`pages.series` 开关（默认 true）控制 `/series` 与 `/series/[name]` 路由注入（index.ts，关闭则完全不生成）。

- **/series/ 聚合页**：series 非空分组，卡片=名称+篇数+组内最新更新，按最新发布倒序；空态 `seriesEmpty` 文案
- **/series/[name]/ 详情页**：getStaticPaths 分组，组内 `seriesOrder` 升序（tie-break published 升序）；面包屑回聚合页 + 序号圆标列表
- **文章页专题导航卡**：getStaticPaths 计算 seriesInfo（当前篇位置 cur/total + 完整目录 items），渲染于封面图之后正文之前——当前篇高亮不可点、其余链接跳转，目录限高 280px 滚动，头部有专题页链接与进度 `{cur} / {total}`
- **i18n**：zh-CN 7 键（series/seriesTotal/seriesPostsCount/seriesUpdated/seriesEmpty/seriesProgress/seriesCatalog），en.ts 类型强制同步
- **demo**：3 篇文章（theme-override/hello-world/features-demo）加 `series: 主题使用指南` + seriesOrder 1/2/3；nav「文章」下拉加「专题」入口；siteConfig 开 `archive.fold` 与 `sakura`（density 24）演示 §4.30——**踩坑**：site/config/index.ts 组装层需显式透传新键（`archive: siteConfig.archive, sakura: siteConfig.sakura`），否则走 schema 默认关闭

**验证（§4.27-4.31）**：`pnpm --filter site build` 通过（pagefind 62 页）；dist 断言全过——nav-caret ×2（文章/更多）+ 移动端共用 DOM；`/series/`（1 卡片）与 `/series/主题使用指南/`（3 项）生成；archive 8 个年份组，2026 aria-expanded="true" 无 fold、2013-2025 七组 `timeline reveal fold` + aria-expanded="false"；hello-world 文章页 series-nav 3 项其中 1 项 cur；index.html 含 sakura-canvas + 内联樱花脚本（astro:page-load 监听在）；favicon 未配置走默认。§4.30/4.31 改 site/config 后 dev 需重启（构建期快照，§4.26 口径）。

### 4.32 页宽变量化 pageWidth（✅ 2026-10-14 完成）

对齐参考站 `--page-width` 注入方案：schema 顶层 `pageWidth`（int 800-1920，默认 1120）；BaseLayout `<html style>` 注入 `--page-width:{px}`；global.css 两处硬编码收敛为 `var(--page-width, 1120px)`——`.shell`（主壳最大宽）与 `.post-layout` 桌面双列媒体查询。归档/时间线 760px 窄列不受影响（有意保留阅读行宽）。

### 4.33 随机封面图 randomCover（✅ 2026-10-14 完成）

对齐参考站「确定性随机图」机制：**frontmatter 显式 `image: "api"` 触发**（普通留空/外链图不受影响）。schema `postList.randomCover.apis: string[]`（URL 模板支持 `{slug}` 占位符）。utils.ts 四个导出：`seedHash`（Java String.hashCode 位运算，同 slug 每次构建出同一图，刷新不变）、`appendSeedParam`（`?v=<hash>`，避 CDN 缓存）、`randomCoverUrl`（替换占位符 + 拼 seed）、`resolveCover(image, firstImage, fallback, apis, slug)` → `{ cover, retries }`。**重试链**：img error 不冒泡 → app.ts document **捕获阶段**委托（`addEventListener("error", fn, true)`，bundled 一次性执行 VT 换页后持久），依次换 `data-api-retries` 列表，全挂加 `cover-broken` 类（visibility:hidden 露 LQIP 渐变）。消费点两处：PostCard.astro 列表卡 + 文章页封面 figure（分享海报 `data-cover` 同步用 resolveCover 结果，防 `"api"` 字面量进海报）。

### 4.34 postList 网格/列表切换（✅ 2026-10-14 完成）

对齐参考站 localStorage 方案：schema `postList.allowSwitch` + `postList.gridColumnWidth`（220-600，默认 320）。index.astro / page/[page].astro 容器 `<div class="post-list" id="postList" data-allow-switch data-grid-col>`，标题包 `.list-head`（标题左、`#layoutSwitch` 方按钮右，ic-list/ic-grid 两个 SVG 显隐切换）。**防闪烁双保险**：BaseLayout `is:inline` boot 脚本（首帧前读 localStorage `qy-postList==='grid'` 给 #postList 加 grid-mode + 设 `--col-w`；VT 换页不重执行）+ app.ts `initPostListLayout()`（initPage 链内，VT 换页后接管）；click 委托内切 grid-mode + 写 localStorage。**CSS 布局要点**：`.post-list.grid-mode` = grid `repeat(auto-fill, minmax(var(--col-w),1fr))`；容器内非卡片条目（CategoryBar/标题/分页）`> :not(.post-card)` `grid-column: 1/-1` 占满整行；featured 卡（桌面 7fr/6fr 横排）与 compact 卡（128px+1fr）在网格内覆盖回纵向 flex column；<399px 强制单列。

### 4.35 背景壁纸（banner 单模式）（✅ 2026-10-14 完成）

只裁参考站 banner 形态（其全屏壁纸层自述屎山不搬）：schema 顶层 `wallpaper { src: string|string[]; height: 10-90vh(32); dimOpacity: 0-1(0.2); position; homeOnly(true) }`；src 数组在 BaseLayout 构建期随机取一张（零 JS）。渲染于 Header 后 main 前：Header 为 sticky 半透明毛玻璃 → banner `margin-top: calc(-1 * var(--header-h))` 下沉滑入 Header 底下；`.wallpaper-dim` 黑蒙层 rgba 深浅模式同色；img eager + object-fit cover + object-position 可配。`homeOnly` 时仅 `page === "home"` 渲染。

**验证（§4.32-4.35）**：`pnpm --filter site build` 通过；dist 断言全过——index.html 含 `--page-width:1120px`（全站每页 1 处）+ `wallpaper-banner` + `data-allow-switch="true"` + `#layoutSwitch` + 内联 boot 脚本（qy-postList）；首页/分页含 `?v=<hash>` 随机封面 URL；hello-world 文章页 `data-api-retries`（PostCard 与文章 figure 双消费点）。demo：hello-world 加 `image: "api"`（pinned 置顶演示），`randomCover.apis` 用 picsum seed 模板，`/wallpaper/banner-01.jpg` 横幅图已生成；site/config 显式透传 `pageWidth` + `wallpaper`（§4.31 踩坑复用）。dev 需重启生效。

## 5. 里程碑路线

| 里程碑 | 内容 | 状态 |
|---|---|---|
| **M1 骨架** | monorepo + defineTheme 闭环（首页/文章页/config 校验/override 示例） | ✅ 完成 |
| **M1.5 视觉原型** | 高保真 HTML 原型定视觉：首页/文章页/归档/标签/画廊/友链 + 暗色模式 + hue 调色演示 + 评论位 + 搜索浮层；确认后冻结设计令牌 | ✅ 完成 |
| **M2 内容对齐** | `definePostSchema` 对齐 orchid-blog 全部 frontmatter（补 lang/author/sourceLink/licenseName/licenseUrl/comment）；reading-time、excerpt 插件进主题包 | ✅ 完成（主题包侧） |
| **M2.5 站点迁移** | orchid-blog 私人站点仓库接入 `@windcoder/astro-theme-orchid`（58 篇文章 / 真实域名 / 评论数据）；**主题仓库保持中性 demo，不含任何私人内容** | 待开始 |
| **M3 功能移植** | M3a = P0 全部；M3b = P1 全部（评论先 Artalk，其余 4 套留实现口）+ P2 保留 5 项（hue 调色/i18n/PlantUML/广告位/邮箱防爬） | **M3a ✅ 完成（2026-10-11，含偏差清单见 §4.1）**；**M3b ✅ 完成（2026-10-11，b0-b9 九批次全过：P1 全部 + P2 保留 5 项，批次划分见 §4.2；b8 的 LQIP 占位已并入 b9）**；**评论五套收官 + 过时提醒 ✅ 补齐（2026-10-12，见 §4.11，决策 3 留口兑现）** |
| **M4 工程化** | CI（build 矩阵 + 发布流）、biome、字体子集化、主题包发版流程 | ✅ 完成（2026-10-11，实现记录见 §4.5；CI/Release 真实验证待 push） |

## 6. 决策记录（2026-10-11 确认）

1. **先出高保真 HTML 原型定视觉**，再进 M2 —— 当前阶段
2. **P1 全部采用**：4.2 表 17 项都要（含 LQIP；随机封面维持舍弃）
3. **评论方案**：先实现 Artalk（站点当前在用）；Twikoo/Waline/Giscus/Disqus 留出统一实现口（评论适配层）
4. **P2 拆分**：保留 hue 动态调色 / i18n / PlantUML / 广告位 / 邮箱防爬；暂时舍弃音乐播放器 / 看板娘 / 番组追番 / 背景壁纸特效
5. **视觉基线**：强调色默认青瓷绿 `#4a9d8f`（配置可改 + hue 预设切换），字体方案随原型确认后冻结
6. **发布渠道**（2026-10-11 确认）：npm 公开发布——scope 定为 `@windcoder`（用户 npm 账号）；GitHub 仓库名 `iwinder`（原账号被抢注）与 npm scope 分离，互不影响；发版走 release.yml（tag v* → 验证 → `npm publish --provenance`），前置配置仓库 Secrets `NPM_TOKEN`
7. **文章列表展示样式可配置**（2026-10-11 补充）：主题配置 `postList.style: 'cover' | 'compact'`（默认 cover 图卡；compact 为紧凑行，小图 + 单行摘要），文章 frontmatter `cardStyle: 'cover' | 'compact' | 'text'` 按篇覆盖、可混排；无封面文章自动降级为纯文字卡（text）。原型首页演示全部四种形态（featured 大图 / cover 图卡 / compact 图行 / compact 文字行）
8. **友链双形态**（2026-10-11 补充）：同一数据源（`friends.yaml`：名称/头像/描述/链接/权重/启用）驱动两处渲染——首页侧栏友链 widget（`sidebar.friends: { enabled, count, random }`，默认开、显示 3 条）+ 友链内页全量渲染；widget 可整体关闭
9. **封面图三级回退**（2026-10-11 补充）：frontmatter `cover`（手动指定，优先级最高）> 正文首图（构建时 rehype 插件提取第一张 `<img>` 的 src 存入文章元数据）> 自动降级纯文字卡（`postList.fallbackCover` 可选配置默认占位图，默认不启用）。写文章无需为封面单独配图
10. **仓库内容边界**（2026-10-11 修正）：主题仓库（monorepo + site demo）保持中性、可公开——site 的 git 库中仅含中性示例文（hello-world / theme-override）与占位域名 `blog.example.com`；私人内容（真实域名 orchid.windcoder.com、评论数据）归属 orchid-blog 私人站点仓库接入。**允许本地开发用真实文章验证主题**：58 篇文章经 `.gitignore` 隔离在 site 本地（`site/src/content/posts/*` 忽略、示例文反排除），永不入库、不进 git 历史。主题包能力（schema 17 字段、reading-time/excerpt 插件）为通用功能，正常保留。LQIP 仅对本地图片生效——orchid-blog 图片全外链，待站点迁移后如出现本地图再启用
11. **reading-time / excerpt 口径**（2026-10-11 确认）：零依赖自实现（不引 mdast-util-to-string）。字数 = CJK 字符数 + 非 CJK 单词数，阅读时长 = max(1, round(words / 275))；摘要 = 第一个 paragraph 节点的纯文本（忽略 html/image/code）。两插件渲染期写入 `remarkPluginFrontmatter`（不经 zod 校验），组件经 `render(post)` 读取

## 7. 工程备忘

- 开发：仓库根 `pnpm --filter site dev`；构建：`pnpm --filter site build`；测试：`pnpm test`（node:test 内置运行器）；lint：`pnpm lint`（biome，0 error 门禁）
- 依赖安装（TRAE 沙箱环境，实测有效版；**pnpm 数据只允许落在 `/Volumes/zhitai/Work/repositories/pnpm`，禁止在项目内建 store/cache**；曾用的项目内 `.npmrc` TMPDIR store 重定向与 `.pnpm-store/` 残留已于 b4 清除，`.npmrc`/`.pnpm-store/` 已入 .gitignore，装包只走下面 env 方式）：
  ```bash
  pnpm_config_store_dir=/Volumes/zhitai/Work/repositories/pnpm/bin/store pnpm_config_cache_dir=/Volumes/zhitai/Work/repositories/pnpm/cache pnpm install --no-frozen-lockfile
  ```
  要点：① pnpm 11 对**非 `~/` 开头的显式 store 路径跳过探测**（探测会在挂载根建 `_tmp_*` 硬链接探针被沙箱拦截）；② env 前缀是 `pnpm_config_` 且**必须下划线形式**（`npm_config_*`、连字符变体均无效）；③ TRAE 终端被判定 CI → frozen-lockfile 默认 true，锁文件有变更时加 `--no-frozen-lockfile`。本机终端正常装包不受此影响
- ⚠️ TRAE 沙箱拦截 unlink/rmdir（EXDEV）：`astro build` 的正常清理、astro dev 的 `.astro/dev.json` 锁清理、pnpm store WAL 清理均会失败——锁文件被拦时用 IDE 删除工具清掉再重启；**build 请在本机终端跑**；删除文件/目录一律走 IDE 删除工具
- override 新增/移动文件后需重启 dev server（Vite 虚拟模块 resolveId 缓存）；**修改主题包内 integration/index.ts 后也需重启**（Vite 不监听 workspace 包内文件）
- Astro 7 markdown：JS 插件必须走 `markdown.processor: unified({...})`（`@astrojs/markdown-remark`），legacy `remarkPlugins/rehypePlugins` 字段只触发警告不生效
- ⚠️ **unified 插件数组铁律**：元素一律是 attacher（插件工厂本体），带参用 `[plugin, options]` 元组；**绝不能 push 已调用的 transformer**（如 `remarkMermaid()`）——freeze 时会被当 attacher 二次调用（首参 tree=undefined）报 `Cannot read properties of undefined (reading 'children')`，插件静默失效且与文档内容无关（详见 §4.2 b4 记录）
- integration 更新 markdown processor 后 content store 不自动清除——重启 dev 前删 `site/.astro/` 可排除陈旧缓存干扰
- Astro 组件 frontmatter（`---` 区）**不能包含 JSX**（返回 JSX 的箭头函数会在 vite import analysis 报 invalid JS syntax），JSX 片段只能写在模板区
- ⚠️ **Astro 7.3.8 捆绑 Zod v4：`.default({})` 不解析内层默认值**（`.default({})` 命中即短路返回 `{}` 原值，内层字段的 default 全部丢失，实测 `z.object({a: z.boolean().default(true), b: z.object({c: z.number().default(3)}).default({})}).parse({})` → `{a: true, b: {}}`）。schema.ts 惯用法：**object section 的 default 必须写显式完整默认值字面量**（如 `.default({ enabled: true, name: '...' })`），嵌套层同理；新增配置 section 时一并遵守，否则该 section 缺省配置时站点运行期 `undefined` 500
- 主题包版本升级策略：功能进 `minor`、修复进 `patch`、破坏性配置变更进 `major` 并保留 default 回退
- ⚠️ **astro.config.ts 的传递依赖（`site/config/*.ts`）变更不触发 dev server 自动重启**——astro 只 watch astro.config.ts 本身的 mtime，其 import 依赖图（config 拆分文件）变化不产生 restart 日志（与参考模板 config 为 src 内组件级 import 有 HMR 的架构不同）；改配置后必须手动重启 dev server 再验证（§4.8 实测）
