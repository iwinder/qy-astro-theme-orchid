import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 番组追番页（§4.93）：构建期从 bgm.tv 拉取「在看」动画收藏，生成静态 /bangumi 页
// demo 站不开（惯例例外）：构建期依赖外部 API（bgm.tv 可达性 + 限流），
// 保持 demo 构建离线可复现；本地体验可临时改 enabled: true + 自己的 bgm.tv 用户名
export const bangumi: ThemeConfig["bangumi"] = {
	enabled: false,
	userId: "",
	title: "追番",
	description: "",
};
