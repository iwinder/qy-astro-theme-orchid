import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 侧栏体系：widgets 数组决定组件类型与渲染顺序，enabled 控制单个开关；
// showOnPost: false 表示该 widget 仅列表页显示（文章页侧栏不出现）。
// onPost: true 开启文章页侧栏（关闭时文章页退回悬浮目录）。
// friends.count 控制侧栏展示数量，random: true 则每次构建随机取样。
export const sidebarConfig: ThemeConfig["sidebar"] = {
	onPost: true,
	widgets: [
		{ type: "announcement" },
		{ type: "categories" },
		{ type: "tags" },
		{ type: "friends" },
		{ type: "calendar" },
		{ type: "toc", showOnPost: false },
		{ type: "siteInfo" },
		{ type: "advertisement" },
	],
	friends: { count: 3, random: false },
};
