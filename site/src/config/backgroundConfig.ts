import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 全站背景壁纸：body 级 fixed 视口背景，与首页横幅（bannerConfig）相互独立
// enabled 总开关，默认 false；src 单图 URL 或多图数组（构建期随机取一张）；
// dimOpacity / darkDimOpacity 为浅色/暗色模式下的遮罩不透明度，blur 为模糊半径（px）
export const background: ThemeConfig["background"] = {
	enabled: false,
	src: "https://picsum.photos/seed/orchid-wallpaper/1920/1080",
	dimOpacity: 0.45,
	darkDimOpacity: 0.65,
	blur: 0,
};
