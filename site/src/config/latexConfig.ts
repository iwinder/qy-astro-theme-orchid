import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// LaTeX 数学公式
// remark-math + rehype-katex 构建期渲染，无客户端运行时；false 时 $...$ 按普通文本
export const latex: ThemeConfig["latex"] = { enabled: true };
