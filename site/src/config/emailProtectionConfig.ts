import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 邮箱防爬
// mailto 链接构建期编码（base64 抗爬性更好 / rot13 零 atob 依赖），点击时内联还原
export const emailProtection: ThemeConfig["emailProtection"] = {
	enabled: true,
	method: "base64",
};
