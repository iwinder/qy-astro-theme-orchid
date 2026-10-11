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
  /**
   * hue 调色面板（M3b-b5）：导航栏调色按钮 + 预设色板 + hue 滑杆。
   * 运行时覆写 --accent-h（s/l 保持配置值），持久化 localStorage('qy-hue')。
   * 色板预设为代码级常量，不进 schema。
   */
  huePanel: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),
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
      gallery: z.boolean().default(true),
    })
    .default({ about: true, friends: true, guestbook: true, sponsor: true, gallery: true }),
  /**
   * 画廊/相册（M3b-b8）。相册数据纯配置驱动，照片两个来源：
   * 1) site/public/gallery/<id>/ 目录扫描（图片文件按名排序，cover.* 优先做首图）
   * 2) 同目录 urls.txt（每行一个远程图片 URL，# 开头为注释），追加在本地之后
   * 加密相册（password 非空）经 EncryptedContent 构建期加密，slug 用相册 id。
   */
  gallery: z
    .object({
      /** 画廊页标题 */
      title: z.string().default('画廊'),
      /** 画廊页副标题描述 */
      description: z.string().default(''),
      albums: z
        .array(
          z.object({
            /** 相册 id：对应 public/gallery/<id>/ 目录，同时是详情 URL 段与加密 slug */
            id: z.string(),
            name: z.string(),
            description: z.string().default(''),
            date: z.string().default(''),
            location: z.string().default(''),
            tags: z.array(z.string()).default([]),
            /** 封面（public 路径或外链）：留空依次取 cover.* / 第一张照片 */
            cover: z.string().default(''),
            /** 非空即加密相册 */
            password: z.string().optional(),
            /** 解锁提示（仅展示，不参与解密） */
            passwordHint: z.string().optional(),
          }),
        )
        .default([]),
      /** 瀑布流最小列宽（px），≥640px 视口生效 */
      columnWidth: z.number().int().min(120).default(240),
    })
    .default({ title: '画廊', description: '', albums: [], columnWidth: 240 }),
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
  /**
   * 侧栏公告（P1-17）。content 留空则整卡不渲染；
   * closable 仅前台隐藏（无持久化，刷新恢复）。
   */
  announcement: z
    .object({
      title: z.string().default('公告'),
      content: z.string().default(''),
      link: z
        .object({
          text: z.string().default(''),
          url: z.string().default(''),
          external: z.boolean().default(false),
        })
        .default({ text: '', url: '', external: false }),
      closable: z.boolean().default(false),
    })
    .default({ title: '公告', content: '', link: { text: '', url: '', external: false }, closable: false }),
  /**
   * 侧栏广告位（P2 保留项，默认关闭）。enabled=false 整卡不渲染；
   * expireDate（YYYY-MM-DD）过期不渲染；displayCount>0 时按 localStorage 计数超限隐藏。
   */
  advertisement: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().default('广告'),
      /** 广告图（public 路径或外链，留空跳过） */
      image: z.string().default(''),
      /** 点击广告图跳转的链接（留空则图不可点） */
      imageLink: z.string().default(''),
      imageAlt: z.string().default('广告'),
      /** 文本内容（留空跳过） */
      content: z.string().default(''),
      /** 底部链接按钮（text 留空不渲染） */
      link: z
        .object({
          text: z.string().default(''),
          url: z.string().default(''),
          external: z.boolean().default(true),
        })
        .default({ text: '', url: '', external: true }),
      closable: z.boolean().default(true),
      /** 最大展示次数；-1 不限制 */
      displayCount: z.number().int().default(-1),
      /** 过期日期（YYYY-MM-DD），过期不渲染 */
      expireDate: z.string().optional(),
    })
    .default({
      enabled: false,
      title: '广告',
      image: '',
      imageLink: '',
      imageAlt: '广告',
      content: '',
      link: { text: '', url: '', external: true },
      closable: true,
      displayCount: -1,
    }),
  /**
   * 站点统计（P1-16）：GA / Clarity / Umami / 51la 四选多。
   * 对应 ID 留空即不注入该统计脚本，全部留空零副作用。
   */
  analytics: z
    .object({
      /** Google Analytics 衡量 ID（G-XXXX） */
      googleAnalyticsId: z.string().default(''),
      /** Microsoft Clarity 项目 ID */
      microsoftClarityId: z.string().default(''),
      umami: z
        .object({
          websiteId: z.string().default(''),
          scriptUrl: z.string().default('https://cloud.umami.is/script.js'),
          /** Umami Live 录制（replays）脚本地址 */
          replaysScriptUrl: z.string().default('https://cloud.umami.is/script.replays.js'),
          /** 外链自动标记 data-umami-event 上报 */
          trackOutboundLinks: z.boolean().default(true),
          /** Web Vitals 采集（自建 umami 需 v2.9+） */
          collectWebVitals: z.boolean().default(false),
          replays: z
            .object({
              enabled: z.boolean().default(false),
              sampleRate: z.number().min(0).max(1).default(0.15),
              maskLevel: z.enum(['moderate', 'strict']).default('moderate'),
              /** 单次录制最长毫秒 */
              maxDuration: z.number().int().default(300000),
              /** 录制屏蔽选择器（隐私元素） */
              blockSelector: z.string().default(''),
            })
            .default({ enabled: false, sampleRate: 0.15, maskLevel: 'moderate', maxDuration: 300000, blockSelector: '' }),
        })
        .default({
          websiteId: '',
          scriptUrl: 'https://cloud.umami.is/script.js',
          replaysScriptUrl: 'https://cloud.umami.is/script.replays.js',
          trackOutboundLinks: true,
          collectWebVitals: false,
          replays: { enabled: false, sampleRate: 0.15, maskLevel: 'moderate', maxDuration: 300000, blockSelector: '' },
        }),
      la51: z
        .object({
          /** 51.la 站点 ID（CK 编码） */
          id: z.string().default(''),
          /** 私有部署 SDK 地址（留空用官方） */
          sdkUrl: z.string().default(''),
          ck: z.string().default(''),
          autoTrack: z.boolean().default(true),
          hashMode: z.boolean().default(false),
          screenRecord: z.boolean().default(true),
        })
        .default({ id: '', sdkUrl: '', ck: '', autoTrack: true, hashMode: false, screenRecord: true }),
    })
    .default({
      googleAnalyticsId: '',
      microsoftClarityId: '',
      umami: {
        websiteId: '',
        scriptUrl: 'https://cloud.umami.is/script.js',
        replaysScriptUrl: 'https://cloud.umami.is/script.replays.js',
        trackOutboundLinks: true,
        collectWebVitals: false,
        replays: { enabled: false, sampleRate: 0.15, maskLevel: 'moderate', maxDuration: 300000, blockSelector: '' },
      },
      la51: { id: '', sdkUrl: '', ck: '', autoTrack: true, hashMode: false, screenRecord: true },
    }),
    /* ---------- LaTeX 数学公式（M3b-b4） ---------- */
    latex: z
      .object({
        /** 总开关：false 时 $...$ / $$...$$ 按普通文本渲染，不注入 katex 资源 */
        enabled: z.boolean().default(false),
      })
      .default({ enabled: false }),
    /* ---------- 图表（M3b-b4）：Mermaid 构建期双主题静态渲染 + PlantUML 外部服务 ---------- */
    diagram: z
      .object({
        mermaid: z
          .object({
            enabled: z.boolean().default(false),
            /** beautiful-mermaid 主题名（THEMES 键），浅/深各渲染一份，暗色模式切换显隐 */
            lightTheme: z.string().default('github-light'),
            darkTheme: z.string().default('github-dark'),
          })
          .default({ enabled: false, lightTheme: 'github-light', darkTheme: 'github-dark' }),
        plantuml: z
          .object({
            enabled: z.boolean().default(false),
            /** PlantUML 渲染服务地址（图片由浏览器访问该服务加载，自建/内网在此替换） */
            server: z.string().default('https://www.plantuml.com/plantuml'),
            /** 浅/深主题名（空 = 尊重图内 !theme 指令；深色留空复用浅色 URL） */
            lightTheme: z.string().default(''),
            darkTheme: z.string().default(''),
          })
          .default({
            enabled: false,
            server: 'https://www.plantuml.com/plantuml',
            lightTheme: '',
            darkTheme: '',
          }),
      })
      .default({
        mermaid: { enabled: false, lightTheme: 'github-light', darkTheme: 'github-dark' },
        plantuml: {
          enabled: false,
          server: 'https://www.plantuml.com/plantuml',
          lightTheme: '',
          darkTheme: '',
        },
      }),
    /* ---------- 邮箱防爬（M3b-b4）：mailto 构建期编码，点击时内联脚本还原 ---------- */
    emailProtection: z
      .object({
        enabled: z.boolean().default(false),
        /** base64：抗爬性更好；rot13：零 atob 依赖 */
        method: z.enum(['base64', 'rot13']).default('base64'),
      })
      .default({ enabled: false, method: 'base64' }),
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
