// unified 处理器：Astro 7 默认 Sätteri 原生管线不执行 JS remark/rehype 插件，
// 必须显式切回 unified 处理器，插件数组直接传入 unified({...})。
// 铁律：数组元素一律是 attacher（插件工厂函数本身），带参数的用 [plugin, options]
// 元组；绝不能 push 已调用的 transformer（如 remarkMermaid()），否则 unified freeze
// 时会把它当 attacher 二次调用（tree=undefined）导致渲染崩溃，详见下方装配区注释
import { unified } from "@astrojs/markdown-remark";
// RSS / Sitemap（§4.63，Astro 生态标准方案）：不再手写 XML 生成路由，
// sitemap 以 integration 形式挂载（由 defineTheme 一并返回），rss 仍走端点路由
import sitemap from "@astrojs/sitemap";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
// Astro Fonts API（§4.66）官方 provider 工厂：google/fontsource/local/bunny/
// fontshare/npm 六种，全部支持无参调用（local 的文件声明走 family options.variants）
import { fontProviders } from "astro/config";
// astro-icon（§4.65）：Iconify 标准图标生态的官方 Astro integration，
// 供 Sidebar 资料卡等组件以 <Icon name="集:名"> 构建期内联渲染图标
import icon from "astro-icon";
// mhchem 化学宏：import 时刻把 \ce{...} 等宏注册进 katex 实例。
// pnpm-workspace.yaml overrides 已把 rehype-katex 等统一到同一 katex 版本，
// 共享单实例，故 mhchem 宏对 rehype-katex 的渲染直接生效
import "katex/dist/contrib/mhchem.mjs";
// EC 社区插件：超长代码块自动折叠（fold.enabled 开启时挂载）
import pluginCollapsible from "expressive-code-collapsible";
import { pluginLanguageBadge } from "expressive-code-language-badge";
// Expressive Code（§4.61，Astro 生态标准方案）：rehype 内核层接入。
// 注意不能用 astro-expressive-code integration：其 updateConfig append 的
// rehype 插件会被本主题 unified processor 的插件数组覆盖（processor 优先级
// 高于 config 层），必须直接 push 进主题自己的插件数组（与 katex/mermaid 同模式）
import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeKatex from "rehype-katex";
// 官方解析器：把 :::container / ::leaf / :text 语法解析为 directive 节点，
// 供 remarkDirectives 后处理（缺它则指令按字面文本渲染，卡片/容器全部失效）
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { resolveLabel } from "./i18n/resolve.js";
import {
	rehypeAnchor,
	rehypeCallouts,
	rehypeExternalLinks,
	rehypeFigure,
	rehypeFirstImage,
} from "./plugins/rehype.js";
import {
	rehypeDiagramPanZoom,
	rehypeMermaid,
	rehypePlantuml,
} from "./plugins/rehype-diagram.js";
import { rehypeEmailProtection } from "./plugins/rehype-email.js";
import { rehypeGithubCard } from "./plugins/rehype-github-card.js";
import { remarkMermaid, remarkPlantuml } from "./plugins/remark-diagram.js";
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
 * 返回 integration 数组（Astro 对 integrations 配置里的嵌套数组自动展平，
 * 站点侧仍写 integrations: [defineTheme(cfg)] 即可）：
 * - 核心 integration：injectRoute 注入主题路由（首页 / 文章页），entrypoint 指向
 *   包内文件，站点无需复制任何页面；updateConfig 注入 Tailwind v4 Vite 插件 +
 *   虚拟模块（config）+ overrides 解析；injectTypes（astro:config:done）为虚拟模块提供类型声明
 * - @astrojs/sitemap：官方 sitemap（构建末尾产出 sitemap-index.xml + 分片），
 *   替代原手写 /sitemap.xml 路由
 *
 * 升级主题 = 升级本包版本号；站点定制走 src/overrides/ 同名覆盖，不会被升级覆盖。
 */
export function defineTheme(userConfig: ThemeConfig): AstroIntegration[] {
	// 启动即校验配置，配置错误在 dev/build 一开始就报出来
	const config = themeConfigSchema.parse(userConfig);

	const core: AstroIntegration = {
		name: PKG_NAME,
		hooks: {
			"astro:config:setup": ({
				config: astroConfig,
				injectRoute,
				updateConfig,
			}) => {
				// remark：阅读时长/字数 + 自动摘要（渲染期写入 remarkPluginFrontmatter）
				// LaTeX（b4）：remark-math 识别公式 → rehype-katex 构建期渲染（无客户端运行时）
				// Mermaid/PlantUML（b4）：remark 标记代码块 → rehype 构建期产出（静态 SVG / 外链 img）
				// 邮箱防爬（b4）：mailto 构建期编码 + 点击时内联解码
				// rehype 顺序：内容变换在前 → katex → 图表 → pan-zoom 兜底 → 邮箱防爬 →
				// Expressive Code 代码块渲染最后（math/mermaid/plantuml pre 已被前面的
				// 插件整体替换，EC 只接管剩余普通代码块）
				// Astro 7 接线方式：
				//   - 默认 Sätteri 处理器不执行 JS 插件，须显式 processor: unified({...})
				//     （integration 更新 processor 后 content store 不自动清除，
				//      重启 dev 前删 site/.astro/ 可排除陈旧缓存干扰）
				//   - unified 的铁律：插件数组里的元素一律是 attacher（插件工厂函数本身），
				//     带参数的用 [plugin, options] 元组（loadPlugins 展开 → parser.use(plugin, opts)）。
				//     千万不能 push remarkMermaid() 这种"已调用的 transformer"——unified freeze 时
				//     会把数组元素当 attacher 再调用一次（第一参数 tree=undefined），
				//     报 "Cannot read properties of undefined (reading 'children')"，且与文档内容无关
				// 代码高亮（§4.61）：Expressive Code 接管（Astro 生态标准方案），
				// markdown.syntaxHighlight 必须置 false——Astro 原生 shiki 高亮先于用户
				// rehype 插件执行，不关掉会出现 shiki + EC 双重高亮冲突
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
				// Expressive Code（§4.61）：必须最后 push——math/mermaid/plantuml pre 已被
				// 前面的插件整体替换，EC 只接管剩余普通代码块。
				// 双主题：EC 约定 themes [dark, light] 顺序；useDarkModeMediaQuery 关掉系统
				// 媒体查询，改用 themeCssSelector 映射站点深浅类（html.dark，与 app.ts 切换同源）。
				// 插件组合对齐参考站：collapsible-sections（meta collapse={} 标记折叠）恒挂、
				// line-numbers 恒挂（defaultProps.showLineNumbers 控制显隐）、社区 collapsible
				// 自动折叠按 fold.enabled、语言徽章按 languageBadge。
				// 复制按钮文案（copyButtonTooltip 等）走 EC 内置 texts，仅 en/de 内置翻译、
				// 无公开 zh 注册入口，保持 EC 默认（对齐参考站做法）。
				rehypePlugins.push([
					rehypeExpressiveCode,
					{
						themes: [config.codeTheme.dark, config.codeTheme.light],
						useDarkModeMediaQuery: false,
						themeCssSelector: (theme: { type: string }) =>
							theme.type === "dark" ? "html.dark" : "html:not(.dark)",
						defaultLocale: config.lang,
						plugins: [
							...(config.codeTheme.languageBadge
								? [pluginLanguageBadge()]
								: []),
							pluginCollapsibleSections(),
							pluginLineNumbers(),
							...(config.codeTheme.fold.enabled
								? [
										pluginCollapsible({
											lineThreshold: config.codeTheme.fold.lineThreshold,
											previewLines: config.codeTheme.fold.previewLines,
											defaultCollapsed: config.codeTheme.fold.defaultCollapsed,
											// 折叠按钮与读屏公告文案跟随站点语言
											expandButtonText: resolveLabel(
												config.lang,
												"codeFoldExpand",
											),
											collapseButtonText: resolveLabel(
												config.lang,
												"codeFoldCollapse",
											),
											expandedAnnouncement: resolveLabel(
												config.lang,
												"codeFoldExpanded",
											),
											collapsedAnnouncement: resolveLabel(
												config.lang,
												"codeFoldCollapsed",
											),
										}),
									]
								: []),
						],
						defaultProps: {
							showLineNumbers: config.codeTheme.lineNumbers,
							wrap: config.codeTheme.wrap,
							// 终端会话块不显示行号（对齐参考站）
							overridesByLang: { shellsession: { showLineNumbers: false } },
						},
						// 站点级视觉对齐参考站：字体变量用本主题的 --font-mono
						styleOverrides: {
							borderRadius: "0.75rem",
							codeFontSize: "0.875rem",
							codeFontFamily:
								"var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
							codeLineHeight: "1.5rem",
							textMarkers: { delHue: 0, insHue: 180, markHue: 250 },
							languageBadge: {
								fontSize: "0.75rem",
								fontWeight: "bold",
								borderRadius: "0.25rem",
								opacity: "1",
								borderWidth: "0px",
								borderColor: "transparent",
							},
						},
						frames: { showCopyToClipboardButton: true },
					},
				]);
				updateConfig({
					// 主题路由全部按尾斜杠组织（如 /posts/xxx/），统一强制，dev 与 prod 行为一致
					trailingSlash: "always",
					vite: {
						plugins: [tailwindcss()],
						// 构建优化说明（§4.63）：参考站的 vite.build 块（minify:"esbuild"、
						// esbuildOptions、cssMinify:"esbuild" 等）是 vite 5 时代写法——Astro 7
						// 所用 vite 8（rolldown）里 esbuild 仅为可选 peer（默认不装），
						// esbuildOptions 已是死配置、cssMinify:"esbuild" 会直接构建失败；
						// 而 JS 压缩（oxc）、CSS 压缩（lightningcss）、cssCodeSplit(true)、
						// assetsInlineLimit(4096) 在 vite 8 均已是默认值，无需重复设置
					},
					markdown: {
						processor: unified({ remarkPlugins, rehypePlugins }),
						// 关掉 Astro 原生 shiki：高亮由 EC 独占（原生 shiki 先于用户
						// rehype 插件执行）
						syntaxHighlight: false,
					},
				});
				// 响应式图像（§4.64）：顶层 image.layout 经 content-layer 传给
				// processor.createRenderer({ image })，unified processor 以
				// { ...shared } 全量透传进 createMarkdownProcessor（图像插件
				// remarkCollectImages/rehypeImages 由其内部无条件装配），最终运行期
				// 图像服务按 layout 为 md 本地图片产出 srcset/sizes。
				// constrained 与参考站一致：限宽缩放 + 默认断点多尺寸变体；
				// 仅在站点未显式配置 image.layout 时注入，不覆盖用户选择
				if (!astroConfig.image.layout) {
					updateConfig({ image: { layout: "constrained" } });
				}
				// 字体（§4.66，Astro Fonts API 标准方案）：schema 声明 → astro 顶层
				// fonts 配置。站点自有 fonts 在前、主题配置追加在后；preload/role 是
				// 主题层字段（分别由 BaseLayout 的 <Font> 与角色映射 CSS 消费），
				// 显式挑字段映射即天然剥离；provider 字符串经官方工厂转 provider 对象。
				// 未配置时完全不注入，零开销
				if (config.fonts.length > 0) {
					const themeFonts = config.fonts.map((f) => {
						const font: Record<string, unknown> = {
							name: f.name,
							cssVariable: f.cssVariable,
							weights: f.weights,
							styles: f.styles,
							subsets: f.subsets,
							fallbacks: f.fallbacks,
							provider: fontProviders[f.provider](),
						};
						if (f.display) font.display = f.display;
						if (f.options?.variants) {
							font.options = { variants: f.options.variants };
						}
						return font;
					});
					updateConfig({
						fonts: [...(astroConfig.fonts ?? []), ...themeFonts],
					});
				}

				const routes: [pattern: string, file: string][] = [
					["/", "index.astro"],
					["/page/[page]", "page/[page].astro"],
					["/archive", "archive.astro"],
					["/tags", "tags/index.astro"],
					["/tags/[tag]", "tags/[tag].astro"],
					["/categories", "categories/index.astro"],
					["/categories/[category]", "categories/[category].astro"],
					["/posts/[...slug]", "posts/[...slug].astro"],
					// sitemap（§4.63）：改由官方 @astrojs/sitemap integration 产出
					// sitemap-index.xml，原手写 /sitemap.xml 路由移除
					["/rss.xml", "rss.xml.ts"],
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
				// 专题（§4.31）：frontmatter series 聚合页与专题详情页
				if (config.pages.series) {
					routes.push(["/series", "series/index.astro"]);
					routes.push(["/series/[name]", "series/[name].astro"]);
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

	// sitemap（§4.63）：官方 integration 在 astro:build:done 统一扫描全部预渲染页面
	// 产出 sitemap-index.xml + 分片。filter 排除非内容端点：
	//   - /og/：文章分享图（二进制图片，不该进 sitemap）
	//   - /api/：随机文章数据端点（JSON）
	// 关闭的独立页路由根本不注入，无需在此过滤
	const integrations: AstroIntegration[] = [
		core,
		sitemap({
			filter: (page) => {
				const { pathname } = new URL(page);
				return !pathname.startsWith("/og/") && !pathname.startsWith("/api/");
			},
		}),
		// astro-icon（§4.65）：不配 include，保持开放——静态站图标数据由 vite 插件
		// 按需从已装 @iconify-json/* 读取、实际只内联用到的 SVG，无产物膨胀；
		// 站点补装任意 @iconify-json/* 集合包即可在 icon 字段直接填 "集:名" 扩展
		icon(),
	];
	return integrations;
}

export default defineTheme;

// 供站点侧配置文件做类型标注与检查（含 provider 等字面量联合）
export type { ThemeConfig } from "./schema";
