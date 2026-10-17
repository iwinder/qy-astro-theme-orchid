// 配置索引（§4.58 重组后为纯组装：任何键不再在此硬编码，全部来自本目录各模块配置，
// 「能配什么」以各配置文件为准；未导出的字段均有主题默认值兜底——约定大于配置，
// astro.config.ts 只需 import { siteConfig, themeConfig } 即可。
// 注意：本目录任意配置变更不会触发 dev 热更新（config 构建期为虚拟模块快照），
// 修改后需重启 dev server 才能生效。

import type { ThemeConfig } from "@windcoder/astro-theme-orchid";
import { advertisementConfig } from "./advertisementConfig";
import { analyticsConfig } from "./analyticsConfig";
import { announcementConfig } from "./announcementConfig";
import { banner, fonts, live2d, music, sakura } from "./appearanceConfig";
import { commentConfig } from "./commentConfig";
import {
	codeTheme,
	diagram,
	emailProtection,
	latex,
	og,
	outdated,
	postList,
	relatedPosts,
	sharePoster,
	toc,
} from "./contentConfig";
import { friendsConfig } from "./friendsConfig";
import { galleryConfig } from "./galleryConfig";
import { licenseConfig } from "./licenseConfig";
import { navBarConfig } from "./navBarConfig";
import { profileConfig } from "./profileConfig";
import { sidebarConfig } from "./sidebarConfig";
import { siteConfig } from "./siteConfig";
import { sponsorConfig } from "./sponsorConfig";

// 组装主题完整入参（键与 @windcoder/astro-theme-orchid 的 ThemeConfig 一一对应）
export const themeConfig = {
	// 站点身份与全站开关：siteConfig.ts
	lang: siteConfig.lang,
	title: siteConfig.title,
	description: siteConfig.description,
	author: siteConfig.author,
	accentColor: siteConfig.accentColor,
	since: siteConfig.since,
	keywords: siteConfig.keywords,
	logo: siteConfig.logo,
	pages: siteConfig.pages,
	categoryBar: siteConfig.categoryBar,
	huePanel: siteConfig.huePanel,
	colorMode: siteConfig.colorMode,
	pageWidth: siteConfig.pageWidth,
	footer: siteConfig.footer,
	// 内容渲染与文章页功能：contentConfig.ts
	postList,
	toc,
	codeTheme,
	relatedPosts,
	og,
	sharePoster,
	outdated,
	latex,
	diagram,
	emailProtection,
	// 视觉特效与悬浮组件：appearanceConfig.ts
	banner,
	sakura,
	music,
	live2d,
	fonts,
	// 独立功能模块：各同名配置文件
	nav: navBarConfig,
	sidebar: sidebarConfig,
	profile: profileConfig,
	license: licenseConfig,
	friends: friendsConfig,
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
	banner,
	codeTheme,
	commentConfig,
	diagram,
	emailProtection,
	fonts,
	friendsConfig,
	galleryConfig,
	latex,
	licenseConfig,
	live2d,
	music,
	navBarConfig,
	og,
	outdated,
	postList,
	profileConfig,
	relatedPosts,
	sakura,
	sharePoster,
	sidebarConfig,
	siteConfig,
	sponsorConfig,
	toc,
};
