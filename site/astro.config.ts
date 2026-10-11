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
      ],
      footerText: 'Built with Astro & @windcoder/astro-theme-orchid',
    }),
  ],
});
