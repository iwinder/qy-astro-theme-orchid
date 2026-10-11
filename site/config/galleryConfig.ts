import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 画廊（M3b-b8）：albums.id 对应 site/public/gallery/<id>/，照片构建期扫描
// （本地图片文件 + urls.txt 远程 URL）；cover 留空依次取 cover.* / 第一张照片；
// password 非空即加密相册。以下均为中性演示数据。
export const galleryConfig: ThemeConfig["gallery"] = {
	title: "画廊",
	description: "用镜头收藏时间的碎片。",
	columnWidth: 240,
	albums: [
		{
			id: "demo-spring",
			name: "春日山行",
			description: "清明前后入山，溪水初涨，新叶正好。本地图片扫描演示。",
			date: "2026-04-05",
			location: "杭州 · 九溪",
			tags: ["风光", "徒步"],
		},
		{
			id: "demo-remote",
			name: "云端拾光",
			description: "远程图片演示：public/gallery/<id>/urls.txt 每行一个 URL。",
			date: "2026-06-18",
			location: "青藏线",
			tags: ["风光"],
		},
		{
			id: "demo-secret",
			name: "私人胶片",
			description: "加密相册演示：输入密码后查看照片。",
			date: "2026-08-20",
			location: "家中",
			tags: ["日常"],
			password: "orchid2026",
			passwordHint: "主题名 + 年份",
		},
	],
};
