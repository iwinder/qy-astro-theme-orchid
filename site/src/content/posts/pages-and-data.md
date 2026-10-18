---
title: 独立页面与数据：about / friends / sponsor / gallery 配置
description: 独立页开关与正文集合（spec）机制，友链页全字段、赞助页（收款码/赞助名单）、画廊（相册扫描、远程 URL、加密相册）全部可配置项。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 功能配置
seriesOrder: 9
---

主题内置六个独立页面（关于/友链/留言板/赞助/画廊/专题），路由开关在
`siteConfig.pages`（见[站点基础配置](/posts/site-config/#pages-独立页开关)）。
本文讲各页的**正文**与**数据**配置。

## 页面正文（spec 集合）

about、friends、guestbook 三个页面的正文来自 `src/content/spec/` 下的 Markdown 文件：

```
site/src/content/spec/
├── about.md      # 关于页正文
├── friends.md    # 友链页正文（渲染在友链列表上方）
└── guestbook.md  # 留言板页正文（渲染在评论区上方）
```

- 文件名固定（slug 即页面名），frontmatter 只需 `title`
- **缺条目不会构建失败**——对应页面渲染主题内置的占位内容

## 友链（friendsConfig）

友链数据**同时驱动**友链页与首页侧栏的 friends widget（见[侧边栏与个人资料](/posts/sidebar-and-profile/)）。

### 全部可配置项

```ts
// site/src/config/friendsConfig.ts
export const friendsConfig: ThemeConfig["friends"] = {
	title: "友链",
	description: "山不在高，有仙则名。",
	sort: "weight", // 排序字段
	apply: {
		title: "想和清言集交换链接？",
		description: "欢迎写信给我，附上站点名称、链接、头像和一句话介绍。",
		link: "mailto:hi@example.com",
		label: "申请友链",
	},
	list: [
		{
			title: "青山不改",           // 站点名称
			site: "https://example.com", // 站点链接
			image: "",                   // 头像；留空用首字字头像兜底
			desc: "山中岁月长，林间无事忙",
			tags: ["技术"],              // 可选，展示用标签
			weight: 10,                  // 权重，大在前
			featured: true,              // 首页/侧栏优先展示
			enabled: true,               // false 则页面与侧栏都不渲染
		},
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` / `description` | `string` | — | 页面标题与描述 |
| `sort` | `string` | `"weight"` | 排序依据（weight 降序） |
| `apply` | `ApplyConfig` | — | 申请友链区块（`title`/`description`/`link`/`label`） |
| `list[].title` / `site` | `string` | 必填 | 站点名 / 链接 |
| `list[].image` | `string` | `""` | 头像，留空渲染首字字头像 |
| `list[].desc` | `string` | `""` | 一句话介绍 |
| `list[].tags` | `string[]` | `[]` | 展示标签 |
| `list[].weight` | `number` | `0` | 权重排序，大在前 |
| `list[].featured` | `boolean` | `false` | `true` 优先展示在首页侧栏（其余按 weight 补足） |
| `list[].enabled` | `boolean` | `true` | `false` 两处都不渲染 |

## 赞助（sponsorConfig）

### 全部可配置项

```ts
// site/src/config/sponsorConfig.ts
export const sponsorConfig: ThemeConfig["sponsor"] = {
	title: "打赏",
	description: "如果内容对你有帮助，请作者喝杯茶。",
	usage: "你的打赏将用于服务器维护、内容创作与功能开发。",
	showSponsorsList: true,  // 展示赞助名单
	showButtonInPost: true,  // 文章页支持卡出现「打赏支持」按钮
	methods: [
		{
			name: "支付宝",
			icon: "",       // 图标（可选）
			image: "",      // 收款码图片路径（放 site/public/ 后填路径）
			link: "https://example.com/sponsor", // 或跳转链接
			description: "跳转链接打赏演示",
			enabled: true,
		},
	],
	sponsors: [
		{ name: "青山不改", avatar: "", amount: "¥66", date: "2026-09-01" },
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` / `description` / `usage` | `string` | — | 页面标题 / 描述 / 资金用途说明 |
| `showSponsorsList` | `boolean` | `true` | 展示历史赞助名单 |
| `showButtonInPost` | `boolean` | `true` | 文章页「打赏支持」按钮；关闭后支持卡仅保留分享海报 |
| `methods[]` | `Method[]` | `[]` | 打赏方式：`{name, icon, image, link, description, enabled}` |
| `sponsors[]` | `Sponsor[]` | `[]` | 赞助名单：`{name, avatar, amount, date}` |

两条规则：

- 每个 method 的 `image`（收款码）与 `link`（跳转）**至少配一个**，均为空渲染占位框
- 收款码图放 `site/public/` 下，`image` 填 public 路径（如 `/assets/images/sponsor/alipay.png`）

### 使用效果

- `/sponsor/` 页：标题描述 + 各打赏方式卡片（点击看收款码大图或跳转）+ 资金用途 + 赞助名单时间线
- 文章底部支持卡：分享海报按钮 + 打赏按钮（`showButtonInPost`）

## 画廊（galleryConfig）

### 全部可配置项

```ts
// site/src/config/galleryConfig.ts
export const galleryConfig: ThemeConfig["gallery"] = {
	title: "画廊",
	description: "用镜头收藏时间的碎片。",
	columnWidth: 240, // 瀑布流最小列宽 px
	albums: [
		{
			id: "demo-spring",              // 对应 public/gallery/<id>/ 目录名
			name: "春日山行",
			description: "清明前后入山，溪水初涨。",
			date: "2026-04-05",
			location: "杭州 · 九溪",
			tags: ["风光", "徒步"],
			// cover: "/gallery/demo-spring/cover.jpg", // 可选，封面
			// password: "secret", passwordHint: "提示", // 加密相册
		},
	],
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` / `description` | `string` | — | 画廊页标题与描述 |
| `columnWidth` | `number` | `240` | 瀑布流最小列宽，实际列数随容器宽自适应 |
| `albums[].id` | `string` | 必填 | 对应 `site/public/gallery/<id>/` 目录 |
| `albums[].name` / `description` | `string` | 必填 / `""` | 相册名与描述 |
| `albums[].date` / `location` | `string` | `""` | 拍摄日期与地点 |
| `albums[].tags` | `string[]` | `[]` | 相册标签 |
| `albums[].cover` | `string` | `""` | 封面；留空依次取目录内 `cover.*` / 第一张照片 |
| `albums[].password` | `string` | `""` | **非空即加密相册** |
| `albums[].passwordHint` | `string` | `""` | 密码提示 |

### 照片来源（构建期扫描）

相册照片不放配置里，按 `albums[].id` 扫描 `site/public/gallery/<id>/` 目录：

1. **本地图片**：目录内图片文件直接扫描入库（建议先跑 `pnpm lqip` 生成 LQIP 占位）
2. **远程图片**：目录内放 `urls.txt`，**每行一个 URL**，与本地图片合并展示

### 加密相册

`password` 非空即加密：画廊页显示锁标记，点入需输密码（客户端校验），
`passwordHint` 显示为输入框下方的提示文字。本演示站的 `demo-secret` 相册密码为 `orchid2026`，可直接体验。

### 使用效果

- `/gallery/` 瀑布流相册墙（封面 + 名称 + 日期地点标签）
- 点入相册后照片大图浏览，本地图带 LQIP 渐进加载
- 侧栏与导航可直达（导航入口见[导航栏与首页横幅](/posts/nav-and-banner/)）
