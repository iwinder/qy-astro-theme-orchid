import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// Live2D 看板娘
// model 单对象或数组（数组时可经菜单 action=switchModel 轮换）；
// menus 不配置用默认三键（主页/回顶部/休眠）；tips 整体不配置用库默认，
// enable: false 显式关闭气泡；zIndex 默认 240（低于返回顶部 250 / 音乐悬浮球 255）
export const live2d: ThemeConfig["live2d"] = {
	enabled: false,
	model: { path: "https://model.hacxy.cn/cat-black/model.json" },
	position: "bottom-right",
	tips: {
		welcomeMessage: ["欢迎来到清言集～", "今天也辛苦啦"],
		messages: ["去喝杯水，休息一下吧", "喜欢这篇文章的话留个言吧～"],
		duration: 3000,
		interval: 6000,
	},
};
