// 站点基础配置：站点级元信息 + 主题顶层散键
// siteUrl 同时供 astro.config.ts 的 site 键（RSS/sitemap/canonical 基准）使用
export const siteConfig = {
	siteUrl: "https://blog.example.com",
	title: "清言集",
	description: "写点技术，也写点生活。一个清新简约的博客。",
	// 站点级 SEO keywords（§4.19）：非文章页 meta keywords；文章页由 tags 覆盖
	keywords: ["技术", "生活", "博客", "Astro"],
	// 导航栏 Logo（§4.20）：标题左侧图片（public 路径或外链），置空只渲染文字标题
	logo: "/favicon.svg",
	author: "windcoder",
	accentColor: "#4a9d8f",
	// 首页 hero：quote 支持 <em> 强调（强调色渲染），留空则整个 hero 不渲染
	hero: {
		quote: "山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。",
		sub: "一个关于技术、阅读与日常的安静角落。",
	},
	// 建站日期（站点信息卡「已运行」），占位日期，接入真实站点时自行修改
	since: "2024-01-01",
	footerText: "Built with Astro & @windcoder/astro-theme-orchid",
	// 独立页开关：置 false 后主题不注入对应路由（演示站全部开启）
	pages: {
		about: true,
		friends: true,
		guestbook: true,
		sponsor: true,
		gallery: true,
	},
	// 分类导航栏（§4.15）：BaseLayout 全站顶部横条（首页/归档 + 分类滚动区）
	categoryBar: {
		enabled: true,
	},
	// 默认深浅模式（访客未手动切换时的初值）：light / dark / system
	// as const 防止 TS 把 "system" 拓宽为 string（ThemeConfig["colorMode"] 是字面量联合）
	colorMode: "system" as const,
	// 页脚自定义 HTML（备案号等合规信息），留空不渲染；
	// 示例：'<a href="https://beian.miit.gov.cn/" target="_blank">某ICP备xxxx号</a>'
	footer: {
		customHtml: "",
	},
	// 代码高亮双主题（§4.17）：Shiki 内置主题名，light/dark 跟随站点深浅模式
	codeTheme: {
		light: "github-light",
		dark: "github-dark",
	},
	// 归档按年折叠（§4.30）：开启后年份头可点击，最新一年默认展开
	archive: {
		fold: true,
	},
	// 樱花飘落特效（§4.30）：演示开启；density 为同屏花瓣数（1-200）
	sakura: {
		enabled: true,
		density: 24,
	},
	// 内容区页宽（§4.32）：主壳与文章双列的最大宽度（800-1920 px）
	pageWidth: 1120,
	// 背景壁纸（§4.35）：Header 下方下沉横幅；src 可传数组（构建期随机取一张）
	wallpaper: {
		src: "/wallpaper/banner-01.jpg",
		height: 32,
		dimOpacity: 0.2,
		position: "center",
		homeOnly: true,
	},
	// 悬浮音乐播放器（§4.36）：local 模式，歌单指向 public/music 静态资源
	// 歌词三种形态各演示一首：a.lrc 文件 / 曲B 内联字符串 / 曲C 无歌词
	// as const 防止 TS 把枚举值拓宽为 string（schema 是字面量联合）
	music: {
		enabled: true,
		position: "left" as const,
		volume: 0.7,
		playMode: "list" as const,
		showLyrics: true,
		playlist: [
			{ name: "晨光序曲", artist: "SoundHelix", url: "/music/a.mp3", cover: "/music/cover-a.jpg", lrc: "/music/a.lrc" },
			{ name: "午后随想", artist: "SoundHelix", url: "/music/b.mp3", lrc: "[00:00.00]纯音乐，请静静聆听" },
			{ name: "夜航星", artist: "SoundHelix", url: "/music/c.mp3" },
		],
	},
};
