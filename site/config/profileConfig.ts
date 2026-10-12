import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 个人资料卡（§4.15）：sidebar.widgets 中 type:"profile" 时渲染。
// avatar 留空则渲染昵称首字字头像；url 为头像/昵称点击跳转（如 /about/），留空不包链接。
// links[].icon 存内联 SVG 字符串（stroke 风格 1.75、viewBox 24，经 set:html 渲染）；
// showName: true 时在图标旁显示名称文字（纯文字链接则只配 showName 不配 icon）。
export const profileConfig: ThemeConfig["profile"] = {
	avatar: "",
	name: "windcoder",
	bio: "写点技术，也写点生活。",
	url: "/about/",
	links: [
		{
			name: "GitHub",
			url: "https://github.com/iwinder",
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
			showName: false,
		},
		{
			name: "邮箱",
			url: "mailto:hello@example.com",
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
			showName: false,
		},
		{
			name: "RSS",
			url: "/rss.xml",
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`,
			showName: false,
		},
	],
};
