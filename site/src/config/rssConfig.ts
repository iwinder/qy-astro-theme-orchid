import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// RSS 输出
// fullText: true 时 item 携带 content:encoded 全文——构建期逐篇容器渲染
// （与文章页同一套插件产物），构建时间随文章数增加，默认摘要输出
// limit: feed 输出条数（按发布时间新→旧取前 N 篇）
export const rss: ThemeConfig["rss"] = {
	fullText: false,
	limit: 20,
};
