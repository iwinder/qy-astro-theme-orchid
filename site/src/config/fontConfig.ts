import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 字体（Astro Fonts API，§4.66）
// provider 标准六种：google / fontsource / local / bunny / fontshare / npm；
// role 把字体变量映射到主题三角色（body 正文 / display 标题 / mono 代码），
// 映射规则保留原角色回退栈——Inter 只覆盖 latin（数字与西文），
// 中文回落 PingFang SC / 微软雅黑；preload 开启后首屏预载字体文件。
// provider=local 时改填 options.variants（src/weight/style 声明本地文件）
export const fonts: ThemeConfig["fonts"] = [
	{
		name: "Inter",
		cssVariable: "--font-inter",
		provider: "fontsource",
		weights: [400, 700],
		styles: ["normal", "italic"],
		subsets: ["latin"],
		fallbacks: ["sans-serif"],
		preload: true,
		role: "body",
	},
];
