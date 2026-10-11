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
  /**
   * 强调色（hex），建议带彩度的颜色。
   * 构建期转 HSL 注入 --accent-h/s/l，全部派生色（accent/soft/ink 等）由 HSL 公式计算；
   * 暗色模式下亮度按 html.dark 规则提亮。
   */
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'accentColor 必须是 6 位 hex 颜色，如 #4a9d8f')
    .default('#4a9d8f'),
  /** 站点语言（<html lang>） */
  lang: z.string().default('zh-CN'),
  /** 首页 hero 区（quote 留空则整个 hero 不渲染） */
  hero: z
    .object({
      /** 主句，<em> 标签内文字会以强调色渲染 */
      quote: z.string().default(''),
      sub: z.string().default(''),
    })
    .default({}),
  /** 文章列表 */
  postList: z
    .object({
      /** 默认卡片形态：cover 图卡 / compact 紧凑行；文章 frontmatter.cardStyle 可按篇覆盖 */
      style: z.enum(['cover', 'compact']).default('cover'),
      /** 每页文章数（首页分页） */
      pageSize: z.number().int().min(1).default(10),
      /** 无图文章的兜底封面图（可选；不配置则降级为纯文字卡） */
      fallbackCover: z.string().optional(),
    })
    .default({}),
  /** 文章页目录 */
  toc: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({}),
  /** 版权声明（文章级 licenseName/licenseUrl 可覆盖；enabled=false 全站关闭） */
  license: z
    .object({
      enabled: z.boolean().default(true),
      name: z.string().default('CC BY-NC-SA 4.0'),
      url: z.string().default('https://creativecommons.org/licenses/by-nc-sa/4.0/'),
    })
    .default({}),
  /** 建站日期（YYYY-MM-DD，站点信息卡「已运行」；不配置则不显示该行） */
  since: z.string().optional(),
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
 * password/passwordHint 为加密文章兼容字段（功能在后续里程碑实现）。
 * lang/author/sourceLink/licenseName/licenseUrl/comment 为 orchid-blog frontmatter 全量对齐
 * （旧文章实际使用为 0，预留以保证迁移与未来写作无损）。
 * cardStyle：文章列表卡片形态按篇覆盖（决策 7）。
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
      /** 列表卡片形态按篇覆盖：cover 图卡 / compact 紧凑行 / text 纯文字 */
      cardStyle: z.enum(['cover', 'compact', 'text']).optional(),
    })
    .extend(extensions);
}
