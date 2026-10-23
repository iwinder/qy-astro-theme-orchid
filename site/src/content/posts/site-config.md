---
title: 站点基础配置：siteConfig 全部可配置项
image: api
description: siteConfig 模块 17 个配置键的完整参考——按基础信息、站点标识、语言时区、强调色派生机制、页宽算法、深浅模式、独立页开关与页脚备案等功能组讲解。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 3
---

`siteConfig` 是整个主题的"身份证"模块，只负责**站点身份与全站开关**。
视觉特效、文章功能等分属其它模块（见[系列导览](/posts/getting-started/#本系列导览)），
本文逐键讲清 `site/src/config/siteConfig.ts` 的全部可配置项。

**配置文件**：`site/src/config/siteConfig.ts`

最小可用的 `siteConfig` 只需要域名和标题——其余键全部有合理默认值，主题无必填配置项（`title` 不配置时用 `"Orchid Blog"` 兜底）：

```ts
// site/src/config/siteConfig.ts
export const siteConfig = {
	siteUrl: "https://example.com", // 接入真实站点时必改
	title: "我的博客",
};
```

## 基础信息

域名、站点名、描述、SEO 关键词与作者名——站点对外的身份信息，供 `<title>`、meta、RSS 与版权行输出。`siteUrl` 会同步写进 [astro.config.ts](file:///Volumes/zhitai/Work/progarm/web/gitee.com/qy-astro-theme-orchid/site/astro.config.ts) 的 `site` 键，两处保持一致。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `siteUrl` | `string` | 无 | 站点域名，RSS / sitemap / canonical 的基准；同时供 `astro.config.ts` 的 `site` 键使用 |
| `title` | `string` | `"Orchid Blog"` | 站点名，导航栏标题、`<title>` 后缀、RSS 标题 |
| `description` | `string` | `""` | 站点描述，首页与 meta description 默认值 |
| `keywords` | `string[]` | `[]` | 站点级 SEO keywords；文章页由 frontmatter `tags` 覆盖；留空不输出 |
| `author` | `string` | `""` | 作者名，版权行与文章作者兜底 |

```ts
// site/src/config/siteConfig.ts
siteUrl: "https://blog.example.com", // 接入真实站点时必改
title: "清言集",
description: "写点技术，也写点生活。一个清新简约的博客。",
keywords: ["技术", "生活", "博客", "Astro"],
author: "windcoder",
```

## 站点标识

站点的标识元素：导航栏 Logo、favicon 图标与建站日期（站点信息卡「已运行」依据）。favicon 非空时替换主题默认图标，配双图标后按系统深浅自动切换。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `logo` | `string` | `""` | 导航栏 Logo 图片（public 路径或外链），置空只渲染文字标题 |
| `favicon` | `FaviconItem[]` | `[]` | favicon 列表，非空时替换主题默认图标；`theme: "light"/"dark"` 可配双图标按系统深浅切换 |
| `since` | `string` | `""` | 建站日期（YYYY-MM-DD），站点信息卡「已运行」依据，不配置则不显示该行 |

```ts
// site/src/config/siteConfig.ts
logo: "/favicon.svg", // 置空只渲染文字标题
favicon: [
	{ src: "/favicon-light.svg", type: "image/svg+xml", sizes: "any", theme: "light" },
	{ src: "/favicon-dark.svg", type: "image/svg+xml", sizes: "any", theme: "dark" },
],
since: "2024-01-01", // YYYY-MM-DD
```

## 语言与时区

`lang` 决定 `<html lang>` 与 UI 文案语言包，`timezone` 决定构建期的日期时区。Astro 构建发生在 CI 服务器上，时区往往是 UTC。不配置 `timezone` 时，`2026-10-18` 的文章可能被解析成 UTC 深夜，导致归档分组、日期显示偏移一天。显式指定 IANA 时区后，文章日期输出与构建机环境**解耦**。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `lang` | `string` | `"zh-CN"` | 站点语言，`<html lang>` 与 UI 文案语言包 |
| `timezone` | `string` | `""` | 构建期日期时区（IANA 名），留空跟随构建机时区 |

```ts
// site/src/config/siteConfig.ts
lang: "zh-CN", // <html lang> 与 UI 文案语言包
timezone: "Asia/Shanghai",
```

## 强调色

`accentColor` 是全站唯一需要配置的颜色——**派生色（accent/soft/ink 等）全部由 HSL 公式在运行时计算**，你不需要为深浅模式各配一套色板。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `accentColor` | `string` | `"#4a9d8f"` | 强调色（6 位 hex），全部派生色由 HSL 公式计算（见下文） |
| `huePanel` | `{ enabled }` | `enabled: true` | 导航栏 hue 调色面板按钮 |

```ts
// site/src/config/siteConfig.ts
accentColor: "#4a9d8f", // 青碧色
huePanel: {
	enabled: true,
},
```

改变这一个值，按钮、链接高亮、标签底色、选中态、banner 语录强调等所有强调元素同步换色。同时导航栏的 hue 调色面板（`huePanel.enabled`）允许访客在不改配置的前提下临时换色，偏好存入 localStorage。

## 深浅模式

`colorMode` 是访客未手动切换时的默认深浅模式，右下角颜色模式按钮的手动切换会覆盖此默认值。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | 访客未手动切换时的默认深浅模式 |

```ts
// site/src/config/siteConfig.ts
colorMode: "system" as const, // as const 防止 TS 把 "system" 拓宽为 string
```

## 页面宽度

`pageWidth` 控制内容区页宽。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `pageWidth` | `number` | `1600` | 内容区页宽 800–1920 px（见下文算法） |

```ts
// site/src/config/siteConfig.ts
pageWidth: 1600,
```

- 有效范围 **800–1920 px**，屏幕宽度 ≥1280 时按 `min(92vw, pageWidth)` 取值，小屏自动收窄
- **文章页不跟随**：正文维持 1120px 的舒适阅读行宽，只有首页、归档等列表页铺满 `pageWidth`

想要紧凑风格就改小（如 `1200`），想要宽幅画廊感就改大。

## 页面开关

`pages` 是七个独立页的路由开关，`categoryBar` 控制首页与文章页顶部的分类横条。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `pages` | `PagesConfig` | 七项全 `true` | 独立页路由开关（见下文） |
| `categoryBar` | `{ enabled }` | `enabled: true` | 首页与文章页顶部的分类横条 |

```ts
// site/src/config/siteConfig.ts
pages: {
	about: true,     // /about/    关于页
	friends: true,   // /friends/  友链页
	guestbook: true, // /guestbook/ 留言板
	sponsor: true,   // /sponsor/  赞助页
	gallery: true,   // /gallery/  画廊
	series: true,    // /series/   专题聚合
	moments: true,   // /moments/  说说页
},
categoryBar: {
	enabled: true,
},
```

置 `false` 后主题**不注入对应路由**——路由在构建期完全不生成，而非运行期 404，对 SEO 干净。页面的正文与数据配置见[独立页面](/posts/pages/)与[说说页](/posts/moments/)。

## 页脚

`footer.customHtml` 用于注入页脚自定义 HTML（备案号等合规信息），留空不渲染。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `footer.customHtml` | `string` | `""` | 页脚自定义 HTML（备案号等），留空不渲染 |

```ts
// site/src/config/siteConfig.ts
footer: {
	customHtml: '<a href="https://beian.miit.gov.cn/" target="_blank">某ICP备xxxx号</a>', // 备案号等，留空不渲染
},
```

## 使用效果

本演示站的实际配置（`site/src/config/siteConfig.ts`）启用了上述全部键：

- 标题「清言集」+ Logo 显示在导航栏左侧；页脚渲染 ICP 备案链接
- 强调色 `#4a9d8f`，点导航栏右侧调色按钮可临时换色
- `colorMode: "system"`，未手动切换时跟随系统深浅；右下角颜色模式按钮手动覆盖
- 六个独立页面全部开启，可从导航栏「更多」下拉进入

## 与其它配置的关系

- `siteUrl` → 同步写进 [astro.config.ts](file:///Volumes/zhitai/Work/progarm/web/gitee.com/qy-astro-theme-orchid/site/astro.config.ts) 的 `site` 键（两处保持一致）
- `pages.gallery/sponsor/friends` 的数据 → [友链](/posts/friends/) / [赞助](/posts/sponsor/) / [画廊](/posts/gallery/)
- 导航栏里的入口 → [导航栏](/posts/navbar/)
