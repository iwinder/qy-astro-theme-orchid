import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import config from "virtual:theme/config";
import type { APIRoute } from "astro";
import satori from "satori";
import { formatDate, getSortedPosts, hexToHsl } from "../../utils.js";

/**
 * OG 分享图（P1-11，默认关）：为每篇文章构建期生成 1200x630 分享图（/og/<slug>.png）。
 * satori（对象树→SVG）+ sharp（SVG→PNG）。相对原版 orchid-blog 的主题化调整：
 * 1. 不读站点磁盘头像/favicon（主题中立），页头以 accent 圆角方块作站点标识；
 * 2. 修复原版缺陷：Google Fonts 拉取失败时原版 fonts 为空数组，satori 会抛
 *    "No font provided" 令整个构建崩溃，此处降级为 sharp 纯形状占位图 + warn，构建不中断。
 */

interface FontOption {
	data: Buffer | ArrayBuffer;
	name: string;
	weight: 400 | 700;
	style: "normal";
}

export async function getStaticPaths() {
	// 与相关文章口径一致：草稿（getSortedPosts 内已滤）、加密文章不生成分享图
	const sorted = getSortedPosts(await getCollection("posts"));
	return sorted
		.filter((post) => !post.data.password)
		.map((post) => ({ params: { slug: `${post.id}.png` }, props: { post } }));
}

let fontCache: { regular: Buffer | null; bold: null | Buffer } | null = null;

/** Google Fonts CSS2 API 抽 Noto Sans SC woff2（400/700 两档），模块级缓存；失败缓存 null 供降级 */
async function fetchNotoSansSCFonts() {
	if (fontCache) return fontCache;
	try {
		const cssResp = await fetch(
			"https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap",
		);
		if (!cssResp.ok) throw new Error(`Google Fonts CSS 响应 ${cssResp.status}`);
		const cssText = await cssResp.text();
		const getUrlForWeight = (weight: number) => {
			const block = cssText.match(
				new RegExp(`@font-face\\s*{[^}]*font-weight:\\s*${weight}[^}]*}`),
			);
			return block?.[0]?.match(/url\((https:[^)]+)\)/)?.[1] ?? null;
		};
		const regularUrl = getUrlForWeight(400);
		const boldUrl = getUrlForWeight(700);
		if (!regularUrl || !boldUrl)
			throw new Error("Google Fonts CSS 中未找到 woff2 地址");
		const [rResp, bResp] = await Promise.all([
			fetch(regularUrl),
			fetch(boldUrl),
		]);
		if (!rResp.ok || !bResp.ok) throw new Error("字体文件下载失败");
		fontCache = {
			regular: Buffer.from(await rResp.arrayBuffer()),
			bold: Buffer.from(await bResp.arrayBuffer()),
		};
	} catch (err) {
		console.warn("[og] Google Fonts 拉取失败，OG 图降级为占位图：", err);
		fontCache = { regular: null, bold: null };
	}
	return fontCache;
}

/** 无字体时的占位图：纯形状 SVG（深底 + accent 竖条），不依赖任何字体 */
async function placeholderPng(accent: string) {
	const sharp = (await import("sharp")).default;
	const { h } = hexToHsl(accent);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="hsl(${h}, 15%, 12%)"/><rect x="60" y="281" width="10" height="68" rx="6" fill="${accent}"/></svg>`;
	return sharp(Buffer.from(svg)).png().toBuffer();
}

export const GET: APIRoute = async ({ props }) => {
	const { post } = props as { post: CollectionEntry<"posts"> };
	const { h } = hexToHsl(config.accentColor);
	const primary = `hsl(${h}, 90%, 65%)`;
	const textColor = "hsl(0, 0%, 95%)";
	const subtleTextColor = `hsl(${h}, 10%, 75%)`;
	const backgroundColor = `hsl(${h}, 15%, 12%)`;

	const { regular, bold } = await fetchNotoSansSCFonts();
	const fonts: FontOption[] = [];
	if (regular)
		fonts.push({
			name: "Noto Sans SC",
			data: regular,
			weight: 400,
			style: "normal",
		});
	if (bold)
		fonts.push({
			name: "Noto Sans SC",
			data: bold,
			weight: 700,
			style: "normal",
		});
	if (fonts.length === 0) {
		// 降级：占位图保证构建不中断（原版此处 satori 抛 "No font provided" 崩构建）
		const png = await placeholderPng(config.accentColor);
		return new Response(new Uint8Array(png), {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	}

	const description = post.data.description;
	const author = config.author || config.title;

	const template = {
		type: "div",
		props: {
			style: {
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor,
				fontFamily: '"Noto Sans SC", sans-serif',
				padding: "60px",
			},
			children: [
				// 页头：accent 圆角方块 + 站点名（原版为 favicon 图，主题化后不依赖站点资源）
				{
					type: "div",
					props: {
						style: {
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: "20px",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										width: "48px",
										height: "48px",
										borderRadius: "10px",
										backgroundColor: primary,
									},
								},
							},
							{
								type: "div",
								props: {
									style: {
										fontSize: "36px",
										fontWeight: 600,
										color: subtleTextColor,
									},
									children: config.title,
								},
							},
						],
					},
				},
				// 中部：accent 竖条 + 标题（3 行截断）+ 描述（2 行截断）
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							flexGrow: 1,
							gap: "20px",
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", alignItems: "flex-start" },
									children: [
										{
											type: "div",
											props: {
												style: {
													width: "10px",
													height: "68px",
													backgroundColor: primary,
													borderRadius: "6px",
													marginTop: "14px",
												},
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "72px",
													fontWeight: 700,
													lineHeight: 1.2,
													color: textColor,
													marginLeft: "25px",
													display: "-webkit-box",
													overflow: "hidden",
													textOverflow: "ellipsis",
													lineClamp: 3,
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical",
												},
												children: post.data.title,
											},
										},
									],
								},
							},
							description && {
								type: "div",
								props: {
									style: {
										fontSize: "32px",
										lineHeight: 1.5,
										color: subtleTextColor,
										paddingLeft: "35px",
										display: "-webkit-box",
										overflow: "hidden",
										textOverflow: "ellipsis",
										lineClamp: 2,
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									},
									children: description,
								},
							},
						].filter(Boolean),
					},
				},
				// 页脚：作者 + 日期（原版含头像，主题化后不依赖站点资源）
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							width: "100%",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										fontSize: "28px",
										fontWeight: 600,
										color: textColor,
									},
									children: author,
								},
							},
							{
								type: "div",
								props: {
									style: { fontSize: "28px", color: subtleTextColor },
									children: formatDate(post.data.published),
								},
							},
						],
					},
				},
			],
		},
	};

	const svg = await satori(template, { width: 1200, height: 630, fonts });
	const sharp = (await import("sharp")).default;
	const png = await sharp(Buffer.from(svg)).png().toBuffer();

	return new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
