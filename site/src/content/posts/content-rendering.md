---
title: 内容渲染：LaTeX、图表、邮箱防爬与防盗链
description: 四个内容渲染模块的配置——KaTeX 数学公式、mermaid 与 plantuml 图表、mailto 邮箱防爬、外链图片防盗链，均在构建期处理，零客户端运行时。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 11
---

写作时正文里的公式、图表、邮箱链接会被主题在**构建期**渲染或编码——
本篇讲这四个内容渲染模块的配置，语法写法见[写作指南](/posts/writing/)。

**配置文件**：

- `site/src/config/latexConfig.ts` → `latex`（LaTeX 数学公式）
- `site/src/config/mermaidConfig.ts` → `diagram.mermaid`（图表）
- `site/src/config/plantumlConfig.ts` → `diagram.plantuml`（图表）
- `site/src/config/emailProtectionConfig.ts` → `emailProtection`（邮箱防爬）
- `site/src/config/siteConfig.ts` → `noReferrer`（图片防盗链）

## LaTeX 数学公式（latex）

remark-math + rehype-katex **构建期渲染**，无客户端运行时。行内 `$E=mc^2$`、块级 `$$...$$` 均可；含 mhchem 扩展（化学方程式）。关闭后 `$...$` 按普通文本输出。

```ts
// site/src/config/latexConfig.ts
export const latex: ThemeConfig["latex"] = { enabled: true };
```

## 图表（mermaid / plantuml）

两者都以 ```` ```mermaid ```` / ```` ```plantuml ```` 围栏代码块书写，语法见[写作指南](/posts/writing/)。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mermaid.enabled` | `boolean` | `true` | mermaid 围栏代码块构建期渲染为**双主题静态 SVG** |
| `mermaid.lightTheme` / `darkTheme` | `string` | `"github-light"` / `"github-dark"` | mermaid 官方主题名 |
| `plantuml.enabled` | `boolean` | `true` | plantuml 围栏代码块渲染 |
| `plantuml.server` | `string` | plantuml.com | 渲染服务地址，可替换为自建/内网服务 |
| `plantuml.lightTheme` / `darkTheme` | `string` | `""` | 服务端主题参数 |

```ts
// site/src/config/mermaidConfig.ts
export const mermaid: ThemeConfig["diagram"]["mermaid"] = {
	enabled: true,
	lightTheme: "github-light",
	darkTheme: "github-dark",
};
```

```ts
// site/src/config/plantumlConfig.ts
export const plantuml: ThemeConfig["diagram"]["plantuml"] = {
	enabled: true,
	server: "https://www.plantuml.com/plantuml",
	lightTheme: "",
	darkTheme: "",
};
```

## 邮箱防爬（emailProtection）

文章正文里的 `mailto:` 链接在**构建期编码**，HTML 源码里看不到真实邮箱，
访客点击时内联脚本还原——防采集爬虫，不防人工。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关 |
| `method` | `"base64" \| "rot13"` | `"base64"` | base64 抗爬性更好；rot13 零 atob 依赖 |

```ts
// site/src/config/emailProtectionConfig.ts
export const emailProtection: ThemeConfig["emailProtection"] = {
	enabled: true,
	method: "base64", // "base64" | "rot13"
};
```

## 图片防盗链（noReferrer）

部分图床（B 站图床等）校验请求 Referer，站外引用直接 403 裂图。
命中域名清单的**外链图片**在构建期加 `referrerpolicy="no-referrer"`，
浏览器请求时不带 Referer，绕过校验；只处理 `http(s)://` 外链，站内相对路径不受影响。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `domains` | `string[]` | `[]` | 域名清单；空数组即关闭 |

```ts
// site/src/config/siteConfig.ts
noReferrer: {
	domains: ["i0.hdslb.com", "i1.hdslb.com", "i2.hdslb.com", "*.bilibili.com"],
},
```

域名匹配规则：裸域名（`i0.hdslb.com`）匹配自身及其子域；
`*.` 前缀（`*.bilibili.com`）**只匹配子域**，裸域需另行列出。
清单制而非全站 no-referrer——不影响站内统计与外链 SEO。

## 暗色外链图适配（darkMode.adaptExternalImages）

暗色模式下白底外链截图/图表往往刺眼。开启后，构建期给正文里的
`http(s)://` 外链图片打 `data-external` 标记，暗色下对其施加
`brightness(0.85)` 亮度滤镜（300ms 过渡，随深浅切换平滑变化）；
本地图（封面/画廊/`/public` 图）不受影响，说说页图片同享适配。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `adaptExternalImages` | `boolean` | `false` | 暗色下压暗外链图 |

```ts
// site/src/config/siteConfig.ts
darkMode: {
	adaptExternalImages: true,
},
```

个别图片不想被压暗（如深底图表）：在 markdown 里用内联 HTML 写
`<img class="no-adapt" src="..." />` 豁免。
