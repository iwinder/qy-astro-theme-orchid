import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 个人资料卡（§4.15）：sidebar.widgets 中 type:"profile" 时渲染。
// avatar 留空则渲染昵称首字字头像；url 为头像/昵称点击跳转（如 /about/），留空不包链接。
//
// links[].icon 两种写法（§4.59）：
// 1. 内置图标名（推荐）：直接填名字即可，主题构建期内联渲染，无需手写 SVG；
//    支持的名字见主题包 src/icons.ts（下表已覆盖常用的），weixin=wechat、twitter=x 别名可用；
// 2. 内联 SVG 字符串：以 "<" 开头（如 `<svg viewBox="0 0 24 24">...`），兼容自定义图标。
// 名字未命中时跳过图标只渲染文字；showName: true 时在图标旁显示名称文字。
export const profileConfig: ThemeConfig["profile"] = {
	avatar: "",
	name: "windcoder",
	bio: "写点技术，也写点生活。",
	url: "/about/",
	links: [
		{
			name: "GitHub",
			url: "https://github.com/iwinder",
			icon: "github",
			showName: false,
		},
		{
			name: "QQ",
			// 替换为 QQ 号对应的临时会话/二维码分享链接
			url: "https://qm.qq.com/",
			icon: "qq",
			showName: false,
		},
		{
			name: "微信",
			// 微信无主页链接：可换成公众号文章页、二维码图片页，或留空跳转 /about/
			url: "https://weixin.qq.com/",
			icon: "wechat",
			showName: false,
		},
		{
			name: "微博",
			url: "https://weibo.com/u/xxxxxxx",
			icon: "weibo",
			showName: false,
		},
		{
			name: "哔哩哔哩",
			url: "https://space.bilibili.com/xxxxxxx",
			icon: "bilibili",
			showName: false,
		},
		{
			name: "小红书",
			url: "https://www.xiaohongshu.com/user/profile/xxxxxxx",
			icon: "xiaohongshu",
			showName: false,
		},
		{
			name: "邮箱",
			url: "mailto:hello@example.com",
			icon: "email",
			showName: false,
		},
		{
			name: "RSS",
			url: "/rss.xml",
			icon: "rss",
			showName: false,
		},
	],
};
