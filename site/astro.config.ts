// @ts-check
import { defineConfig } from 'astro/config';
import orchidTheme from '@windcoder/astro-theme-orchid';

// 站点只做三件事：声明域名、接入主题、传入配置。
// 页面、样式引擎、路由全部由 @windcoder/astro-theme-orchid 提供。
export default defineConfig({
  site: 'https://blog.example.com',
  integrations: [
    orchidTheme({
      title: '清言集',
      description: '写点技术，也写点生活。一个清新简约的博客。',
      author: 'windcoder',
      accentColor: '#4a9d8f',
      // 首页 hero：quote 支持 <em> 强调（强调色渲染），留空则整个 hero 不渲染
      hero: {
        quote: '山中何事？<em>松花酿酒</em>，<em>春水煎茶</em>。',
        sub: '一个关于技术、阅读与日常的安静角落。',
      },
      // 文章列表：cover 图卡 / compact 紧凑行，每页 6 篇
      postList: { style: 'cover', pageSize: 6 },
      // 文章页目录 + 版权声明（默认开，显式写出便于按需关闭）
      toc: { enabled: true },
      license: { enabled: true },
      // 建站日期（站点信息卡「已运行」），占位日期，接入真实站点时自行修改
      since: '2024-01-01',
      nav: [
        { label: '首页', href: '/' },
        { label: '归档', href: '/archive/' },
        { label: '标签', href: '/tags/' },
        { label: '关于', href: '/about/' },
        { label: '友链', href: '/friends/' },
        { label: '留言板', href: '/guestbook/' },
      ],
      footerText: 'Built with Astro & @windcoder/astro-theme-orchid',
      // 独立页开关：置 false 后主题不注入对应路由（演示站全部开启）
      pages: { about: true, friends: true, guestbook: true, sponsor: true },
      // 友链数据源：同时驱动友链页与首页侧栏 widget（决策 8）。
      // 以下均为中性演示数据；image 留空时用首字字头像兜底
      friends: {
        title: '友链',
        description: '山不在高，有仙则名。',
        sort: 'weight',
        apply: {
          title: '想和清言集交换链接？',
          description:
            '欢迎写信给我，附上站点名称、链接、头像和一句话介绍。认真经营的博客，我都会回访。',
          link: 'mailto:hi@example.com',
          label: '申请友链',
        },
        list: [
          {
            title: '青山不改',
            site: 'https://example.com/qingshan',
            image:
              'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20green%20mountain%20and%20moon%20badge%2C%20celadon%20green%20palette&image_size=square',
            desc: '山中岁月长，林间无事忙',
            weight: 10,
          },
          {
            title: '拾光者',
            site: 'https://example.com/shiguang',
            image:
              'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20vintage%20camera%2C%20warm%20amber%20palette&image_size=square',
            desc: '用镜头收藏时间的碎片',
            weight: 8,
          },
          {
            title: '码农手记',
            site: 'https://example.com/codenote',
            image:
              'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20laptop%20with%20code%20brackets%2C%20indigo%20palette&image_size=square',
            desc: '代码之外，还有生活',
            tags: ['技术'],
            weight: 6,
          },
          {
            title: '一苇渡江',
            site: 'https://example.com/yiwei',
            // 无头像：演示首字字头像兜底
            image: '',
            desc: '读书、行路、渡自己',
            weight: 4,
          },
          {
            title: '蘑菇房',
            site: 'https://example.com/mushroom',
            image:
              'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flat%20minimal%20illustration%20avatar%2C%20cute%20mushroom%20house%2C%20soft%20red%20and%20cream%20palette&image_size=square',
            desc: '种花、做饭、慢慢长大',
            tags: ['生活'],
            weight: 2,
            // enabled: false 的条目两处（页面/侧栏）都不渲染
            enabled: true,
          },
        ],
      },
      // 打赏页：image（收款码）与 link（跳转）至少配一个；均为空渲染占位框
      sponsor: {
        title: '打赏',
        description: '如果内容对你有帮助，请作者喝杯茶。',
        usage: '你的打赏将用于服务器维护、内容创作与功能开发。',
        showSponsorsList: true,
        methods: [
          {
            name: '支付宝',
            icon: '',
            // 收款码图放 site/public/ 后填路径，如 /assets/images/sponsor/alipay.png
            image: '',
            link: 'https://example.com/sponsor',
            description: '跳转链接打赏演示',
            enabled: true,
          },
          {
            name: '微信',
            icon: '',
            image: '',
            link: '',
            description: '收款码占位演示',
            enabled: true,
          },
        ],
        sponsors: [
          { name: '青山不改', avatar: '', amount: '¥66', date: '2026-09-01' },
          { name: '拾光者', avatar: '', amount: '¥30', date: '2026-09-15' },
        ],
      },
      // 评论系统：先 Artalk（适配层分发，Twikoo/Waline/Giscus/Disqus 后续接入）。
      // 演示站用占位后端地址，接入真实站点时换成自己的 Artalk server；
      // 文章 frontmatter comment: false 可按篇关闭
      comment: {
        enabled: true,
        provider: 'artalk',
        title: '评论',
        artalk: { server: 'https://artalk.example.com', locale: 'zh-CN', visitorCount: true },
      },
      // 侧栏公告（P1-17）：content 留空则整卡不渲染；closable 仅前台隐藏
      announcement: {
        title: '公告',
        content: '主题已支持公告栏、广告位与站点统计，欢迎体验。',
        link: { text: '了解更多', url: '/about/', external: false },
        closable: true,
      },
      // 侧栏广告位（P2 保留项，默认关闭）。完整形态示例：
      // advertisement: {
      //   enabled: true,
      //   title: '广告',
      //   image: '/assets/images/ad/banner.png',   // 或外链
      //   imageLink: 'https://example.com',
      //   imageAlt: '广告',
      //   content: '一句话广告文案',
      //   link: { text: '查看详情', url: 'https://example.com', external: true },
      //   closable: true,
      //   displayCount: -1,        // >0 时限制总展示次数
      //   expireDate: '2027-12-31' // 过期自动下线
      // },
      advertisement: { enabled: false },
      // 站点统计（P1-16）：四家按需填 ID，留空即不注入对应脚本；以下保持全空（中性演示）
      analytics: {
        googleAnalyticsId: '',
        microsoftClarityId: '',
        umami: { websiteId: '' },
        la51: { id: '' },
      },
      // LaTeX 数学公式（M3b-b4）：remark-math + rehype-katex 构建期渲染，无客户端运行时
      latex: { enabled: true },
      // 图表（M3b-b4）：Mermaid 构建期双主题静态 SVG；PlantUML 依赖外部渲染服务
      // （默认官方服务，自建/内网部署时替换 server 地址）
      diagram: {
        mermaid: { enabled: true, lightTheme: 'github-light', darkTheme: 'github-dark' },
        plantuml: { enabled: true, server: 'https://www.plantuml.com/plantuml' },
      },
      // 邮箱防爬（M3b-b4）：mailto 链接构建期编码，点击时内联脚本还原
      emailProtection: { enabled: true, method: 'base64' },
    }),
  ],
});
