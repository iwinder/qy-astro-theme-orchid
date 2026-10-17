import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 内容渲染与文章页功能配置（§4.58 重组：codeTheme 自 siteConfig 移入，
// relatedPosts/og/sharePoster/outdated 自 config/index.ts 硬编码移入，配置项一处可查）
// 未出现的字段均有主题默认值兜底（约定大于配置），此处列出全部顶层键供按需覆盖。

// ---------- 文章列表 ----------
// style: cover 图卡 / compact 紧凑行（frontmatter.cardStyle 可按篇覆盖 cover/compact/text）
// showCover: false 时列表卡不渲染封面（整体降级纯文字形态）
// fallbackCover: 无图文章的兜底封面（public 路径或外链；不配置则降级纯文字卡）
// allowSwitch: true 导航栏出现列表/网格切换按钮；defaultLayout 为初始形态（list/grid）
// gridColumnWidth: 网格模式最小列宽（px），实际列数由容器宽自适应
export const postList: ThemeConfig["postList"] = {
	style: "cover",
	showCover: true,
	pageSize: 10,
	// randomCover.apis 非空时，frontmatter 显式 image: "api" 的文章按 slug 确定性取图，
	// {slug} 占位符会被替换为文章 slug（末尾自动追加 ?v=<hash>）
	randomCover: { apis: ["https://picsum.photos/seed/{slug}/540/304"] },
	defaultLayout: "list",
	allowSwitch: true,
	gridColumnWidth: 320,
};

// ---------- 文章页目录（独立悬浮 TOC；sidebar.onPost 开启后由侧栏 toc widget 承担） ----------
export const toc: ThemeConfig["toc"] = { enabled: true };

// ---------- 代码高亮（§4.61：Expressive Code，Astro 生态标准方案） ----------
// light/dark 为 Shiki 内置主题名（EC 双主题：dark 优先），按站点深浅模式经
// html.dark / html:not(.dark) 选择器切换；复制按钮/行号/折叠均由 EC 插件承担，
// math/mermaid/plantuml 块由各自插件先渲染，不经过 EC。
export const codeTheme: ThemeConfig["codeTheme"] = {
	light: "github-light",
	dark: "github-dark",
	fold: {
		enabled: true,
		lineThreshold: 15,
		previewLines: 8,
		defaultCollapsed: true,
	},
	lineNumbers: true,
	languageBadge: false,
	wrap: false,
};

// ---------- 文章页相关/随机推荐 ----------
// 相关栏构建期评分（标签/标题 Jaccard + 时间新鲜度 + 同分类）；
// 随机栏客户端 fetch /api/allPostMeta.json；加密文章不进两个池子
export const relatedPosts: ThemeConfig["relatedPosts"] = {
	enabled: true,
	count: 5,
	randomCount: 5,
};

// ---------- OG 分享图 ----------
// 构建期为每篇文章生成 1200x630 分享图（/og/<slug>.png）；
// Google Fonts 拉取失败时降级纯形状占位图，构建不中断
export const og: ThemeConfig["og"] = { enabled: true };

// ---------- 分享海报 ----------
// 文章页「生成分享海报」按钮，纯浏览器 canvas + qrcode（点开才加载），构建零开销
export const sharePoster: ThemeConfig["sharePoster"] = { enabled: true };

// ---------- 过时提醒 ----------
// 距最后更新（updated ?? published）超过 threshold 天时显示「最后更新」卡片与过时警告，
// 天数由客户端计算（构建期计算会随时间失效）
export const outdated: ThemeConfig["outdated"] = {
	enabled: true,
	threshold: 30,
};

// ---------- LaTeX 数学公式 ----------
// remark-math + rehype-katex 构建期渲染，无客户端运行时；false 时 $...$ 按普通文本
export const latex: ThemeConfig["latex"] = { enabled: true };

// ---------- 图表 ----------
// mermaid 构建期双主题静态 SVG；plantuml 依赖外部渲染服务（自建/内网替换 server）
export const diagram: ThemeConfig["diagram"] = {
	mermaid: {
		enabled: true,
		lightTheme: "github-light",
		darkTheme: "github-dark",
	},
	plantuml: {
		enabled: true,
		server: "https://www.plantuml.com/plantuml",
		lightTheme: "",
		darkTheme: "",
	},
};

// ---------- 邮箱防爬 ----------
// mailto 链接构建期编码（base64 抗爬性更好 / rot13 零 atob 依赖），点击时内联还原
export const emailProtection: ThemeConfig["emailProtection"] = {
	enabled: true,
	method: "base64",
};
