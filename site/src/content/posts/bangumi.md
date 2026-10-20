---
title: 追番页（bangumi）
description: bangumiConfig 完整参考——构建期从 bgm.tv 拉取「在看」动画收藏生成静态追番页，路由门控、卡片字段与 fail-soft 行为。
published: 2026-10-20
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 30
---

本篇讲追番页（`/bangumi/`）的配置：数据在构建期从 [bgm.tv](https://bgm.tv)（Bangumi 番组计划）拉取你的「在看」动画收藏，渲染为纯静态页面——访客端零请求、零 JS。

**配置文件**：`site/src/config/bangumiConfig.ts`

## 配置项

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `userId` | `string` | `""` | bgm.tv 用户名（`https://bgm.tv/user/{username}` 中的 username） |
| `title` | `string` | `"追番"` | 页面标题 |
| `description` | `string` | `""` | 页面副标题，留空不渲染 |

`enabled` 与 `userId` **同时满足**才注入 `/bangumi` 路由；关闭时路由完全不生成（与[独立页面](/posts/pages/)开关注同一策略）。

```ts
import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

export const bangumi: ThemeConfig["bangumi"] = {
	enabled: true,
	userId: "your-bgm-username",
	title: "追番",
	description: "最近在看什么",
};
```

## 数据口径

- **数据源**：bgm.tv v0 API `GET /v0/users/{userId}/collections?subject_type=2&type=3`（动画 + 在看）
- **分页**：每页 50 条，最多拉 20 页（1000 条安全上限，防止分页异常挂死构建）
- **排序**：按收藏更新时间倒序，最近在看排最前
- **更新时机**：数据在构建期固化——bgm.tv 上有新进度时**重新构建部署**即可更新，访客端永远命中静态页

## 卡片字段

每张卡片（3:4 封面）含：

- **封面**：bgm.tv 条目封面，hover 轻微放大；暗色模式自动柔和压暗降饱和
- **评分徽标**：bgm.tv 全站评分（大于 0 时显示，保留一位小数）
- **标题**：中文名优先，无译名回退日文原名，超两行截断
- **观看进度**：总集数已知时显示「看到 n / total 集」（超出自动截断），未知时只显示「看到 n 集」
- **我的评分**：你在 bgm.tv 上打的分（大于 0 时显示）
- 整卡跳转 bgm.tv 条目页（`rel="noopener nofollow"`）

## 失败不阻断构建（fail-soft）

bgm.tv 不可达、限流或超时（单请求 10 秒）时，**构建照常成功**，页面渲染为空态提示「番组数据拉取失败，请重新构建站点后重试」——外部服务故障不会挂掉你的部署流水线。

## demo 站为何不开

「demo 演示开」惯例在此例外：追番页数据依赖构建期外部 API（bgm.tv 可达性与限流），开着会让 demo 构建结果不可复现。本地体验：临时改 `enabled: true` + 你的 bgm.tv 用户名后重启 dev server 即可。
