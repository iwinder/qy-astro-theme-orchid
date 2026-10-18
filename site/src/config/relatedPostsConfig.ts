import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 文章页相关/随机推荐
// 相关栏构建期评分（标签/标题 Jaccard + 时间新鲜度 + 同分类）；
// 随机栏客户端 fetch /api/allPostMeta.json；加密文章不进两个池子
export const relatedPosts: ThemeConfig["relatedPosts"] = {
	enabled: true,
	count: 5,
	randomCount: 5,
};
