import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 版权声明（§4.58 全量展示）：prefix/suffix 自定义声明文案（留空用语言包默认
// 「本文采用…许可，转载请注明出处与作者。」）；enabled: false 全站关闭；
// 文章 frontmatter license: false / licenseName / licenseUrl 按篇覆盖
export const licenseConfig: ThemeConfig["license"] = {
	enabled: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
	prefix: "",
	suffix: "",
};
