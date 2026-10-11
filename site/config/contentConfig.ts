import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 内容渲染配置集合：文章列表 / 目录 / LaTeX / 图表 / 邮箱防爬

// 文章列表：cover 图卡 / compact 紧凑行，每页 6 篇
export const postList: ThemeConfig["postList"] = { style: "cover", pageSize: 6 };

// 文章页目录（默认开，显式写出便于按需关闭）
export const toc: ThemeConfig["toc"] = { enabled: true };

// LaTeX 数学公式（M3b-b4）：remark-math + rehype-katex 构建期渲染，无客户端运行时
export const latex: ThemeConfig["latex"] = { enabled: true };

// 图表（M3b-b4）：Mermaid 构建期双主题静态 SVG；PlantUML 依赖外部渲染服务
// （默认官方服务，自建/内网部署时替换 server 地址）
export const diagram: ThemeConfig["diagram"] = {
	mermaid: {
		enabled: true,
		lightTheme: "github-light",
		darkTheme: "github-dark",
	},
	plantuml: {
		enabled: true,
		server: "https://www.plantuml.com/plantuml",
	},
};

// 邮箱防爬（M3b-b4）：mailto 链接构建期编码，点击时内联脚本还原
export const emailProtection: ThemeConfig["emailProtection"] = {
	enabled: true,
	method: "base64",
};
