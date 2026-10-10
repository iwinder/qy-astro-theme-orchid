import type { AstroIntegration } from 'astro';
import tailwindcss from '@tailwindcss/vite';
import { themeConfigSchema, type ThemeConfig } from './schema.js';
import { overridesPlugin, themeConfigPlugin } from './vite.js';

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
        });

        injectRoute({
          pattern: '/',
          entrypoint: `${PKG_NAME}/routes/index.astro`,
          prerender: true,
        });
        injectRoute({
          pattern: '/posts/[...slug]',
          entrypoint: `${PKG_NAME}/routes/posts/[...slug].astro`,
          prerender: true,
        });

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
