import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// Expressive Code 代码高亮（Astro 生态标准方案；ThemeConfig 键名 codeTheme）
// light/dark 为 Shiki 内置主题名（EC 双主题：dark 优先），按站点深浅模式经
// html.dark / html:not(.dark) 选择器切换；复制按钮/行号/折叠均由 EC 插件承担，
// math/mermaid/plantuml 块由各自插件先渲染，不经过 EC。
export const codeTheme: ThemeConfig["codeTheme"] = {
	light: "github-light",
	dark: "github-dark",
	fold: {
		enabled: true,
		lineThreshold: 15,
		previewLines: 8,
		defaultCollapsed: true,
	},
	lineNumbers: true,
	languageBadge: false,
	wrap: false,
};
