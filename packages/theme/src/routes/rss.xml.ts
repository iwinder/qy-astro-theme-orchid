import { getCollection } from "astro:content";
import config from "virtual:theme/config";
import type { APIRoute } from "astro";
import { getSortedPosts, xmlEscape } from "../utils.js";

/**
 * RSS（摘要版）：item description 使用 frontmatter description，
 * 不做全文输出（避免 RSS 端点再渲染全部 Markdown）。
 */
export const GET: APIRoute = async ({ site }) => {
	const all = await getCollection("posts", ({ data }) => !data.draft);
	const posts = getSortedPosts(all).slice(0, 20);
	const base = site ?? new URL("https://blog.example.com");

	const items = posts
		.map((post) => {
			const link = new URL(`/posts/${post.id}/`, base).href;
			return [
				"    <item>",
				`      <title>${xmlEscape(post.data.title)}</title>`,
				`      <link>${xmlEscape(link)}</link>`,
				`      <guid>${xmlEscape(link)}</guid>`,
				`      <pubDate>${post.data.published.toUTCString()}</pubDate>`,
				post.data.description
					? `      <description>${xmlEscape(post.data.description)}</description>`
					: null,
				"    </item>",
			]
				.filter(Boolean)
				.join("\n");
		})
		.join("\n");

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		"  <channel>",
		`    <title>${xmlEscape(config.title)}</title>`,
		`    <link>${xmlEscape(base.href)}</link>`,
		`    <description>${xmlEscape(config.description)}</description>`,
		`    <atom:link href="${xmlEscape(new URL("rss.xml", base).href)}" rel="self" type="application/rss+xml" />`,
		`    <language>${xmlEscape(config.lang)}</language>`,
		items,
		"  </channel>",
		"</rss>",
		"",
	].join("\n");

	return new Response(xml, {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
};
