---
title: 你好，清言集
description: 新主题的第一篇文章，记录 qy-astro-theme-orchid 的开始。
published: 2026-10-10
pinned: true
image: "api"
tags:
  - 随笔
  - 功能演示
category: 主题演示
series: 功能演示
seriesOrder: 1
---

这是 `@windcoder/astro-theme-orchid` 主题包接入后的第一篇文章。

主题以 Astro Integration 形式提供：路由、组件、样式都来自 npm 包，
站点只保留配置、内容和覆盖层。

## 为什么要这样做

- Template 模式下主题升级靠 diff 合并，越改越合不动
- 主题包走 semver，`pnpm update` 即可升级
- 站点定制放在 `src/overrides/`，升级永远不会覆盖

## 接下来

1. 迁移 orchid-blog 的内容
2. 移植 remark/rehype 管线
3. 按清新简约的方向逐页重设计

## 代码块折叠

超过 15 行的代码块会自动折叠为 8 行预览（底部渐隐），点击右上角按钮展开：

```ts
/** 站点接入自检清单（示例代码，用于演示代码块折叠） */
export const checklist = [
	"安装主题包：pnpm add @windcoder/astro-theme-orchid",
	"astro.config.mjs 里注册 integration",
	"创建 config/siteConfig.ts 并填写站点信息",
	"content.config.ts 指向主题导出的 collections",
	"把文章放进 src/content/posts/",
	"配置导航与页脚链接",
	"选择代码高亮主题（codeTheme.light/dark）",
	"开启需要的功能开关（音乐/樱花/公式/图表等）",
	"本地 pnpm dev 预览全站",
	"检查深浅模式与移动端断点",
	"构建 pnpm build 校验产物",
	"检查产物里的 CSS/JS 体积",
	"部署到静态托管并绑定域名",
];
```

短代码块（不超过阈值）保持原样，不出现折叠按钮：

```ts
console.log("hello, 清言集");
```
