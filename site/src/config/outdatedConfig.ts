import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 过时提醒
// 距最后更新（updated ?? published）超过 threshold 天时显示「最后更新」卡片与过时警告，
// 天数由客户端计算（构建期计算会随时间失效）
export const outdated: ThemeConfig["outdated"] = {
	enabled: true,
	threshold: 30,
};
