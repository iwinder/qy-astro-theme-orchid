import { defineCollection } from "astro:content";
import {
	defineMomentSchema,
	definePostSchema,
} from "@windcoder/astro-theme-orchid/schema";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// 文章集合 schema 由主题提供（definePostSchema 工厂），
// 站点可在 extend 中追加自己的 frontmatter 字段，主题升级不会丢站点字段。
const posts = defineCollection({
	// §4.67：站点接入 @astrojs/mdx 后，posts 同时收 .md 与 .mdx。
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: definePostSchema(),
});

// spec 集合：独立页正文（about / friends / guestbook）。
// schema 留空（与 orchid-blog 对齐），主题路由经 getEntry('spec', ...) 消费；
// 缺少某个条目时对应页面降级为占位提示，不会构建失败。
const spec = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/spec" }),
	schema: z.object({}),
});

// 说说集合（§4.87）：正文即说说内容，published 排序时间流；
// 配合 siteConfig.ts 的 pages.moments: true 打开 /moments/ 路由
const moments = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/moments" }),
	schema: defineMomentSchema(),
});

export const collections = { posts, spec, moments };
