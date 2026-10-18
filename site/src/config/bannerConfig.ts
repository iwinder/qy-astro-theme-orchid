import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 首页横幅（hero 文案与背景壁纸合并单配置）
// enabled 总开关，false 时图与文案都不渲染；
// src 单图 URL 或多图数组（构建期随机取一张）；quote 支持 <em> 强调（强调色渲染），
// 留空则不渲染文案；homeOnly: true 仅首页显示，false 全站显示
export const banner: ThemeConfig["banner"] = {
	enabled: true,
	src: "/gallery/demo-spring/photo-01.png",
	height: 32,
	dimOpacity: 0.2,
	position: "center",
	homeOnly: true,
	quote: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
	sub: "一个关于技术、阅读与日常的安静角落。",
};
