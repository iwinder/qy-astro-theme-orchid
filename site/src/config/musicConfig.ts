import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 悬浮音乐播放器
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
