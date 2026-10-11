import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 评论系统：先 Artalk（适配层分发，Twikoo/Waline/Giscus/Disqus 后续接入）。
// 演示站用占位后端地址，接入真实站点时换成自己的 Artalk server；
// 文章 frontmatter comment: false 可按篇关闭
export const commentConfig: ThemeConfig["comment"] = {
	enabled: true,
	provider: "artalk",
	title: "评论",
	artalk: {
		server: "https://artalk.example.com",
		locale: "zh-CN",
		visitorCount: true,
	},
};
