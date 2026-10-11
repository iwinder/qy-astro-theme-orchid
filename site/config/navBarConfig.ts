import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 导航栏配置：label 显示文本，href 站内路径
export const navBarConfig: ThemeConfig["nav"] = [
	{ label: "首页", href: "/" },
	{ label: "归档", href: "/archive/" },
	{ label: "标签", href: "/tags/" },
	{ label: "画廊", href: "/gallery/" },
	{ label: "关于", href: "/about/" },
	{ label: "友链", href: "/friends/" },
	{ label: "留言板", href: "/guestbook/" },
];
