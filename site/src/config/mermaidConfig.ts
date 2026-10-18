import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// Mermaid 图表
// 构建期渲染双主题静态 SVG（light/dark 为内置主题名，跟随站点深浅模式）
export const mermaid: ThemeConfig["diagram"]["mermaid"] = {
	enabled: true,
	lightTheme: "github-light",
	darkTheme: "github-dark",
};
