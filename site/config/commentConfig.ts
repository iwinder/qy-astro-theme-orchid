import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 评论系统（§4.11 五套全支持；§4.58 全量展示，§4.60 冷门字段展开为真实样板）：
// provider 切换 artalk / twikoo / waline / giscus / disqus / none，仅 provider 对应的
// 分支参与渲染（其余分支留占位演示值无副作用）；文章 frontmatter comment: false 可按篇关闭。
// 演示站各后端均为占位地址，接入真实站点时替换成自己的 server/envId/shortname。
// title 为评论区标题；全部字段与默认值均展示于此，不需要的键可删除（主题 schema 自动兜底）。
export const commentConfig: ThemeConfig["comment"] = {
	enabled: true,
	provider: "artalk",
	title: "评论",
	artalk: {
		// Artalk 服务端地址（自建）
		server: "https://artalk.example.com",
		// 前端界面语言
		locale: "zh-CN",
		// true 时 meta 区显示文章访问量（挂载点 #artalk-pv 由站点自行放置）
		visitorCount: true,
	},
	twikoo: {
		// Twikoo 环境 ID / 服务端地址
		envId: "https://twikoo.example.com",
		// 前端脚本地址（默认 npmmirror CDN，可换自部署或 jsdelivr；此字段无空值兜底，留空会渲染 src=""）
		jsUrl:
			"https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
		// 自定义样式表（留空不加载）
		cssUrl: "",
	},
	waline: {
		// Waline 服务端地址（Vercel/自建）
		serverURL: "https://waline.example.com",
		// 界面语言
		lang: "zh-CN",
		// true 时显示评论数与阅读量（依赖 Waline 页面浏览插件挂载）
		visitorCount: true,
	},
	giscus: {
		// giscus.app 生成四件套（仓库/仓库 ID/讨论分类/分类 ID）
		repo: "iwinder/qy-astro-theme-orchid",
		repoId: "R_demo",
		category: "Announcements",
		categoryId: "DIC_demo",
		// 以下参数默认值与 giscus.app 生成结果一致，按需覆盖
		// 评论与页面的映射方式：pathname / URL / title / og:title / number
		mapping: "pathname",
		// 严格模式："0" 宽松 / "1" 严格
		strict: "0",
		// 是否启用讨论区表情回应："1" 开 / "0" 关
		reactionsEnabled: "1",
		// 是否上报元数据事件："0" 关 / "1" 开
		emitMetadata: "0",
		// 评论框位置：top / bottom
		inputPosition: "top",
		// 界面语言
		lang: "zh-CN",
		// iframe 加载方式：lazy / eager
		loading: "lazy",
	},
	disqus: {
		// Disqus 短域名（shortname）
		shortname: "demo",
	},
};
