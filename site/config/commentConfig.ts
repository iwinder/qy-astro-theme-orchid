import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 评论系统（§4.11 五套全支持；§4.58 全量展示细节字段）：
// provider 切换 artalk / twikoo / waline / giscus / disqus / none，仅 provider 对应的
// 分支参与渲染（其余分支留占位演示值无副作用）；文章 frontmatter comment: false 可按篇关闭。
// 演示站各后端均为占位地址，接入真实站点时替换成自己的 server/envId/shortname。
// title 为评论区标题；各 provider 冷门参数（giscus 的 mapping/strict/reactionsEnabled/
// emitMetadata/inputPosition/lang/loading、twikoo 的 jsUrl/cssUrl、artalk/waline 的
// locale/visitorCount）均有主题默认值，见 schema.ts comment 段，按需覆盖。
export const commentConfig: ThemeConfig["comment"] = {
	enabled: true,
	provider: "artalk",
	title: "评论",
	artalk: {
		server: "https://artalk.example.com",
		locale: "zh-CN",
		// visitorCount: true 时 meta 区显示文章访问量（挂载点 #artalk-pv 由站点自行放置）
		visitorCount: true,
	},
	twikoo: {
		envId: "https://twikoo.example.com",
		// jsUrl: 前端脚本地址（默认 npmmirror CDN，可换自部署或 jsdelivr）
		// cssUrl: 自定义样式表（留空不加载）
	},
	waline: {
		serverURL: "https://waline.example.com",
		lang: "zh-CN",
		visitorCount: true,
	},
	giscus: {
		repo: "iwinder/qy-astro-theme-orchid",
		repoId: "R_demo",
		category: "Announcements",
		categoryId: "DIC_demo",
		// 其余参数（mapping/strict/reactionsEnabled 等）默认值与 giscus.app 生成结果一致
	},
	disqus: {
		shortname: "demo",
	},
};
