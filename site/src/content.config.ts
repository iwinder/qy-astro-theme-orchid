import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { definePostSchema } from '@windcoder/astro-theme-orchid/schema';

// 文章集合 schema 由主题提供（definePostSchema 工厂），
// 站点可在 extend 中追加自己的 frontmatter 字段，主题升级不会丢站点字段。
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: definePostSchema(),
});

export const collections = { posts };
