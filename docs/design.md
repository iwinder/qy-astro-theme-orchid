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
| 15 | 字体子集化 | Astro Font API + 构建时 subset-font | `config/fontConfig.ts`、`scripts/subset-fonts.ts` | 中 | 中文字体性能关键，M4 做 |
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

## 5. 里程碑路线

| 里程碑 | 内容 | 状态 |
|---|---|---|
| **M1 骨架** | monorepo + defineTheme 闭环（首页/文章页/config 校验/override 示例） | ✅ 完成 |
| **M1.5 视觉原型** | 高保真 HTML 原型定视觉：首页/文章页/归档/标签/画廊/友链 + 暗色模式 + hue 调色演示 + 评论位 + 搜索浮层；确认后冻结设计令牌 | ✅ 完成 |
| **M2 内容对齐** | `definePostSchema` 对齐 orchid-blog 全部 frontmatter（补 lang/author/sourceLink/licenseName/licenseUrl/comment）；reading-time、excerpt 插件进主题包 | ✅ 完成（主题包侧） |
| **M2.5 站点迁移** | orchid-blog 私人站点仓库接入 `@windcoder/astro-theme-orchid`（58 篇文章 / 真实域名 / 评论数据）；**主题仓库保持中性 demo，不含任何私人内容** | 待开始 |
| **M3 功能移植** | M3a = P0 全部；M3b = P1 全部（评论先 Artalk，其余 4 套留实现口）+ P2 保留 5 项（hue 调色/i18n/PlantUML/广告位/邮箱防爬） | **M3a ✅ 完成（2026-10-11，含偏差清单见 §4.1）**；M3b 进行中（b0/b1 ✅ 2026-10-11，批次划分见 §4.2） |
| **M4 工程化** | CI（build 矩阵 + 发布流）、biome、字体子集化、主题包发版流程 | 待开始 |

## 6. 决策记录（2026-10-11 确认）

1. **先出高保真 HTML 原型定视觉**，再进 M2 —— 当前阶段
2. **P1 全部采用**：4.2 表 17 项都要（含 LQIP；随机封面维持舍弃）
3. **评论方案**：先实现 Artalk（站点当前在用）；Twikoo/Waline/Giscus/Disqus 留出统一实现口（评论适配层）
4. **P2 拆分**：保留 hue 动态调色 / i18n / PlantUML / 广告位 / 邮箱防爬；暂时舍弃音乐播放器 / 看板娘 / 番组追番 / 背景壁纸特效
5. **视觉基线**：强调色默认青瓷绿 `#4a9d8f`（配置可改 + hue 预设切换），字体方案随原型确认后冻结
6. **发布渠道**：待定（npm 公开 / Gitee + 私有 registry / 仅本地 workspace），不阻塞开发
7. **文章列表展示样式可配置**（2026-10-11 补充）：主题配置 `postList.style: 'cover' | 'compact'`（默认 cover 图卡；compact 为紧凑行，小图 + 单行摘要），文章 frontmatter `cardStyle: 'cover' | 'compact' | 'text'` 按篇覆盖、可混排；无封面文章自动降级为纯文字卡（text）。原型首页演示全部四种形态（featured 大图 / cover 图卡 / compact 图行 / compact 文字行）
8. **友链双形态**（2026-10-11 补充）：同一数据源（`friends.yaml`：名称/头像/描述/链接/权重/启用）驱动两处渲染——首页侧栏友链 widget（`sidebar.friends: { enabled, count, random }`，默认开、显示 3 条）+ 友链内页全量渲染；widget 可整体关闭
9. **封面图三级回退**（2026-10-11 补充）：frontmatter `cover`（手动指定，优先级最高）> 正文首图（构建时 rehype 插件提取第一张 `<img>` 的 src 存入文章元数据）> 自动降级纯文字卡（`postList.fallbackCover` 可选配置默认占位图，默认不启用）。写文章无需为封面单独配图
10. **仓库内容边界**（2026-10-11 修正）：主题仓库（monorepo + site demo）保持中性、可公开——site 的 git 库中仅含中性示例文（hello-world / theme-override）与占位域名 `blog.example.com`；私人内容（真实域名 orchid.windcoder.com、评论数据）归属 orchid-blog 私人站点仓库接入。**允许本地开发用真实文章验证主题**：58 篇文章经 `.gitignore` 隔离在 site 本地（`site/src/content/posts/*` 忽略、示例文反排除），永不入库、不进 git 历史。主题包能力（schema 17 字段、reading-time/excerpt 插件）为通用功能，正常保留。LQIP 仅对本地图片生效——orchid-blog 图片全外链，待站点迁移后如出现本地图再启用
11. **reading-time / excerpt 口径**（2026-10-11 确认）：零依赖自实现（不引 mdast-util-to-string）。字数 = CJK 字符数 + 非 CJK 单词数，阅读时长 = max(1, round(words / 275))；摘要 = 第一个 paragraph 节点的纯文本（忽略 html/image/code）。两插件渲染期写入 `remarkPluginFrontmatter`（不经 zod 校验），组件经 `render(post)` 读取

## 7. 工程备忘

- 开发：仓库根 `pnpm --filter site dev`；构建：`pnpm --filter site build`
- 依赖安装（TRAE 沙箱环境，实测有效版；**pnpm 数据只允许落在 `/Volumes/zhitai/Work/repositories/pnpm`，禁止在项目内建 store/cache**）：
  ```bash
  pnpm_config_store_dir=/Volumes/zhitai/Work/repositories/pnpm/bin/store pnpm_config_cache_dir=/Volumes/zhitai/Work/repositories/pnpm/cache pnpm install --no-frozen-lockfile
  ```
  要点：① pnpm 11 对**非 `~/` 开头的显式 store 路径跳过探测**（探测会在挂载根建 `_tmp_*` 硬链接探针被沙箱拦截）；② env 前缀是 `pnpm_config_` 且**必须下划线形式**（`npm_config_*`、连字符变体均无效）；③ TRAE 终端被判定 CI → frozen-lockfile 默认 true，锁文件有变更时加 `--no-frozen-lockfile`。本机终端正常装包不受此影响
- ⚠️ TRAE 沙箱拦截 unlink/rmdir（EXDEV）：`astro build` 的正常清理、astro dev 的 `.astro/dev.json` 锁清理、pnpm store WAL 清理均会失败——锁文件被拦时用 IDE 删除工具清掉再重启；**build 请在本机终端跑**；删除文件/目录一律走 IDE 删除工具
- override 新增/移动文件后需重启 dev server（Vite 虚拟模块 resolveId 缓存）；**修改主题包内 integration/index.ts 后也需重启**（Vite 不监听 workspace 包内文件）
- Astro 7 markdown：JS 插件必须走 `markdown.processor: unified({...})`（`@astrojs/markdown-remark`），legacy `remarkPlugins/rehypePlugins` 字段只触发警告不生效
- Astro 组件 frontmatter（`---` 区）**不能包含 JSX**（返回 JSX 的箭头函数会在 vite import analysis 报 invalid JS syntax），JSX 片段只能写在模板区
- ⚠️ **Astro 7.3.8 捆绑 Zod v4：`.default({})` 不解析内层默认值**（`.default({})` 命中即短路返回 `{}` 原值，内层字段的 default 全部丢失，实测 `z.object({a: z.boolean().default(true), b: z.object({c: z.number().default(3)}).default({})}).parse({})` → `{a: true, b: {}}`）。schema.ts 惯用法：**object section 的 default 必须写显式完整默认值字面量**（如 `.default({ enabled: true, name: '...' })`），嵌套层同理；新增配置 section 时一并遵守，否则该 section 缺省配置时站点运行期 `undefined` 500
- 主题包版本升级策略：功能进 `minor`、修复进 `patch`、破坏性配置变更进 `major` 并保留 default 回退
