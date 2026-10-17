import { getCollection } from "astro:content";
import config from "virtual:theme/config";
import rss from "@astrojs/rss";
import type { APIContext, APIRoute } from "astro";
import { getSortedPosts } from "../utils.js";

/**
 * RSS（§4.63 官方 @astrojs/rss 端点）：item description 使用 frontmatter
 * description，不做全文输出（避免 RSS 端点再渲染全部 Markdown）。
 * channel 头部、atom:link self、XML 转义由官方库负责；trailingSlash 与
 * 主题 trailingSlash: "always" 口径一致（/posts/xxx/）。
 */
export const GET: APIRoute = async (context: APIContext) => {
	const all = await getCollection("posts", ({ data }) => !data.draft);
	const posts = getSortedPosts(all).slice(0, 20);
	const site = context.site ?? new URL("https://blog.example.com");

	return rss({
		title: config.title,
		description: config.description,
		site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			link: `/posts/${post.id}/`,
			pubDate: post.data.published,
		})),
		// atom 命名空间 + feed 自引用（v4 不再自动生成，保持对原手写版的兼容）
		xmlns: { atom: "http://www.w3.org/2005/Atom" },
		// RSS <language> 通道级语言标记（跟随站点语言）
		customData: [
			`<language>${config.lang}</language>`,
			`<atom:link href="${new URL("rss.xml", site).href}" rel="self" type="application/rss+xml" />`,
		].join(""),
		trailingSlash: true,
	});
};
