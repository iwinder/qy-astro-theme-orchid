---
title: MDX 指南：启用、组件写作与 style-to-js 踩坑
description: MDX 能力定位与启用三步、在 .mdx 文章里写组件、style-to-js CJS/ESM 互操作坑的完整机理与 pnpm overrides 根治配方，以及 .md 与 .mdx 的选型建议。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 进阶
seriesOrder: 28
---

MDX 让文章里能直接写组件，但它是**站点能力选择**而非主题必需品——是否启用由站点决定。
本文整合 MDX 的全部相关内容：启用步骤、组件写作、以及那个著名的 `styleToJs is not a function` 踩坑。

先澄清一个常见误解：主题的写作增强语法（提示块、公式、图表、代码块增强等）
全部通过 unified 管线提供，**在纯 `.md` 里就能用**，与 MDX 无关。
只有「文章里 import 并渲染组件」这一件事需要 `.mdx`。

## 启用 MDX

三步：

```sh
pnpm add @astrojs/mdx
```

```ts
// astro.config.ts
import mdx from "@astrojs/mdx";
import orchidTheme from "@windcoder/astro-theme-orchid";

export default defineConfig({
	integrations: [mdx(), orchidTheme(themeConfig)],
});
```

集合 loader 同步扩展，让 `.mdx` 与 `.md` 一并被收录：

```ts
// src/content.config.ts
const posts = defineCollection({
	type: "content",
	schema: definePostSchema(),
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
});
```

两点说明：

- `@astrojs/mdx` 默认继承站点 `markdown` 配置，主题注册的自定义 unified processor
  （KaTeX / Mermaid / PlantUML / directives / Expressive Code）**原样作用于 `.mdx`**，无需任何额外接线。
- 在 `.mdx` 里 import 的组件是**站点直接依赖**（如 `astro-icon` 需在站点 `package.json` 声明），
  主题不会替站点安装业务组件。

## 在文章里写组件

`.mdx` 文件里 import 后当 JSX 用：

```mdx
import Callout from "../components/Callout.astro";

<Callout type="tip">这是组件渲染的提示。</Callout>
```

`new-post` 脚手架同样支持 MDX：`pnpm new-post "标题" .mdx`。

## .md 还是 .mdx

- **纯写作（90% 的文章）用 `.md`**——全部增强语法可用，构建链更短
- 需要在文章里用组件（自定义卡片、交互小组件）才用 `.mdx`
- 两者可在 posts 目录共存，loader 同时收录；同一篇文章中途换扩展名，frontmatter 不用改

本文以及整个指南系列都是 `.md` 写的。

## 已知坑：style-to-js 崩溃

### 现象

MDX 编译时报错：

```text
styleToJs is not a function
```

dev 与 build 均会触发；同目录的 `.md` 文件不受影响。

### 触发面：元素上的 style 属性

准确的触发条件是：**MDX 文件编译出的元素节点带有 `style` 属性**。常见来源：

- 手写的行内样式：`<div style="color: red">`
- 代码块增强（Expressive Code）的输出——行高亮等节点的 inline style
- KaTeX 公式的输出——公式节点普遍带 style 属性

> [!warning]
> 网上与旧文档常把这个坑描述为「MDX 里内联 `<style>` 标签报错」——这不准确。
> `<style>` 是标签，`style` 是属性；style-to-js 处理的是后者。
> 也就是说：即使你的 `.mdx` 一个 `<style>` 标签都没写，
> 只要正文里有公式（KaTeX 输出带 style 属性），编译照样会炸。

### 机理

崩溃链条完整走一遍：

1. MDX 编译管线把内容转成 hast 树，再由 `hast-util-to-estree`（`@mdx-js/mdx` 的核心依赖）转成 estree AST
2. [hast-util-to-estree 的 element 处理器](https://github.com/syntax-tree/hast-util-to-estree/blob/main/lib/handlers/element.js)遇到 `style` 属性时，调用 `styleToJs(value, {reactCompat: true})` 把 CSS 字符串转成 JSX 对象
3. 它以 **ESM 默认导入**使用 `style-to-js`：`import styleToJs from 'style-to-js'`
4. 而 `style-to-js@1.0.0` 是**纯 CJS 包**（`exports.default` 形态），ESM 默认导入拿到的是模块对象而非函数 → `styleToJs is not a function`

版本时间线（npm registry 实测）：

| 包 | 版本 | 发布时间 | 说明 |
|---|---|---|---|
| style-to-js | 1.0.0 | 2020-11-22 | 纯 CJS，触发坑 |
| style-to-js | 1.1.0 | 2020-11-22 | 同日修复：`module.exports = StyleToJS` |
| style-to-js | 2.0.2 | — | 当前 latest |
| hast-util-to-estree | 3.1.3 | 2025-03-03 | 声明依赖 `style-to-js: ^1.0.0` |

坑不在「没更新」，而在**依赖解析结果**：`^1.0.0` 是合法范围，1.0.0 也在范围内。
正常解析会拿到最新 1.1.x；但若走元数据滞后的 npm 镜像、或锁文件生成时机不巧，就可能锁到 1.0.0。

## 修复方案

### 根治：pnpm overrides

强制 `style-to-js` 解析到修复后的版本。pnpm v10+ 写在 `pnpm-workspace.yaml`（单站点项目也适用）：

```yaml
# pnpm-workspace.yaml
overrides:
  style-to-js: ^1.1.16
```

旧版 pnpm（v9 及以前）写在 `package.json` 的 `pnpm.overrides` 字段；npm 对应顶层 `overrides`，yarn 对应 `resolutions`。

改完重装依赖生效：

```sh
pnpm install --no-frozen-lockfile
```

用 `pnpm why style-to-js` 确认解析结果 >= 1.1.0。

:::note
overrides 作用在**你的站点项目**的依赖解析层。主题包以 npm 依赖形式分发，
无法替第三方站点预置 overrides——所以本文档保留这条配方，供所有用户自查。
:::

### 写作侧规避

- CSS 优先写进独立样式文件（`<style is:inline>` 或 `.css` 文件 import），避免手写 `style="..."` 行内样式
- 注意这条只对手写的行内样式有效——KaTeX / 代码块增强的输出不受写作侧控制，依赖修复（overrides）才是完备解

## 相关阅读

- [快速开始](/posts/getting-started/)：从安装到接入
- [写作指南](/posts/writing/)：frontmatter 全字段与全部写作增强语法
- [定制与覆盖](/posts/theme-override/)：组件级覆盖
