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
import { profileConfig } from "./profileConfig";
import { sidebarConfig } from "./sidebarConfig";
import { siteConfig } from "./siteConfig";
import { sponsorConfig } from "./sponsorConfig";

// 组装主题完整入参（键与 @windcoder/astro-theme-orchid 的 ThemeConfig 一一对应）
// 注意：本目录任意配置变更不会触发 dev 热更新（config 构建期为虚拟模块快照），
// 修改后需重启 dev server 才能生效。
export const themeConfig = {
	// 站点语言（<html lang>）
	lang: "zh-CN",
	title: siteConfig.title,
	description: siteConfig.description,
	author: siteConfig.author,
	accentColor: siteConfig.accentColor,
	hero: siteConfig.hero,
	since: siteConfig.since,
	footerText: siteConfig.footerText,
	pages: siteConfig.pages,
	categoryBar: siteConfig.categoryBar,
	keywords: siteConfig.keywords,
	logo: siteConfig.logo,
	colorMode: siteConfig.colorMode,
	footer: siteConfig.footer,
	codeTheme: siteConfig.codeTheme,
	// 导航栏 hue 调色面板（b5）：关闭后导航栏不出现调色按钮
	huePanel: { enabled: true },
	// 文章页相关/随机推荐栏（默认 5+5 篇）
	relatedPosts: { enabled: true, count: 5, randomCount: 5 },
	// OG 分享图（构建期生成 1200x630，meta 注入开关）
	og: { enabled: true },
	// 文章页「生成分享海报」按钮（纯客户端 canvas）
	sharePoster: { enabled: true },
	// 过时提醒卡：距最后更新超过 30 天显示
	outdated: { enabled: true, threshold: 30 },
	nav: navBarConfig,
	sidebar: sidebarConfig,
	profile: profileConfig,
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
	// 归档按年折叠 / 樱花特效（§4.30）：siteConfig 中配置
	archive: siteConfig.archive,
	sakura: siteConfig.sakura,
	// 页宽变量（§4.32）/ 背景壁纸（§4.35）：siteConfig 中配置
	pageWidth: siteConfig.pageWidth,
	wallpaper: siteConfig.wallpaper,
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
	profileConfig,
	sidebarConfig,
	siteConfig,
	sponsorConfig,
	toc,
};
