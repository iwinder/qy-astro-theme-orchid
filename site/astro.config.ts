// @ts-check

import mdx from "@astrojs/mdx";
import orchidTheme from "@windcoder/astro-theme-orchid";
import { defineConfig } from "astro/config";

import { siteConfig, themeConfig } from "./config";

// 站点只做三件事：声明域名、接入主题、传入配置。
// 页面、样式引擎、路由全部由 @windcoder/astro-theme-orchid 提供；
// 具体配置项按模块拆分在 site/config/ 下，此处仅做组装。
export default defineConfig({
	site: siteConfig.siteUrl,
	// MDX（§4.67）是站点能力选择：是否写 .mdx 文章由站点决定。
	// @astrojs/mdx 默认继承站点 markdown 配置，主题注册的自定义
	// unified processor（KaTeX/Mermaid/directives/EC 插件）原样作用于 .mdx。
	integrations: [mdx(), orchidTheme(themeConfig)],
});
