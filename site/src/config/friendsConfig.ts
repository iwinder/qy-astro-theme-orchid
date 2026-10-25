import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 友链数据源：同时驱动友链页与首页侧栏 widget（决策 8）。
// featured: true 的条目优先展示在首页/列表侧栏（其余按 weight 补足）。
// 以下均为中性演示数据；image 留空时用首字字头像兜底
export const friendsConfig: ThemeConfig["friends"] = {
	title: "友链",
	description: "山不在高，有仙则名。",
	sort: "weight",
	// 本站信息卡：展示在申请友链卡左侧，每行可一键复制
	siteInfo: {
		title: "本站信息",
		name: "清言集",
		desc: "记录技术与生活的个人小站",
		site: "https://blog.example.com",
		// 演示用本地资源（public/favicon.svg）；生产填外链或站点图片路径
		avatar: "/favicon.svg",
	},
	apply: {
		title: "想和清言集交换链接？",
		description:
			"欢迎写信给我，附上站点名称、链接、头像和一句话介绍。认真经营的博客，我都会回访。",
		link: "mailto:hi@example.com",
		label: "申请友链",
		// 申请步骤：序号列表展示申请流程
		steps: [
			{
				title: "添加本站友链",
				description: "请先将本站信息添加至您的友链页面，字段可直接复制。",
			},
			{
				title: "发送申请",
				description:
					"通过下方按钮留言或发邮件，附上您的站点名称、链接、头像与介绍。",
			},
			{
				title: "等待审核",
				description: "收到申请后会尽快处理，通过后您的站点会出现在本页。",
			},
		],
		// 申请资料模板：与站点信息一致，可直接复制
		template: [
			{ label: "站点名称", value: "清言集" },
			{ label: "站点描述", value: "记录技术与生活的个人小站" },
			{ label: "站点链接", value: "https://blog.example.com" },
			{ label: "头像链接", value: "/favicon.svg" },
		],
	},
	// 注意事项卡：全宽展示在双卡下方
	notice: {
		title: "注意事项",
		items: [
			{
				term: "互换原则",
				description: "先友后链：建议先添加本站链接并保持互动，再发起申请。",
			},
			{
				term: "链接维护",
				description:
					"请确保友链长期可访问，失联或长期打不开的链接可能会被移除。",
			},
			{
				term: "内容要求",
				description: "站点需有实质性原创内容，拒绝违规违法内容。",
			},
			{
				term: "站点要求",
				description: "支持 HTTPS 访问，无恶意代码与弹窗广告。",
			},
		],
	},
	list: [
		{
			title: "青山不改",
			site: "https://example.com/qingshan",
			image: "",
			desc: "山中岁月长，林间无事忙",
			tags: ["技术"],
			weight: 10,
			// featured: true 首页侧栏优先展示
			featured: true,
		},
		{
			title: "拾光者",
			site: "https://example.com/shiguang",
			image: "",
			desc: "用镜头收藏时间的碎片",
			tags: ["生活"],
			weight: 8,
		},
		{
			title: "码农手记",
			site: "https://example.com/codenote",
			image: "",
			desc: "代码之外，还有生活",
			tags: ["技术"],
			weight: 6,
		},
		{
			title: "一苇渡江",
			site: "https://example.com/yiwei",
			// 无头像：演示首字字头像兜底
			image: "",
			desc: "读书、行路、渡自己",
			tags: ["资源"],
			weight: 4,
		},
		{
			title: "蘑菇房",
			site: "https://example.com/mushroom",
			image: "",
			desc: "种花、做饭、慢慢长大",
			tags: ["生活"],
			weight: 2,
			// enabled: false 的条目两处（页面/侧栏）都不渲染
			enabled: true,
		},
	],
};
