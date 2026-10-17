import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 视觉特效与悬浮组件配置（§4.58 自 siteConfig 拆分：页面装饰与常驻悬浮件归于此处）
// 未出现的字段均有主题默认值兜底（约定大于配置），此处列出全部顶层键供按需覆盖。

// ---------- 首页 banner（hero 文案与背景壁纸合并单配置） ----------
// enabled 总开关，false 时图与文案都不渲染；
// src 单图 URL 或多图数组（构建期随机取一张）；quote 支持 <em> 强调（强调色渲染），
// 留空则不渲染文案；homeOnly: true 仅首页显示，false 全站显示
export const banner: ThemeConfig["banner"] = {
	enabled: true,
	src: "/gallery/demo-spring/photo-01.png",
	height: 32,
	dimOpacity: 0.2,
	position: "center",
	homeOnly: true,
	quote: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
	sub: "一个关于技术、阅读与日常的安静角落。",
};

// ---------- 樱花飘落特效 ----------
// 全站 canvas 粒子（程序化花瓣，零贴图资产）；prefers-reduced-motion 自动停用
export const sakura: ThemeConfig["sakura"] = {
	enabled: false,
	density: 24,
};

// ---------- 悬浮音乐播放器 ----------
// local 模式自研播放内核（audio + LRC 解析），跨页不断播；
// playMode: list 列表循环 / one 单曲循环 / random 随机；
// lrc 三种形态：.lrc 文件路径 / 内联 LRC 文本 / 不配置即无歌词
export const music: ThemeConfig["music"] = {
	enabled: false,
	position: "left",
	volume: 0.7,
	playMode: "list",
	showLyrics: true,
	playlist: [
		{
			name: "晨光序曲",
			artist: "SoundHelix",
			url: "/music/a.mp3",
			cover: "/music/cover-a.jpg",
			lrc: "/music/a.lrc",
		},
		{
			name: "午后随想",
			artist: "SoundHelix",
			url: "/music/b.mp3",
			lrc: "[00:00.00]纯音乐，请静静聆听",
		},
		{ name: "夜航星", artist: "SoundHelix", url: "/music/c.mp3" },
	],
};

// ---------- Live2D 看板娘 ----------
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
