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
    })
    .extend(extensions);
}
