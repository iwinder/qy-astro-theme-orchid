import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
	// §4.63：sitemap 改由官方 @astrojs/sitemap 产出，入口为 sitemap-index.xml
	const sitemap = site
		? new URL("sitemap-index.xml", site).href
		: "https://blog.example.com/sitemap-index.xml";
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${sitemap}`,
		"",
	].join("\n");
	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
