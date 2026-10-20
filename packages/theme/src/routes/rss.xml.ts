import { getCollection, render } from "astro:content";
import config from "virtual:theme/config";
import rss from "@astrojs/rss";
import type { APIContext, APIRoute } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getSortedPosts } from "../utils.js";

/**
 * RSS（§4.63 官方 @astrojs/rss 端点）：
 * - 默认 item description 使用 frontmatter description（摘要输出）；
 * - rss.fullText 开启后 item 追加 content:encoded 全文（§4.87）——经
 *   AstroContainer 逐篇容器渲染 Markdown（与文章页同一套 remark/rehype 插件产物），
 *   构建时间随文章数增加，默认关；
 * - 条数 rss.limit（默认 20）；channel 头部、atom:link self、XML 转义由官方库负责；
 *   trailingSlash 与主题 trailingSlash: "always" 口径一致（/posts/xxx/）。
 */
export const GET: APIRoute = async (context: APIContext) => {
	const all = await getCollection("posts", ({ data }) => !data.draft);
	const posts = getSortedPosts(all).slice(0, config.rss.limit);
	const site = context.site ?? new URL("https://blog.example.com");

	const items = await Promise.all(
		posts.map(async (post) => {
			const item: {
				title: string;
				description: string;
				link: string;
				pubDate: Date;
				content?: string;
			} = {
				title: post.data.title,
				description: post.data.description,
				link: `/posts/${post.id}/`,
				pubDate: post.data.published,
			};
			if (config.rss.fullText && !post.data.password) {
				// 加密文章不进 RSS 全文（内容构建期加密，明文进 RSS 会绕过密码）
				const { Content } = await render(post);
				const container = await AstroContainer.create();
				item.content = await container.renderToString(Content);
			}
			return item;
		}),
	);

	return rss({
		title: config.title,
		description: config.description,
		site,
		items,
		// atom 命名空间 + feed 自引用（v4 不再自动生成，保持对原手写版的兼容）；
		// content 命名空间供 fullText 的 content:encoded 使用
		xmlns: {
			atom: "http://www.w3.org/2005/Atom",
			content: "http://purl.org/rss/1.0/modules/content/",
		},
		// RSS <language> 通道级语言标记（跟随站点语言）
		customData: [
			`<language>${config.lang}</language>`,
			`<atom:link href="${new URL("rss.xml", site).href}" rel="self" type="application/rss+xml" />`,
		].join(""),
		trailingSlash: true,
	});
};
