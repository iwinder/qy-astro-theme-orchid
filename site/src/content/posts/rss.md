---
title: RSS 订阅
description: 站点 RSS 输出 /rss.xml——输出条数 limit 与全文输出 fullText 开关；加密文章自动跳过全文，输出的是摘要不是密文。
published: 2026-10-20
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 25
---

主题内置 RSS 输出 `/rss.xml`，订阅器按发布时间新→旧取文章。
默认输出**摘要**（frontmatter `description`，留空取正文首段）；
全文输出是一个开关，按需打开。

**配置文件**：

- `site/src/config/rssConfig.ts` → `rss`

## 配置项

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `fullText` | `boolean` | `false` | 全文输出：item 携带 `content:encoded` 完整 HTML |
| `limit` | `number` | `20` | 输出条数上限（按发布时间新→旧取前 N 篇） |

```ts
// site/src/config/rssConfig.ts
export const rss: ThemeConfig["rss"] = {
	fullText: false,
	limit: 20,
};
```

## 全文输出（fullText）

开启后每条 item 的 `content:encoded` 是**构建期逐篇容器渲染**的完整 HTML，
与文章页同一套 remark/rehype 插件产物——正文里的公式、图表、代码高亮在订阅器里与站内一致。

三个注意点：

- **构建时间随文章数增加**：全文等于构建时把每篇文章完整渲染一遍，文章多时构建明显变慢
- **加密文章自动跳过**：加密文章只输出摘要，绝不把密码验证后的明文送进 feed——否则密码验证形同虚设
- **站点域名是基准**：feed 内链接与全文内相对路径都基于 `siteConfig.siteUrl` 拼接（见[站点基础配置](/posts/site-config/)）

## 订阅入口

`siteUrl/rss.xml` 即订阅地址。社交图标里的 `rss` 项（见[社交图标配置](/posts/social-icons/)）
默认指向它，导航或页脚想放订阅链接也链到这里。
