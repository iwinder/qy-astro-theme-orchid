---
title: 你好，清言集
description: 新主题的第一篇文章，记录 qy-astro-theme-orchid 的开始。
published: 2026-10-10
pinned: true
tags:
  - 随笔
category: 开始
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
