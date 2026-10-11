import { unified } from '@astrojs/markdown-remark';
import type { AstroIntegration } from 'astro';
import tailwindcss from '@tailwindcss/vite';
import { themeConfigSchema, type ThemeConfig } from './schema.js';
import { overridesPlugin, themeConfigPlugin } from './vite.js';
import { remarkExcerpt } from './plugins/remark-excerpt.js';
import { remarkReadingTime } from './plugins/remark-reading-time.js';
import {
  rehypeAnchor,
  rehypeCallouts,
  rehypeCodeBlock,
  rehypeExternalLinks,
  rehypeFigure,
  rehypeFirstImage,
} from './plugins/rehype.js';

export const PKG_NAME = '@windcoder/astro-theme-orchid';

/**
 * 主题入口：以 Astro Integration 形式接入站点
 *
 * - injectRoute：注入主题路由（首页 / 文章页），entrypoint 指向包内文件，站点无需复制任何页面
 * - updateConfig：注入 Tailwind v4 Vite 插件 + 虚拟模块（config）+ overrides 解析
 * - injectTypes（astro:config:done）：为虚拟模块提供类型声明
 *
 * 升级主题 = 升级本包版本号；站点定制走 src/overrides/ 同名覆盖，不会被升级覆盖。
 */
export function defineTheme(userConfig: ThemeConfig): AstroIntegration {
  // 启动即校验配置，配置错误在 dev/build 一开始就报出来
  const config = themeConfigSchema.parse(userConfig);

  return {
    name: PKG_NAME,
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        // Tailwind v4 由主题注入，站点无需关心样式引擎
        updateConfig({
          vite: {
            plugins: [tailwindcss()],
          },
          // remark：阅读时长/字数 + 自动摘要（渲染期写入 remarkPluginFrontmatter）
          // rehype：外链新窗/提示块/图片 figure 化+灯箱/首图提取/标题锚点/代码块包装（顺序敏感）
          // Astro 7 默认 Sätteri 处理器不执行 JS 插件，须显式 unified() 处理器承载
          // shiki：代码高亮（github-dark），替代 Expressive Code（零新依赖）
          markdown: {
            processor: unified({
              remarkPlugins: [remarkReadingTime, remarkExcerpt],
              rehypePlugins: [
                rehypeExternalLinks,
                rehypeCallouts,
                rehypeFigure,
                rehypeFirstImage,
                rehypeAnchor,
                rehypeCodeBlock,
              ],
            }),
            shikiConfig: { theme: 'github-dark' },
          },
        });

        const routes: [pattern: string, file: string][] = [
          ['/', 'index.astro'],
          ['/page/[page]', 'page/[page].astro'],
          ['/archive', 'archive.astro'],
          ['/tags', 'tags/index.astro'],
          ['/tags/[tag]', 'tags/[tag].astro'],
          ['/categories', 'categories/index.astro'],
          ['/categories/[category]', 'categories/[category].astro'],
          ['/posts/[...slug]', 'posts/[...slug].astro'],
          ['/rss.xml', 'rss.xml.ts'],
          ['/sitemap.xml', 'sitemap.xml.ts'],
          ['/robots.txt', 'robots.txt.ts'],
          ['/404', '404.astro'],
        ];
        // 独立页按开关注入（关闭则完全不生成对应路由，而非运行期 404 跳转）
        if (config.pages.about) routes.push(['/about', 'about.astro']);
        if (config.pages.friends) routes.push(['/friends', 'friends.astro']);
        if (config.pages.guestbook) routes.push(['/guestbook', 'guestbook.astro']);
        if (config.pages.sponsor) routes.push(['/sponsor', 'sponsor.astro']);
        for (const [pattern, file] of routes) {
          injectRoute({
            pattern,
            entrypoint: `${PKG_NAME}/routes/${file}`,
            prerender: true,
          });
        }

        updateConfig({
          vite: {
            plugins: [themeConfigPlugin(config), overridesPlugin()],
          },
        });
      },
      // astro 7 中 injectTypes 只在 astro:config:done 上提供
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({
          filename: `${PKG_NAME}.d.ts`,
          content: [
            `declare module 'virtual:theme/config' {`,
            `  const config: import('${PKG_NAME}/schema').ResolvedThemeConfig;`,
            `  export default config;`,
            `}`,
            `declare module 'virtual:theme/*' {`,
            `  const Component: any;`,
            `  export default Component;`,
            `}`,
          ].join('\n'),
        });
      },
    },
  };
}

export default defineTheme;
