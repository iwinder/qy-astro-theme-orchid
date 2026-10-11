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
    .default({ quote: '', sub: '' }),
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
    .default({ style: 'cover', pageSize: 10 }),
  /** 文章页目录 */
  toc: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),
  /** 版权声明（文章级 licenseName/licenseUrl 可覆盖；enabled=false 全站关闭） */
  license: z
    .object({
      enabled: z.boolean().default(true),
      name: z.string().default('CC BY-NC-SA 4.0'),
      url: z.string().default('https://creativecommons.org/licenses/by-nc-sa/4.0/'),
    })
    .default({
      enabled: true,
      name: 'CC BY-NC-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    }),
  /** 建站日期（YYYY-MM-DD，站点信息卡「已运行」；不配置则不显示该行） */
  since: z.string().optional(),
  /** 顶部导航 */
  nav: z
    .array(z.object({ label: z.string(), href: z.string().url().or(z.string().startsWith('/')) }))
    .default([]),
  /** 页脚附加文案 */
  footerText: z.string().default(''),
  /** 独立页开关：关闭后主题不注入对应路由（路由完全不生成） */
  pages: z
    .object({
      about: z.boolean().default(true),
      friends: z.boolean().default(true),
      guestbook: z.boolean().default(true),
      sponsor: z.boolean().default(true),
    })
    .default({ about: true, friends: true, guestbook: true, sponsor: true }),
  /**
   * 友链数据源（决策 8）：同时驱动友链页全量渲染与首页侧栏友链 widget。
   * 头像 image 留空时以 title 首字渲染字头像兜底。
   */
  friends: z
    .object({
      /** 友链页标题 */
      title: z.string().default('友链'),
      /** 友链页副标题描述 */
      description: z.string().default(''),
      /** 页面级排序：weight 权重降序 / random 随机（构建期） */
      sort: z.enum(['weight', 'random']).default('weight'),
      /** 申请友链卡片（title 留空则整卡不渲染） */
      apply: z
        .object({
          title: z.string().default(''),
          description: z.string().default(''),
          /** 申请入口链接（mailto 或表单页） */
          link: z.string().default(''),
          label: z.string().default('申请友链'),
        })
        .default({ title: '', description: '', link: '', label: '申请友链' }),
      list: z
        .array(
          z.object({
            title: z.string(),
            site: z.string().url(),
            /** 头像图（外链或 public 路径；留空用字头像） */
            image: z.string().default(''),
            desc: z.string().default(''),
            tags: z.array(z.string()).default([]),
            /** 权重，越大越靠前（sort=weight 时生效） */
            weight: z.number().default(0),
            enabled: z.boolean().default(true),
          }),
        )
        .default([]),
    })
    .default({ title: '友链', description: '', sort: 'weight', apply: { title: '', description: '', link: '', label: '申请友链' }, list: [] }),
  /** 侧栏 widget（决策 8：友链 widget 默认开、显示 3 条） */
  sidebar: z
    .object({
      friends: z
        .object({
          enabled: z.boolean().default(true),
          count: z.number().int().min(1).default(3),
          /** 构建期随机取样；false 则按 weight 降序取前 count 个 */
          random: z.boolean().default(false),
        })
        .default({ enabled: true, count: 3, random: false }),
    })
    .default({ friends: { enabled: true, count: 3, random: false } }),
  /** 打赏页（收款码 image 与跳转 link 至少配一个；均为空渲染占位框） */
  sponsor: z
    .object({
      title: z.string().default('打赏'),
      description: z.string().default(''),
      /** 打赏用途说明（留空不渲染） */
      usage: z.string().default(''),
      showSponsorsList: z.boolean().default(true),
      methods: z
        .array(
          z.object({
            name: z.string(),
            /** 文本/emoji 角标（主题不内置图标依赖） */
            icon: z.string().default(''),
            /** 收款码图片（public 路径或外链） */
            image: z.string().default(''),
            /** 跳转链接（爱发电/ko-fi 等） */
            link: z.string().default(''),
            description: z.string().default(''),
            enabled: z.boolean().default(true),
          }),
        )
        .default([]),
      /** 打赏者名单（date 用 YYYY-MM-DD） */
      sponsors: z
        .array(
          z.object({
            name: z.string(),
            avatar: z.string().default(''),
            amount: z.string().default(''),
            date: z.string().default(''),
          }),
        )
        .default([]),
    })
    .default({
      title: '打赏',
      description: '',
      usage: '',
      showSponsorsList: true,
      methods: [],
      sponsors: [],
    }),
  /**
   * 评论系统（适配层分发：M3b-b2 先实现 Artalk，Twikoo/Waline/Giscus/Disqus 留扩展位）。
   * enabled=false 或 provider='none' 时页面完全不渲染评论区；
   * 文章另受 frontmatter comment 字段按篇控制。
   */
  comment: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['none', 'artalk']).default('none'),
      /** 评论区标题 */
      title: z.string().default('评论'),
      artalk: z
        .object({
          /** Artalk 后端地址 */
          server: z.string().default(''),
          locale: z.string().default('zh-CN'),
          /** 文章访问量统计（Artalk pageview，挂载点 #artalk-pv 由站点自行放置） */
          visitorCount: z.boolean().default(true),
        })
        .default({ server: '', locale: 'zh-CN', visitorCount: true }),
    })
    .default({
      enabled: false,
      provider: 'none',
      title: '评论',
      artalk: { server: '', locale: 'zh-CN', visitorCount: true },
    }),
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
