// 配置索引（纯组装：任何键不再在此硬编码，全部来自本目录各模块配置，
// 「能配什么」以各配置文件为准；未导出的字段均有主题默认值兜底——约定大于配置，
// astro.config.ts 只需 import { siteConfig, themeConfig } 即可。
// 注意：本目录任意配置变更不会触发 dev 热更新（config 构建期为虚拟模块快照），
// 修改后需重启 dev server 才能生效。

import type { ThemeConfig } from "@windcoder/astro-theme-orchid";
import { advertisementConfig } from "./advertisementConfig";
import { analyticsConfig } from "./analyticsConfig";
import { announcementConfig } from "./announcementConfig";
import { archive } from "./archiveConfig";
import { background } from "./backgroundConfig";
import { bangumi } from "./bangumiConfig";
import { banner } from "./bannerConfig";
import { commentConfig } from "./commentConfig";
import { emailProtection } from "./emailProtectionConfig";
import { codeTheme } from "./expressiveCodeConfig";
import { fonts } from "./fontConfig";
import { friendsConfig } from "./friendsConfig";
import { galleryConfig } from "./galleryConfig";
import { latex } from "./latexConfig";
import { licenseConfig } from "./licenseConfig";
import { live2d } from "./live2dConfig";
import { mermaid } from "./mermaidConfig";
import { music } from "./musicConfig";
import { navBarConfig } from "./navBarConfig";
import { outdated } from "./outdatedConfig";
import { plantuml } from "./plantumlConfig";
import { postList } from "./postListConfig";
import { profileConfig } from "./profileConfig";
import { relatedPosts } from "./relatedPostsConfig";
import { rss } from "./rssConfig";
import { sakura } from "./sakuraConfig";
import { og, sharePoster } from "./shareConfig";
import { sidebarConfig } from "./sidebarConfig";
import { siteConfig } from "./siteConfig";
import { sponsorConfig } from "./sponsorConfig";
import { toc } from "./tocConfig";

// 组装主题完整入参（键与 @windcoder/astro-theme-orchid 的 ThemeConfig 一一对应）
export const themeConfig = {
	// 站点身份与全站开关：siteConfig.ts
	lang: siteConfig.lang,
	timezone: siteConfig.timezone,
	title: siteConfig.title,
	description: siteConfig.description,
	author: siteConfig.author,
	accentColor: siteConfig.accentColor,
	since: siteConfig.since,
	keywords: siteConfig.keywords,
	logo: siteConfig.logo,
	favicon: siteConfig.favicon,
	pages: siteConfig.pages,
	categoryBar: siteConfig.categoryBar,
	huePanel: siteConfig.huePanel,
	colorMode: siteConfig.colorMode,
	darkMode: siteConfig.darkMode,
	pageWidth: siteConfig.pageWidth,
	footer: siteConfig.footer,
	noReferrer: siteConfig.noReferrer,
	// 内容组织与文章页功能：各同名配置文件
	archive,
	postList,
	toc,
	codeTheme,
	relatedPosts,
	og,
	sharePoster,
	outdated,
	latex,
	diagram: { mermaid, plantuml },
	emailProtection,
	// 视觉特效与悬浮组件：各同名配置文件
	banner,
	background,
	sakura,
	music,
	live2d,
	fonts,
	// 站点级输出与内容处理：各同名配置文件
	rss,
	// 独立功能模块：各同名配置文件
	nav: navBarConfig,
	sidebar: sidebarConfig,
	profile: profileConfig,
	license: licenseConfig,
	friends: friendsConfig,
	bangumi,
	gallery: galleryConfig,
	sponsor: sponsorConfig,
	comment: commentConfig,
	announcement: announcementConfig,
	advertisement: advertisementConfig,
	analytics: analyticsConfig,
} satisfies ThemeConfig;

// 再导出全部模块配置，需要单项时可直接从本文件导入
export {
	advertisementConfig,
	analyticsConfig,
	announcementConfig,
	archive,
	background,
	bangumi,
	banner,
	codeTheme,
	commentConfig,
	emailProtection,
	fonts,
	friendsConfig,
	galleryConfig,
	latex,
	licenseConfig,
	live2d,
	mermaid,
	music,
	navBarConfig,
	og,
	outdated,
	plantuml,
	postList,
	profileConfig,
	relatedPosts,
	rss,
	sakura,
	sharePoster,
	sidebarConfig,
	siteConfig,
	sponsorConfig,
	toc,
};
