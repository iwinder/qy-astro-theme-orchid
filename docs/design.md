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

## 5. 里程碑路线

| 里程碑 | 内容 | 状态 |
|---|---|---|
| **M1 骨架** | monorepo + defineTheme 闭环（首页/文章页/config 校验/override 示例） | ✅ 完成 |
| **M1.5 视觉原型** | 高保真 HTML 原型定视觉：首页/文章页/归档/标签/画廊/友链 + 暗色模式 + hue 调色演示 + 评论位 + 搜索浮层；确认后冻结设计令牌 | ✅ 完成 |
| **M2 内容对齐** | `definePostSchema` 对齐 orchid-blog 全部 frontmatter（补 lang/author/sourceLink/licenseName/licenseUrl/comment）；reading-time、excerpt 插件进主题包 | ✅ 完成（主题包侧） |
| **M2.5 站点迁移** | orchid-blog 私人站点仓库接入 `@windcoder/astro-theme-orchid`（58 篇文章 / 真实域名 / 评论数据）；**主题仓库保持中性 demo，不含任何私人内容** | 待开始 |
| **M3 功能移植** | M3a = P0 全部；M3b = P1 全部（评论先 Artalk，其余 4 套留实现口）+ P2 保留 5 项（hue 调色/i18n/PlantUML/广告位/邮箱防爬） | **M3a ✅ 完成（2026-10-11，含偏差清单见 §4.1）**；**M3b ✅ 完成（2026-10-11，b0-b9 九批次全过：P1 全部 + P2 保留 5 项，批次划分见 §4.2；b8 的 LQIP 占位已并入 b9）** |
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
