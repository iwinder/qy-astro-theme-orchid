import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 统一壁纸（§4.98）：横幅/全屏/覆盖透明/纯色四模式，替代原 banner + background 两段配置
// mode：banner 横幅壁纸（header 下方定高区域）/ fullscreen 全屏 / overlay 覆盖透明（内容卡片半透明透出壁纸）/ none 纯色背景
// switchable：导航栏露出模式循环切换按钮（访客偏好 localStorage 持久化，优先于配置 mode）
// src.desktop / src.mobile：壁纸图，非轮播时构建期随机取一张；支持 public 绝对路径、
//   外链 URL，相对路径相对站点 src/ 解析（src/assets 下图片直接写相对路径即可）
// src.playerUrl：视频壁纸源（仅 public 绝对路径或外链，不做构建期解析）；playerEnable 开启自动播放
// common.homeText：首页标题/副标题，subtitle 传数组并开 typewriter 即多行打字机轮播
// common.navbar：壁纸可见时导航栏透明档（semi 半透明 / semifull 滚动前全透明 / full 始终全透明）
// banner.height：横幅高度（vh）；homeOnly 仅首页显示；overlay.cardOpacity 内容卡片不透明度
export const wallpaper: ThemeConfig["wallpaper"] = {
	mode: "banner",
	switchable: true,
	playerEnable: false,
	src: {
		desktop: ["/gallery/demo-spring/photo-01.png"],
		mobile: [],
		playerUrl: [],
	},
	common: {
		dimOpacity: 0.2,
		darkDimOpacity: 0.65,
		playerMode: "random",
		homeText: {
			enable: true,
			title: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
			titleSize: "3.8rem",
			subtitle: ["一个关于技术、阅读与日常的安静角落。"],
			subtitleSize: "1.5rem",
			typewriter: {
				enable: false,
				speed: 100,
				deleteSpeed: 50,
				pauseTime: 2000,
			},
		},
		navbar: { transparentMode: "semi", enableBlur: true, blur: 5 },
		waves: false,
		gradient: false,
		carousel: { enable: false, interval: 5000, transitionEffect: "fade" },
	},
	banner: { height: 32, homeOnly: true, position: "center" },
	fullscreen: { position: "center" },
	overlay: { zIndex: -1, opacity: 0.8, blur: 0, cardOpacity: 0.5 },
};
