import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 侧栏体系：widgets 数组决定组件类型与渲染顺序，enabled 控制单个开关。
// 每个 widget 两个方向的显隐（对齐参考模板 showOnPostPage / hideOnNonPostPage）：
// - showOnPost: false → 仅首页/列表页显示（文章页侧栏不出现）
// - postOnly: true    → 仅文章页侧栏显示（首页/列表页不出现，如 toc）
// 两者缺省（默认）→ 列表页与文章页侧栏都显示。
// onPost: true 开启文章页侧栏（关闭时文章页退回悬浮目录）。
// friends.count 控制侧栏展示数量，random: true 则每次构建随机取样。
// position: "sticky" → 渲染进粘性容器，≥768px 跟随滚动（§4.50，默认 "top" 普通流式）；
// 此处数组会整体覆写主题默认 widgets，sticky 项必须显式声明 position（item 默认值不继承主题内层默认）
export const sidebarConfig: ThemeConfig["sidebar"] = {
	onPost: true,
	widgets: [
		// 个人资料卡（§4.15）：内容见 profileConfig.ts
		// 每个 widget 的 enabled（默认 true）：置 false 后该组件在所有页面（列表页+文章页）都不渲染
		{ type: "profile", enabled: true },
		{ type: "announcement", enabled: true },
		{ type: "categories", enabled: true, position: "sticky" },
		{ type: "tags", enabled: true, position: "sticky" },
		{ type: "friends", enabled: true },
		// calendar/toc 移动端（<768px）隐藏（§4.49，与主题默认一致）
		{ type: "calendar", enabled: true, hideOnMobile: true, position: "sticky" },
		// toc 仅文章页侧栏渲染（列表页无目录可展示）
		{
			type: "toc",
			postOnly: true,
			enabled: true,
			hideOnMobile: true,
			position: "sticky",
		},
		{ type: "siteInfo", enabled: true },
		{ type: "advertisement", enabled: true },
	],
	friends: { count: 3, random: false },
	// 日历 widget 参数（§4.41）：postTooltip 开启后日历下方文章列表条目悬停显示全文 title
	calendar: { postTooltip: false },
};
