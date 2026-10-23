import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 文章列表
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
	// {slug} 占位符会被替换为文章 slug（末尾自动追加 ?v=<hash>）；
	// 可传本地 public 路径列表做多源随机（此处用 public/thumb/ 下 40 张）
	randomCover: {
		apis: Array.from({ length: 40 }, (_, i) => `/thumb/${i + 1}.jpg`),
	},
	// 无图/图源全失效时的兜底封面（构建期兜底 + 客户端加载失败兜底共用）
	fallbackCover: "/thumb/40.jpg",
	defaultLayout: "list",
	allowSwitch: true,
	gridColumnWidth: 320,
};
