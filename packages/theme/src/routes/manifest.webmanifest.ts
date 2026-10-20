import config from "virtual:theme/config";
import type { APIRoute } from "astro";

/**
 * PWA manifest（§4.95）：构建期产出 /manifest.webmanifest。
 * - scope/start_url 由 site 根路径派生（主题假定部署在站点根路径）；
 * - name/description 留空回落站点 title/description，short_name 留空回落 name；
 * - icons 按 pwa.icons 全字段映射（可安装性至少需要 192x192 + 512x512 各一张）；
 * - enabled=false 时本端点根本不注入（index.ts 门控）。
 */
export const GET: APIRoute = ({ site }) => {
	const base = new URL("/", site ?? new URL("https://blog.example.com"))
		.pathname;
	const manifest = {
		name: config.pwa.name || config.title,
		short_name: config.pwa.shortName || config.pwa.name || config.title,
		description: config.pwa.description || config.description,
		start_url: base,
		scope: base,
		display: config.pwa.display,
		background_color: config.pwa.backgroundColor,
		theme_color: config.pwa.themeColor,
		icons: config.pwa.icons.map((icon) => ({
			src: icon.src,
			sizes: icon.sizes,
			type: icon.type,
			purpose: icon.purpose,
		})),
	};
	return new Response(JSON.stringify(manifest, null, 2), {
		headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
	});
};
