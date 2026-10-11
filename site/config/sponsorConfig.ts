import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 打赏页：image（收款码）与 link（跳转）至少配一个；均为空渲染占位框。
// showButtonInPost 控制文章页支持卡的「打赏支持」按钮（关闭后仅保留分享海报）
export const sponsorConfig: ThemeConfig["sponsor"] = {
	title: "打赏",
	description: "如果内容对你有帮助，请作者喝杯茶。",
	usage: "你的打赏将用于服务器维护、内容创作与功能开发。",
	showSponsorsList: true,
	showButtonInPost: true,
	methods: [
		{
			name: "支付宝",
			icon: "",
			// 收款码图放 site/public/ 后填路径，如 /assets/images/sponsor/alipay.png
			image: "",
			link: "https://example.com/sponsor",
			description: "跳转链接打赏演示",
			enabled: true,
		},
		{
			name: "微信",
			icon: "",
			image: "",
			link: "",
			description: "收款码占位演示",
			enabled: true,
		},
	],
	sponsors: [
		{ name: "青山不改", avatar: "", amount: "¥66", date: "2026-09-01" },
		{ name: "拾光者", avatar: "", amount: "¥30", date: "2026-09-15" },
	],
};
