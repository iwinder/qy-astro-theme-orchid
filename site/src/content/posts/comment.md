---
title: 评论系统（comment）
description: 五套评论系统全字段参考——Artalk / Twikoo / Waline / giscus / Disqus 任选其一，provider 一键切换，未开启零注入。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 16
---

本篇讲评论区：五套后端（Artalk / Twikoo / Waline / giscus / Disqus）任选其一，`provider` 一键切换。
评论区**按需注入**——`enabled` 关闭时该区域整体不渲染，评论脚本完全不进构建产物。

**配置文件**：`site/src/config/commentConfig.ts`

## 顶层配置

顶层键控制评论区的总开关、后端选择与标题，以 Artalk 为例：

**仅 `provider` 对应的分支参与渲染**，其余分支的值留着无副作用；
不需要的键可整段删除（主题 schema 自动兜底）。文章 frontmatter `comment: false` 可**按篇关闭**（见[写作指南](/posts/writing/)）。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `provider` | `string` | `"artalk"` | `artalk` / `twikoo` / `waline` / `giscus` / `disqus` / `none` |
| `title` | `string` | `"评论"` | 评论区标题 |

```ts
// site/src/config/commentConfig.ts
export const commentConfig: ThemeConfig["comment"] = {
	enabled: true,
	provider: "artalk",
	title: "评论",
};
```

## Artalk

自建评论后端：

```ts
// site/src/config/commentConfig.ts
artalk: {
	server: "https://artalk.example.com", // 服务端地址
	locale: "zh-CN",                      // 界面语言
	visitorCount: true,                   // 显示文章访问量（挂载点 #artalk-pv 自行放置）
},
```

## Twikoo

`envId` 填环境 ID / 服务端地址：

```ts
// site/src/config/commentConfig.ts
twikoo: {
	envId: "https://twikoo.example.com",  // 环境 ID / 服务端地址
	jsUrl: "https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
	cssUrl: "",                           // 自定义样式表，留空不加载
},
```

> [!warning]
> Twikoo 的 `jsUrl` **无空值兜底**——留空会渲染出 `src=""`，请保留默认 CDN 或换成自部署地址。

## Waline

服务端可部署在 Vercel 或自建：

```ts
// site/src/config/commentConfig.ts
waline: {
	serverURL: "https://waline.example.com", // 服务端地址（Vercel/自建）
	lang: "zh-CN",        // 界面语言
	visitorCount: true,   // 评论数与阅读量（依赖 Waline 页面浏览插件挂载）
},
```

## giscus

基于 GitHub Discussions：

```ts
// site/src/config/commentConfig.ts
giscus: {
	repo: "user/repo",        // 仓库
	repoId: "R_xxx",          // 仓库 ID
	category: "Announcements",// 讨论分类
	categoryId: "DIC_xxx",    // 分类 ID
	mapping: "pathname",      // 评论与页面映射：pathname/URL/title/og:title/number
	strict: "0",              // 严格模式："0" 宽松 / "1" 严格
	reactionsEnabled: "1",    // 表情回应："1" 开 / "0" 关
	emitMetadata: "0",        // 上报元数据事件
	inputPosition: "top",     // 评论框位置：top/bottom
	lang: "zh-CN",
	loading: "lazy",          // iframe 加载：lazy/eager
},
```

四件套（`repo`/`repoId`/`category`/`categoryId`）在 [giscus.app](https://giscus.app/zh-CN) 生成；
其余参数默认值与 giscus.app 生成结果一致，按需覆盖。

## Disqus

`shortname` 填 Disqus 短域名：

```ts
// site/src/config/commentConfig.ts
disqus: { shortname: "your-shortname" },
```

## 使用效果

- 文章底部（版权声明之后）渲染所选评论系统；未开启则该区域整体不渲染
- 五套切换只改 `provider`，评论区 UI 由主题统一定宽与深浅适配
- 加密文章需解锁后才加载评论脚本
