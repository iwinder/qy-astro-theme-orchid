import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 导航栏配置：
// - label 显示文本；href 站内以 / 开头，外链填完整 URL 并置 external: true
// - children 非空时渲染为下拉子菜单，父项 href 可省略（纯展开按钮）
// - 无 children 时必须提供 href
export const navBarConfig: ThemeConfig["nav"] = [
	{ label: "首页", href: "/" },
	{
		label: "文章",
		children: [
			{ label: "归档", href: "/archive/" },
			{ label: "分类", href: "/categories/" },
			{ label: "标签", href: "/tags/" },
			{ label: "专题", href: "/series/" },
		],
	},
	{ label: "画廊", href: "/gallery/", external: true },
	{
		label: "更多",
		children: [
			{ label: "关于", href: "/about/" },
			{ label: "友链", href: "/friends/" },
			{ label: "留言板", href: "/guestbook/" },
		],
	},
];
