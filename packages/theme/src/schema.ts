import { z } from 'astro/zod';

/**
 * 主题配置 schema（astro.config.ts 中 defineTheme({...}) 的入参）
 * 后续新增配置项一律给 default，保证老站点升级后无需改动配置
 */
export const themeConfigSchema = z.object({
  /** 站点名 */
  title: z.string(),
  /** 站点描述（首页与 meta description 默认值） */
  description: z.string().default(''),
  /** 作者名 */
  author: z.string().default(''),
  /** 强调色（hex），驱动全局 accent 变量 */
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, 'accentColor 必须是 hex 颜色，如 #4a9d8f')
    .default('#4a9d8f'),
  /** 顶部导航 */
  nav: z
    .array(z.object({ label: z.string(), href: z.string().url().or(z.string().startsWith('/')) }))
    .default([]),
  /** 页脚附加文案 */
  footerText: z.string().default(''),
});

export type ThemeConfig = z.input<typeof themeConfigSchema>;
export type ResolvedThemeConfig = z.output<typeof themeConfigSchema>;

/**
 * 内容 schema 工厂：文章集合 frontmatter。
 * Astro 要求 collections 定义在站点项目内，站点通过
 *   schema: definePostSchema({ ...自定义字段 })
 * 在兼容主题字段的基础上扩展自己的 frontmatter。
 * password/passwordHint 为 orchid-blog 加密文章兼容字段（功能在后续里程碑实现）。
 * lang/author/sourceLink/licenseName/licenseUrl/comment 为 orchid-blog frontmatter 全量对齐
 * （旧文章实际使用为 0，预留以保证迁移与未来写作无损）。
 */
export function definePostSchema(extensions: z.ZodRawShape = {}) {
  return z
    .object({
      title: z.string(),
      description: z.string().default(''),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      pinned: z.boolean().default(false),
      image: z.string().optional(),
      tags: z.array(z.string()).default([]),
      category: z.string().optional(),
      password: z.string().optional(),
      passwordHint: z.string().optional(),
      /** 语言（BCP-47，如 zh-CN；空 = 跟随站点） */
      lang: z.string().optional(),
      /** 作者名（空 = 跟随站点配置） */
      author: z.string().optional(),
      /** 原文链接（转载文章） */
      sourceLink: z.string().optional(),
      /** 文章级许可证（空 = 跟随站点全局配置） */
      licenseName: z.string().optional(),
      licenseUrl: z.string().optional(),
      /** 本篇是否展示评论（默认开） */
      comment: z.boolean().default(true),
    })
    .extend(extensions);
}
