---
title: 评论、公告、统计与广告：comment / announcement / analytics / advertisement
description: 五套评论系统全字段（artalk/twikoo/waline/giscus/disqus）、侧栏公告条、四家站点统计（GA/Clarity/umami/51.la）与侧栏广告位全量配置。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesOrder: 9
---

这一篇把四个"运营向"模块一次讲完：评论区（五套后端任选其一）、
侧栏公告条、四家站点统计、侧栏广告位。全部模块**按需注入**——
ID 留空或开关关闭时，对应脚本完全不进构建产物。

## 评论系统（commentConfig）

### 快速上手

以 Artalk 为例：

```ts
// site/config/commentConfig.ts
export const commentConfig: ThemeConfig["comment"] = {
	enabled: true,
	provider: "artalk",
	title: "评论",
	artalk: { server: "https://artalk.example.com", locale: "zh-CN", visitorCount: true },
};
```

### 顶层配置

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `provider` | `string` | `"artalk"` | `artalk` / `twikoo` / `waline` / `giscus` / `disqus` / `none` |
| `title` | `string` | `"评论"` | 评论区标题 |

**仅 `provider` 对应的分支参与渲染**，其余分支的值留着无副作用；
不需要的键可整段删除（主题 schema 自动兜底）。文章 frontmatter `comment: false` 可**按篇关闭**（见[写作指南](/posts/writing/)）。

### 五套后端全字段

**Artalk**（自建）：

```ts
artalk: {
	server: "https://artalk.example.com", // 服务端地址
	locale: "zh-CN",                      // 界面语言
	visitorCount: true,                   // 显示文章访问量（挂载点 #artalk-pv 自行放置）
},
```

**Twikoo**：

```ts
twikoo: {
	envId: "https://twikoo.example.com",  // 环境 ID / 服务端地址
	jsUrl: "https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
	cssUrl: "",                           // 自定义样式表，留空不加载
},
```

> [!warning]
> Twikoo 的 `jsUrl` **无空值兜底**——留空会渲染出 `src=""`，请保留默认 CDN 或换成自部署地址。

**Waline**：

```ts
waline: {
	serverURL: "https://waline.example.com", // 服务端地址（Vercel/自建）
	lang: "zh-CN",        // 界面语言
	visitorCount: true,   // 评论数与阅读量（依赖 Waline 页面浏览插件挂载）
},
```

**giscus**（基于 GitHub Discussions）：

```ts
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

**Disqus**：

```ts
disqus: { shortname: "your-shortname" },
```

### 使用效果

- 文章底部（版权声明之后）渲染所选评论系统；未开启则该区域整体不渲染
- 五套切换只改 `provider`，评论区 UI 由主题统一定宽与深浅适配
- 加密文章需解锁后才加载评论脚本

## 侧栏公告（announcementConfig）

```ts
// site/config/announcementConfig.ts
export const announcementConfig: ThemeConfig["announcement"] = {
	title: "公告",
	content: "主题已支持公告栏、广告位与站点统计，欢迎体验。",
	link: { text: "了解更多", url: "/about/", external: false },
	closable: true,
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` | `string` | — | 公告卡标题 |
| `content` | `string` | `""` | 公告正文；**留空则整卡不渲染** |
| `link` | `{text, url, external}` | — | 可选跳转按钮，`external: true` 新窗口 |
| `closable` | `boolean` | `true` | 显示关闭按钮（仅前台隐藏，刷新恢复） |

配合侧栏 widget 使用：`sidebarConfig.widgets` 里的 `{ type: "announcement", enabled: true }`（见[侧边栏与个人资料](/posts/sidebar-and-profile/)）。

## 站点统计（analyticsConfig）

四家统计按需填 ID，**留空即不注入对应脚本**（零副作用）：

```ts
// site/config/analyticsConfig.ts
export const analyticsConfig: ThemeConfig["analytics"] = {
	googleAnalyticsId: "",      // Google Analytics（G-XXXX）
	microsoftClarityId: "",     // Microsoft Clarity 项目 ID
	umami: { /* 见下 */ },
	la51: { /* 见下 */ },
};
```

**Umami**（官方云或自建）：

```ts
umami: {
	websiteId: "",            // Website ID
	scriptUrl: "https://cloud.umami.is/script.js",           // 自建时替换
	replaysScriptUrl: "https://cloud.umami.is/script.replays.js",
	trackOutboundLinks: true, // 追踪出站链接
	collectWebVitals: false,  // 收集 Web Vitals（自建需 v2.9+）
	replays: {
		enabled: false,         // 会话回放（Live）
		sampleRate: 0.15,       // 录制采样率 0-1（0.15 = 15% 会话）
		maskLevel: "moderate",  // 隐私遮罩："moderate" 遮输入框 / "strict" 额外遮全部文本
		maxDuration: 300000,    // 单次录制最大时长 ms
		blockSelector: "",      // 排除录制的元素 CSS 选择器
	},
},
```

**51.la**：

```ts
la51: {
	id: "",               // 站点 ID（CK 编码）
	sdkUrl: "",           // 自定义 SDK 地址（防 DNS 污染），留空用默认
	ck: "",               // 多统计 ID 的数据分离标识，留空用 id
	autoTrack: true,      // 事件分析
	hashMode: false,      // Hash 路由模式（本项目 History 路由，保持 false）
	screenRecord: true,   // 网站录屏
},
```

### 使用效果

- 填入 ID 重新构建后，对应统计脚本注入全站页面；留空的完全不注入
- umami 回放与 51.la 录屏默认关闭，开启前请评估隐私合规

## 侧栏广告位（advertisementConfig）

默认关闭，完整形态：

```ts
// site/config/advertisementConfig.ts
export const advertisementConfig: ThemeConfig["advertisement"] = {
	enabled: true,
	title: "广告",
	image: "/assets/images/ad/banner.png",  // 广告图（public 路径或外链）
	imageLink: "https://example.com",       // 图片点击跳转
	imageAlt: "广告",
	content: "一句话广告文案",
	link: { text: "查看详情", url: "https://example.com", external: true },
	closable: true,
	displayCount: -1,          // >0 时限制总展示次数（前台关闭计数）
	expireDate: "2027-12-31",  // 过期自动下线
};
```

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 总开关 |
| `title` | `string` | `"广告"` | 卡片标题 |
| `image` / `imageLink` / `imageAlt` | `string` | `""` | 广告图 / 点击链接 / 替代文本 |
| `content` | `string` | `""` | 文字广告文案 |
| `link` | `{text, url, external}` | — | 底部跳转按钮 |
| `closable` | `boolean` | `true` | 可关闭（仅前台隐藏） |
| `displayCount` | `number` | `-1` | `-1` 不限次数；`>0` 限制总展示次数 |
| `expireDate` | `string` | `""` | 到期日期（YYYY-MM-DD），过期自动下线 |

配合 `sidebarConfig.widgets` 的 `{ type: "advertisement" }` 渲染在侧栏（见[侧边栏与个人资料](/posts/sidebar-and-profile/)）。
