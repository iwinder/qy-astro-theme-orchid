import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 友链数据源：同时驱动友链页与首页侧栏 widget（决策 8）。
// featured: true 的条目优先展示在首页/列表侧栏（其余按 weight 补足）。
// 以下均为中性演示数据；image 留空时用首字字头像兜底
export const friendsConfig: ThemeConfig["friends"] = {
	title: "友链",
	description: "山不在高，有仙则名。",
	sort: "weight",
	apply: {
		title: "想和清言集交换链接？",
		description:
			"欢迎写信给我，附上站点名称、链接、头像和一句话介绍。认真经营的博客，我都会回访。",
		link: "mailto:hi@example.com",
		label: "申请友链",
	},
	list: [
		{
			title: "青山不改",
			site: "https://example.com/qingshan",
			image:
				"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20green%20mountain%20and%20moon%20badge%2C%20celadon%20green%20palette&image_size=square",
			desc: "山中岁月长，林间无事忙",
			weight: 10,
			// featured: true 首页侧栏优先展示
			featured: true,
		},
		{
			title: "拾光者",
			site: "https://example.com/shiguang",
			image:
				"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20vintage%20camera%2C%20warm%20amber%20palette&image_size=square",
			desc: "用镜头收藏时间的碎片",
			weight: 8,
		},
		{
			title: "码农手记",
			site: "https://example.com/codenote",
			image:
				"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20laptop%20with%20code%20brackets%2C%20indigo%20palette&image_size=square",
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
			weight: 4,
		},
		{
			title: "蘑菇房",
			site: "https://example.com/mushroom",
			image:
				"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20cute%20mushroom%20house%2C%20soft%20red%20and%20cream%20palette&image_size=square",
			desc: "种花、做饭、慢慢长大",
			tags: ["生活"],
			weight: 2,
			// enabled: false 的条目两处（页面/侧栏）都不渲染
			enabled: true,
		},
	],
};
