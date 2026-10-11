/**
 * i18n 入口（构建期 only）：语言在构建时由 themeConfig.lang 确定并注入产物，
 * 不做客户端语言切换。缺译时回退中文键源，保证渲染永不落空。
 * 客户端动态文案（复制按钮/灯箱 aria）经 BaseLayout 输出的 #qy-ui-labels JSON 载体带入。
 *
 * 注意：本模块顶层 import virtual:theme/config，只能被 dev/build 运行期的
 * vite 管线模块（.astro 路由/组件）引用；astro.config 静态 import 链上的
 * node 侧代码（rehype 插件等）请改用 ./resolve.js 的 resolveLabel(lang, key)。
 */
import config from 'virtual:theme/config';
import { resolveLabel, type UiKey } from './resolve.js';

/** 取 UI 文案；vars 替换 {name} 占位符；缺译回退中文 */
export function t(key: UiKey, vars?: Record<string, string | number>): string {
  return resolveLabel(config.lang, key, vars);
}

export type { UiKey };
