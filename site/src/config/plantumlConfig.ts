import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// PlantUML 图表
// 依赖外部渲染服务（自建/内网替换 server）；light/dark 留空用服务端默认
export const plantuml: ThemeConfig["diagram"]["plantuml"] = {
	enabled: true,
	server: "https://www.plantuml.com/plantuml",
	lightTheme: "",
	darkTheme: "",
};
