import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// PWA（§4.95）：manifest + Service Worker，可安装与离线兜底
// demo 站不开（惯例例外）：SW 会以构建为单位接管访客浏览器缓存，
// demo 频繁重建/预览时旧 SW 缓存会干扰预览新鲜度；真实部署站开启即可
export const pwa: ThemeConfig["pwa"] = {
	enabled: false,
	icons: [],
};
