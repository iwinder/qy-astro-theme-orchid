---
title: 内容渲染：LaTeX、图表与邮箱防爬
description: 三个内容渲染模块的配置——KaTeX 数学公式、mermaid 与 plantuml 图表、mailto 邮箱防爬，均在构建期处理，零客户端运行时。
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
本篇讲这三个内容渲染模块的配置，语法写法见[写作指南](/posts/writing/)。

## LaTeX 数学公式（latex）

```ts
// site/src/config/latexConfig.ts
export const latex: ThemeConfig["latex"] = { enabled: true };
```

remark-math + rehype-katex **构建期渲染**，无客户端运行时。行内 `$E=mc^2$`、块级 `$$...$$` 均可；含 mhchem 扩展（化学方程式）。关闭后 `$...$` 按普通文本输出。

## 图表（mermaid / plantuml）

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

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mermaid.enabled` | `boolean` | `true` | mermaid 围栏代码块构建期渲染为**双主题静态 SVG** |
| `mermaid.lightTheme` / `darkTheme` | `string` | `"github-light"` / `"github-dark"` | mermaid 官方主题名 |
| `plantuml.enabled` | `boolean` | `true` | plantuml 围栏代码块渲染 |
| `plantuml.server` | `string` | plantuml.com | 渲染服务地址，可替换为自建/内网服务 |
| `plantuml.lightTheme` / `darkTheme` | `string` | `""` | 服务端主题参数 |

两者都以 ```` ```mermaid ```` / ```` ```plantuml ```` 围栏代码块书写，语法见[写作指南](/posts/writing/)。

## 邮箱防爬（emailProtection）

```ts
// site/src/config/emailProtectionConfig.ts
export const emailProtection: ThemeConfig["emailProtection"] = {
	enabled: true,
	method: "base64", // "base64" | "rot13"
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关 |
| `method` | `"base64" \| "rot13"` | `"base64"` | base64 抗爬性更好；rot13 零 atob 依赖 |

文章正文里的 `mailto:` 链接在**构建期编码**，HTML 源码里看不到真实邮箱，
访客点击时内联脚本还原——防采集爬虫，不防人工。
