---
title: URL 迁移与重定向：旧博客链接迁到 /posts/
description: 从旧站扁平路径 /slug/ 迁到主题 /posts/slug/ 的完整处理——为什么保留前缀、部署平台 301 与 Astro redirects 两种方案与选型、迁移检查清单。
published: 2026-10-18
tags:
  - 主题机制
  - 部署
category: 技术
series: 主题使用指南
seriesGroup: 进阶
seriesOrder: 29
---

从旧博客（Hugo、Hexo、WordPress 等）迁移过来的站点，旧文章 URL 常是根路径扁平形式：

```
https://example.com/xianliao-java-yuanmazhongdexianchengchuangjian/
```

而主题默认的文章路径是带前缀的：

```
https://example.com/posts/xianliao-java-yuanmazhongdexianchengchuangjian/
```

旧链接已被搜索引擎收录、被别人引用过，直接换结构会全部 404。本文讲怎么处理——**保留新结构、旧链接重定向过来**，既保住 SEO 又不需要改主题。

## 为什么文章路径带 /posts/ 前缀

根路径是站点级路由的地盘，主题把它留给了功能页与独立页：

| 根路径 | 用途 |
|---|---|
| `/` | 首页 |
| `/page/[n]` | 首页列表分页 |
| `/archive` | 归档页 |
| `/tags` / `/tags/[tag]` | 标签聚合与详情 |
| `/categories` / `/categories/[category]` | 分类聚合与详情 |
| `/series` / `/series/[name]` | 专题聚合与详情 |
| `/about` / `/friends` / `/guestbook` / `/sponsor` / `/gallery` | 独立页面（按开关注入） |
| `/og/[slug]` | OG 分享图 |
| `/api/*` | 数据接口（随机推荐等） |
| `/rss.xml` / `/robots.txt` / `/404` | 站点级文件 |

如果文章也铺在根路径下，slug 一旦撞名（比如一篇文章叫 `series` 或 `about`）就是路由冲突——构建报错或页面互相覆盖。这也是 Hugo / Hexo / Fuwari 系主题默认都带 `/posts/` 或 `/archives/` 前缀的原因：**前缀是内容与功能路由的隔离带**。

## 方案选型

| 方案 | 适用场景 | SEO 效果 | 成本 |
|---|---|---|---|
| A：部署平台 301 重定向 | 文章 slug 与旧站一致 | 最佳（真 301，权重直转） | 一条规则 |
| B：Astro redirects 配置 | slug 有变化，或平台层不便配置 | 良好（canonical 转移权重） | 生成映射表 |
| C：改主题扁平化路由 | 有极强历史包袱的诉求 | 与 A/B 相同 | 高，且引入冲突风险 |

先确认一件事：**旧站 URL 尾段（slug）迁移成文章文件名后变没变？** 没变走 A 最省事；变了则 A、B 都需要映射表，推荐 B。

## 方案 A：部署平台 301（slug 未变时首选）

一条通配规则覆盖全部旧文章，同时排除上表的保留路径。

### Nginx（自建服务器）

```nginx
# 旧扁平文章 URL → /posts/<slug>/，负向前瞻排除保留路径
rewrite ^/(?!about|friends|guestbook|sponsor|gallery|series|archive|tags|categories|page|api|og|rss\.xml|robots\.txt)([a-z0-9-]+)/?$ /posts/$1/ permanent;
```

### Cloudflare Pages / Netlify

项目 `public/` 下放 `_redirects` 文件（构建时原样拷入产物）：

```
/xianliao-java-yuanmazhongdexianchengchuangjian /posts/xianliao-java-yuanmazhongdexianchengchuangjian/ 301
```

这两个平台的 `_redirects` 通配能力有限（不支持正则排除），slug 未变时更简单的做法是**方案 B 由 Astro 构建期枚举生成**，见下。

### Vercel

`vercel.json` 支持正则（`statusCode: 301`），写法与 Nginx 同思路：

```json
{
	"redirects": [
		{
			"source": "/:slug((?!about$|friends$|guestbook$|sponsor$|gallery$|series$|archive$|tags$|categories$|page$|api$|og$).*)",
			"destination": "/posts/:slug/",
			"statusCode": 301
		}
	]
}
```

## 方案 B：Astro redirects 配置

`site/astro.config.ts` 的 `redirects` 键，逐条声明「旧路径 → 新路径」：

```ts
// site/astro.config.ts
export default defineConfig({
	// ...
	redirects: {
		"/xianliao-java-yuanmazhongdexianchengchuangjian":
			"/posts/xianliao-java-yuanmazhongdexianchengchuangjian/",
		"/shenyong-vue3-pianfa": "/posts/shenyong-vue3-pianfa/",
		// …每篇旧文章一条
	},
});
```

两个行为细节：

- **静态构建模式**下，Astro 会为每条规则在旧路径生成一个 HTML（`<meta http-equiv="refresh">` + 指向新路径的 `<link rel="canonical">`），搜索引擎按 canonical 转移权重；
- 部署到支持平台级重定向的托管时（如 Netlify/Vercel adapter），Astro 会自动升级为平台的真 301 规则。

### 旧文章多：从 sitemap 生成映射表

逐条手写不现实，写个一次性脚本从旧站 sitemap 抓取生成：

```ts
// scripts/gen-redirects.mjs（一次性运行：node scripts/gen-redirects.mjs）
// 从旧站 sitemap.xml 提取全部文章 URL，生成 redirects 对象供 astro.config 使用
const res = await fetch("https://example.com/sitemap.xml");
const xml = await res.text();
const slugs = [...xml.matchAll(/<loc>https:\/\/example\.com\/([^<]+?)\/?<\/loc>/g)]
	.map((m) => m[1])
	// 排除保留路径（与上表一致）
	.filter((s) => !/^(about|friends|guestbook|sponsor|gallery|series|archive|tags|categories|page|api|og|rss\.xml|robots\.txt)/.test(s));

const redirects = {};
for (const slug of slugs) redirects[`/${slug}`] = `/posts/${slug}/`;
console.log(JSON.stringify(redirects, null, "\t"));
```

输出的对象贴进（或以 JSON import 进）`astro.config.ts` 即可。

**slug 变了的情况**：脚本产物里对改名文章手工修正目标路径即可——映射表本来就是要过目一遍的。

## 方案 C：为什么不建议改回扁平

- 文章路由 `/posts/[...slug]` 由主题 integration 经 `injectRoute` 注入，站点侧无法覆盖；要改得动主题本体并新增配置项；
- 扁平化后 slug 与根路径保留名（`/about`、`/series` 等）的冲突需要构建期校验兜底；
- 主题内所有互链——RSS `link`、OG 分享图、相关推荐、`canonical`、sitemap——都按 `/posts/` 拼接，扁平化要全链路改造。

结论：迁移期用重定向过渡，比永久背负扁平结构的冲突风险划算。

## 迁移检查清单

1. 备份旧站 `sitemap.xml`（映射表的唯一数据源）
2. 确认每篇旧文章的 slug 是否与迁移后的文件名一致
3. 按上表选型：slug 一致 → 方案 A（Nginx/Vercel 通配）或方案 B（脚本生成）；slug 有变化 → 方案 B + 手工修正
4. 部署重定向后，用旧 URL 实测跳转（浏览器无痕窗口 + `curl -I` 看响应码）
5. Google Search Console 提交新 sitemap，观察「网页索引」从旧 URL 向新 URL 转移
6. 若同时更换了域名：旧域名整站 301 到新域名（DNS/托管层做，与本文规则叠加）

## 相关阅读

- 站点路由总览与独立页开关见[站点基础配置](/posts/site-config/)的「页面开关」组
- RSS 输出格式（含 `/posts/` 链接口径）见主题源码 `rss.xml.ts`，写作侧见[写作指南](/posts/writing/)
