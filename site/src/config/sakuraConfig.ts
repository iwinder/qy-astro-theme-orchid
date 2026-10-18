import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 樱花飘落特效：全站 canvas 粒子（程序化花瓣，零贴图资产）；
// prefers-reduced-motion 自动停用
export const sakura: ThemeConfig["sakura"] = {
	enabled: false,
	density: 24,
};
