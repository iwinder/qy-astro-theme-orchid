// unified 处理器：Astro 7 默认 Sätteri 原生管线不执行 JS remark/rehype 插件，
// 必须显式切回 unified 处理器，插件数组直接传入 unified({...})。
// 铁律：数组元素一律是 attacher（插件工厂函数本身），带参数的用 [plugin, options]
// 元组；绝不能 push 已调用的 transformer（如 remarkMermaid()），否则 unified freeze
// 时会把它当 attacher 二次调用（tree=undefined）导致渲染崩溃，详见下方装配区注释
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
// mhchem 化学宏：import 时刻把 \ce{...} 等宏注册进 katex 实例。
// pnpm-workspace.yaml overrides 已把 rehype-katex 等统一到同一 katex 版本，
// 共享单实例，故 mhchem 宏对 rehype-katex 的渲染直接生效
import "katex/dist/contrib/mhchem.mjs";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
	rehypeAnchor,
	rehypeCallouts,
	rehypeCodeBlock,
	rehypeExternalLinks,
	rehypeFigure,
	rehypeFirstImage,
} from "./plugins/rehype.js";
import {
	rehypeDiagramPanZoom,
	rehypeMermaid,
	rehypePlantuml,
} from "./plugins/rehype-diagram.js";
import { rehypeGithubCard } from "./plugins/rehype-github-card.js";
import { rehypeEmailProtection } from "./plugins/rehype-email.js";
import { remarkMermaid, remarkPlantuml } from "./plugins/remark-diagram.js";
// 官方解析器：把 :::container / ::leaf / :text 语法解析为 directive 节点，
// 供 remarkDirectives 后处理（缺它则指令按字面文本渲染，卡片/容器全部失效）
import remarkDirective from "remark-directive";
import { remarkDirectives } from "./plugins/remark-directives.js";
import { remarkExcerpt } from "./plugins/remark-excerpt.js";
import { remarkImageGrid } from "./plugins/remark-image-grid.js";
import { remarkReadingTime } from "./plugins/remark-reading-time.js";
import { type ThemeConfig, themeConfigSchema } from "./schema.js";
import {
	overridesPlugin,
	themeConfigPlugin,
	themeLqipsPlugin,
} from "./vite.js";

export const PKG_NAME = "@windcoder/astro-theme-orchid";

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
			"astro:config:setup": ({ injectRoute, updateConfig }) => {
				// remark：阅读时长/字数 + 自动摘要（渲染期写入 remarkPluginFrontmatter）
				// LaTeX（b4）：remark-math 识别公式 → rehype-katex 构建期渲染（无客户端运行时）
				// Mermaid/PlantUML（b4）：remark 标记代码块 → rehype 构建期产出（静态 SVG / 外链 img）
				// 邮箱防爬（b4）：mailto 构建期编码 + 点击时内联解码
				// rehype 顺序：内容变换在前 → katex → 图表 → pan-zoom 兜底 → 邮箱防爬最后
				// Astro 7 接线方式：
				//   - 默认 Sätteri 处理器不执行 JS 插件，须显式 processor: unified({...})
				//     （integration 更新 processor 后 content store 不自动清除，
				//      重启 dev 前删 site/.astro/ 可排除陈旧缓存干扰）
				//   - unified 的铁律：插件数组里的元素一律是 attacher（插件工厂函数本身），
				//     带参数的用 [plugin, options] 元组（loadPlugins 展开 → parser.use(plugin, opts)）。
				//     千万不能 push remarkMermaid() 这种"已调用的 transformer"——unified freeze 时
				//     会把数组元素当 attacher 再调用一次（第一参数 tree=undefined），
				//     报 "Cannot read properties of undefined (reading 'children')"，且与文档内容无关
				// shiki：代码高亮（github-dark），替代 Expressive Code（零新依赖）
				// 顶层 shikiConfig 由 Astro 传入 createRenderer(shikiConfig)，与 unified 处理器兼容
				const remarkPlugins: any[] = [
					remarkReadingTime,
					remarkExcerpt,
					// [grid]…[/grid] 图片网格（§4.10）：聚合图片 → div.image-grid[data-cols=N]
					remarkImageGrid,
					// directive 处理链（§4.10，三段缺一不可）：
					//   ① remarkDirective 官方解析器：:::note / ::github 语法 → directive 节点
					//   ② remarkDirectives 后处理：26 种 admonition 容器 → blockquote +
					//      [!TYPE] 标记（复用 rehypeCallouts 渲染）；其余指令 → 同名自定义标签
					//   ③ rehypeGithubCard：github 标签 → 仓库卡片
					remarkDirective,
					remarkDirectives,
				];
				const rehypePlugins: any[] = [
					// GitHub 仓库卡片（§4.10）：github 标签 → 卡片（自带 target，须在外链处理前）
					rehypeGithubCard,
					rehypeExternalLinks,
					rehypeCallouts,
					rehypeFigure,
					rehypeFirstImage,
					rehypeAnchor,
					// 复制按钮文案跟随站点语言（node 侧无 virtual 模块，显式传 config.lang）
					[rehypeCodeBlock, { uiLang: config.lang }],
				];
				if (config.latex.enabled) {
					remarkPlugins.push(remarkMath);
					// 不传 { katex } 选项：rehype-katex 7.x 不支持实例覆盖（模块级 import），
					// settings 会原样展开进 renderToString，传了也是无效选项
					rehypePlugins.push(rehypeKatex);
				}
				if (config.diagram.mermaid.enabled) {
					remarkPlugins.push(remarkMermaid);
					rehypePlugins.push([
						rehypeMermaid,
						{
							lightTheme: config.diagram.mermaid.lightTheme,
							darkTheme: config.diagram.mermaid.darkTheme,
						},
					]);
				}
				if (config.diagram.plantuml.enabled) {
					remarkPlugins.push([
						remarkPlantuml,
						{
							server: config.diagram.plantuml.server,
							lightTheme: config.diagram.plantuml.lightTheme,
							darkTheme: config.diagram.plantuml.darkTheme,
						},
					]);
					rehypePlugins.push(rehypePlantuml);
				}
				if (config.diagram.mermaid.enabled || config.diagram.plantuml.enabled) {
					// 兜底：任一图表形态存在时确保 pan-zoom 脚本注入（每 tree 一次）
					rehypePlugins.push(rehypeDiagramPanZoom);
				}
				if (config.emailProtection.enabled) {
					rehypePlugins.push([
						rehypeEmailProtection,
						{ method: config.emailProtection.method },
					]);
				}
				updateConfig({
					vite: {
						plugins: [tailwindcss()],
					},
					markdown: {
						processor: unified({ remarkPlugins, rehypePlugins }),
						shikiConfig: { theme: "github-dark" },
					},
				});

				const routes: [pattern: string, file: string][] = [
					["/", "index.astro"],
					["/page/[page]", "page/[page].astro"],
					["/archive", "archive.astro"],
					["/tags", "tags/index.astro"],
					["/tags/[tag]", "tags/[tag].astro"],
					["/categories", "categories/index.astro"],
					["/categories/[category]", "categories/[category].astro"],
					["/posts/[...slug]", "posts/[...slug].astro"],
					["/rss.xml", "rss.xml.ts"],
					["/sitemap.xml", "sitemap.xml.ts"],
					["/robots.txt", "robots.txt.ts"],
					["/404", "404.astro"],
				];
				// 独立页按开关注入（关闭则完全不生成对应路由，而非运行期 404 跳转）
				if (config.pages.about) routes.push(["/about", "about.astro"]);
				if (config.pages.friends) routes.push(["/friends", "friends.astro"]);
				if (config.pages.guestbook)
					routes.push(["/guestbook", "guestbook.astro"]);
				if (config.pages.sponsor) routes.push(["/sponsor", "sponsor.astro"]);
				if (config.pages.gallery) {
					routes.push(["/gallery", "gallery/index.astro"]);
					routes.push(["/gallery/[album]", "gallery/[album].astro"]);
				}
				// 相关/随机文章推荐（P1-12）：随机栏数据源
				if (config.relatedPosts.enabled) {
					routes.push(["/api/allPostMeta.json", "api/allPostMeta.json.ts"]);
				}
				// OG 分享图（P1-11）：每篇文章一张分享图，默认关
				if (config.og.enabled) {
					routes.push(["/og/[...slug]", "og/[...slug].ts"]);
				}
				for (const [pattern, file] of routes) {
					injectRoute({
						pattern,
						entrypoint: `${PKG_NAME}/routes/${file}`,
						prerender: true,
					});
				}

				updateConfig({
					// themeLqipsPlugin 必须在 overridesPlugin 前（后者兜底所有 virtual:theme/*，
					// 会抢走 virtual:theme/lqips 的解析，详见 vite.ts 注释）
					vite: {
						plugins: [
							themeConfigPlugin(config),
							themeLqipsPlugin(),
							overridesPlugin(),
						],
					},
				});
			},
			// astro 7 中 injectTypes 只在 astro:config:done 上提供
			"astro:config:done": ({ injectTypes }) => {
				injectTypes({
					filename: `${PKG_NAME}.d.ts`,
					content: [
						`declare module 'virtual:theme/config' {`,
						`  const config: import('${PKG_NAME}/schema').ResolvedThemeConfig;`,
						`  export default config;`,
						`}`,
						`declare module 'virtual:theme/lqips' {`,
						`  const lqips: Record<string, string>;`,
						`  export default lqips;`,
						`}`,
						`declare module 'virtual:theme/*' {`,
						`  const Component: any;`,
						`  export default Component;`,
						`}`,
					].join("\n"),
				});
			},
		},
	};
}

export default defineTheme;

// 供站点侧配置文件做类型标注与检查（含 provider 等字面量联合）
export type { ThemeConfig } from "./schema";
