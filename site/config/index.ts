// 配置索引：各模块配置在此组装为完整主题入参 themeConfig，
// astro.config.ts 只需 import { siteConfig, themeConfig } 即可。

import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

import { analyticsConfig } from "./analyticsConfig";
import { advertisementConfig } from "./advertisementConfig";
import { announcementConfig } from "./announcementConfig";
import { commentConfig } from "./commentConfig";
import { diagram, emailProtection, latex, postList, toc } from "./contentConfig";
import { friendsConfig } from "./friendsConfig";
import { galleryConfig } from "./galleryConfig";
import { licenseConfig } from "./licenseConfig";
import { navBarConfig } from "./navBarConfig";
import { sidebarConfig } from "./sidebarConfig";
import { siteConfig } from "./siteConfig";
import { sponsorConfig } from "./sponsorConfig";

// 组装主题完整入参（键与 @windcoder/astro-theme-orchid 的 ThemeConfig 一一对应）
export const themeConfig = {
	title: siteConfig.title,
	description: siteConfig.description,
	author: siteConfig.author,
	accentColor: siteConfig.accentColor,
	hero: siteConfig.hero,
	since: siteConfig.since,
	footerText: siteConfig.footerText,
	pages: siteConfig.pages,
	nav: navBarConfig,
	sidebar: sidebarConfig,
	postList,
	toc,
	license: licenseConfig,
	friends: friendsConfig,
	gallery: galleryConfig,
	sponsor: sponsorConfig,
	comment: commentConfig,
	announcement: announcementConfig,
	advertisement: advertisementConfig,
	analytics: analyticsConfig,
	latex,
	diagram,
	emailProtection,
} satisfies ThemeConfig;

// 再导出各模块配置，需要单项时可直接从本文件导入
export {
	analyticsConfig,
	advertisementConfig,
	announcementConfig,
	commentConfig,
	diagram,
	emailProtection,
	friendsConfig,
	galleryConfig,
	latex,
	licenseConfig,
	navBarConfig,
	postList,
	sidebarConfig,
	siteConfig,
	sponsorConfig,
	toc,
};
