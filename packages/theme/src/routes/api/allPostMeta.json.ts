import { getCollection } from "astro:content";
import { getSortedPosts } from "../../utils.js";

/**
 * 全站文章元数据（P1-12 随机文章栏数据源）。
 * 脱敏：加密文章不输出（客户端无需过滤，亦不暴露哪些文章加密）；
 * draft 在 PROD 下不输出。
 */
export async function GET() {
	const all = await getCollection("posts", ({ data }) =>
		import.meta.env.PROD ? !data.draft : true,
	);
	const posts = getSortedPosts(all);
	const body = posts
		.filter((p) => !p.data.password)
		.map((p) => ({
			id: p.id,
			title: p.data.title,
			description: p.data.description,
			published: p.data.published.getTime(),
			category: p.data.category || "",
		}));
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
