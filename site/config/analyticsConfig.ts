import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 站点统计（P1-16）：四家按需填 ID，留空即不注入对应脚本；以下保持全空（中性演示）
export const analyticsConfig: ThemeConfig["analytics"] = {
	googleAnalyticsId: "",
	microsoftClarityId: "",
	umami: { websiteId: "" },
	la51: { id: "" },
};
