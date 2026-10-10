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
      nav: [{ label: '首页', href: '/' }],
      footerText: 'Built with Astro & @windcoder/astro-theme-orchid',
    }),
  ],
});
