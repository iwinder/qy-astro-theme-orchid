// 站点基础配置（只留站点身份与全站开关；各功能配置见同目录同名配置文件；
// siteUrl 同时供 astro.config.ts 的 site 键使用）
export const siteConfig = {
	// 站点域名（RSS/sitemap/canonical 基准），接入真实站点时必改
	siteUrl: "https://blog.example.com",
	// 站点名（不配置时主题用 "Orchid Blog" 兜底，正式接入应显式配置）
	title: "清言集",
	// 站点描述（首页与 meta description 默认值）
	description: "写点技术，也写点生活。一个清新简约的博客。",
	// 站点级 SEO keywords：非文章页 meta keywords；文章页由 frontmatter tags 覆盖；留空不输出
	keywords: ["技术", "生活", "博客", "Astro"],
	// 导航栏 Logo：标题左侧图片（public 路径或外链），置空只渲染文字标题
	logo: "/favicon.svg",
	// favicon 图标列表：非空时替换主题默认 favicon；theme 指定 "light"/"dark" 时按系统深浅切换（可配双图标）
	favicon: [{ src: "/favicon.svg", type: "image/svg+xml", sizes: "any" }],
	// 作者名（版权行 / 文章作者兜底）
	author: "windcoder",
	// 强调色（6 位 hex）：全部派生色（accent/soft/ink 等）由 HSL 公式计算；访客可用导航栏调色面板临时改
	accentColor: "#4a9d8f",
	// 站点语言（<html lang> 与 UI 文案语言包）
	lang: "zh-CN",
	// 构建期日期时区（IANA 名）：文章/归档等日期输出与构建机时区解耦，留空跟随构建环境
	timezone: "Asia/Shanghai",
	// 建站日期（YYYY-MM-DD，站点信息卡「已运行」），不配置则不显示该行
	since: "2024-01-01",
	// 图片防盗链（§4.87）：命中域名的外链图片构建期加 referrerpolicy="no-referrer"，
	// 绕过 B 站图床等的 Referer 校验；裸域名匹配自身与子域，*.example.com 只匹配子域
	noReferrer: {
		domains: ["i0.hdslb.com", "i1.hdslb.com", "i2.hdslb.com", "*.bilibili.com"],
	},
	// 独立页开关：置 false 后主题不注入对应路由（路由完全不生成，而非运行期 404）
	pages: {
		about: true,
		friends: true,
		guestbook: true,
		sponsor: true,
		gallery: true,
		// 专题聚合页 /series/ 与 /series/[name]/（§4.31）
		series: true,
		// 说说页 /moments/（§4.87）：需在 content.config.ts 定义 moments 集合
		moments: true,
	},
	// 分类导航栏：首页 post-list 与文章页 post-main 顶部横条（与正文同列宽不全宽）
	categoryBar: {
		enabled: true,
	},
	// 导航栏 hue 调色面板：false 时导航栏不出现调色按钮（预设色板为代码级常量）
	huePanel: {
		enabled: true,
	},
	// 默认深浅模式（访客未手动切换时的初值）：light / dark / system；
	// as const 防止 TS 把 "system" 拓宽为 string（ThemeConfig["colorMode"] 是字面量联合）
	colorMode: "system" as const,
	// 暗色模式适配（§4.89）：暗色下对外链内容图（白底截图/图表）压亮度防刺眼；
	// 单图豁免给 img 加 class="no-adapt"
	darkMode: {
		adaptExternalImages: true,
	},
	// 内容区页宽（800-1920 px，≥1280 屏按 min(92vw, 此值) 计算）；
	// 文章页维持 1120px 阅读行宽不跟随铺开
	pageWidth: 1600,
	// 页脚自定义 HTML（备案号等合规信息），留空不渲染
	footer: {
		customHtml:
			'<a href="https://beian.miit.gov.cn/" target="_blank">某ICP备xxxx号</a>',
	},
};
