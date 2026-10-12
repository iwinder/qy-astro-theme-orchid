import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 评论系统（§4.11 五套全支持）：provider 切换 artalk / twikoo / waline / giscus / disqus / none。
// 演示站各后端均为占位地址，接入真实站点时替换成自己的 server/envId/shortname；
// 文章 frontmatter comment: false 可按篇关闭。
export const commentConfig: ThemeConfig["comment"] = {
	enabled: true,
	provider: "artalk",
	title: "评论",
	artalk: {
		server: "https://artalk.example.com",
		locale: "zh-CN",
		visitorCount: true,
	},
	twikoo: {
		envId: "https://twikoo.example.com",
	},
	waline: {
		serverURL: "https://waline.example.com",
	},
	giscus: {
		repo: "iwinder/qy-astro-theme-orchid",
		repoId: "R_demo",
		category: "Announcements",
		categoryId: "DIC_demo",
	},
	disqus: {
		shortname: "demo",
	},
};
