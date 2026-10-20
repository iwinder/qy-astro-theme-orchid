import { z } from "astro/zod";

/**
 * Live2D 看板娘（§4.38）单模型。提取为模块级 const：union 单/数组两分支复用。
 * 注意 z.output 中 volume/scale/x/y 因 default 恒为 number。
 */
const live2dModelSchema = z.object({
	/** model.json 地址（public 路径或外链） */
	path: z.string(),
	/** 模型动作音量 0-1（默认 0 静音） */
	volume: z.number().min(0).max(1).default(0),
	/** 缩放 */
	scale: z.number().default(1),
	/** 水平偏移 -2~2（传给库的 offset[0]） */
	x: z.number().min(-2).max(2).default(0),
	/** 垂直偏移 -2~2（传给库的 offset[1]） */
	y: z.number().min(-2).max(2).default(0),
});

/**
 * 侧栏 widget 共享基字段（§4.51 配置统一）：各 widget 分支 extend 复用。
 * 公共配置（开关/显隐/位置）配置在数组项上；组件专属参数统一收进
 * specificConfig 入口（§4.52，对齐参考项目形态）：base 默认空对象，
 * 有专属参数的类型分支覆写为专属形状。
 */
const sidebarWidgetBase = z.object({
	enabled: z.boolean().default(true),
	/** 文章页侧栏是否保留该 widget（false = 仅首页/列表页显示） */
	showOnPost: z.boolean().default(true),
	/** 仅文章页侧栏显示（true = 首页/列表页不出现，如 toc） */
	postOnly: z.boolean().default(false),
	/** 移动端（<768px）隐藏该 widget（§4.49 移动端差异化侧栏） */
	hideOnMobile: z.boolean().default(false),
	/** 渲染分组：sticky 组包进粘性容器跟随滚动（≥768px 生效，§4.50）；默认 top 普通流式 */
	position: z.enum(["top", "sticky"]).default("top"),
	/** 组件专属配置入口（§4.52）：默认空对象，有专属参数的类型分支覆写为专属形状 */
	specificConfig: z.object({}).default({}),
});

/**
 * 主题配置 schema（astro.config.ts 中 defineTheme({...}) 的入参）
 * 后续新增配置项一律给 default，保证老站点升级后无需改动配置
 */
export const themeConfigSchema = z.object({
	/**
	 * 站点名（§4.58 加默认值）：不配置也能通过校验（真零配置可构建），
	 * 正式接入时仍应显式配置为自己的站点名
	 */
	title: z.string().default("Orchid Blog"),
	/** 站点描述（首页与 meta description 默认值） */
	description: z.string().default(""),
	/**
	 * 站点级 SEO keywords（§4.19）：注入非文章页 <meta name="keywords">；
	 * 文章页由 frontmatter tags 覆盖。留空则不输出该 meta。
	 */
	keywords: z.array(z.string()).default([]),
	/** 导航栏 Logo（§4.20）：标题左侧图片 URL（public 路径或外链），留空只渲染文字标题 */
	logo: z.string().default(""),
	/** 作者名 */
	author: z.string().default(""),
	/**
	 * 强调色（hex），建议带彩度的颜色。
	 * 构建期转 HSL 注入 --accent-h/s/l，全部派生色（accent/soft/ink 等）由 HSL 公式计算；
	 * 暗色模式下亮度按 html.dark 规则提亮。
	 */
	accentColor: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, "accentColor 必须是 6 位 hex 颜色，如 #4a9d8f")
		.default("#4a9d8f"),
	/** 站点语言（<html lang>） */
	lang: z.string().default("zh-CN"),
	/**
	 * 主容器页宽（§4.32，px）：注入 html 的 --page-width 变量。
	 * ≥1280px 屏 .shell 宽度取 min(92vw, 此值)，其下全宽；文章页固定 1120px
	 * 阅读行宽不跟随；归档/时间线等窄列不受影响。
	 */
	pageWidth: z.number().int().min(800).max(1920).default(1600),
	/**
	 * 首页 banner（§4.42，hero+壁纸合并单配置）：enabled 总开关，false 时图与文案都不渲染。
	 * src 配置时渲染 Header 下方下沉横幅（数组构建期随机选一张，零 JS）+ 黑蒙层；
	 * quote 配置时渲染 hero 文案——有 banner 叠加其上，无 banner 为列表上方独立区块。
	 */
	banner: z
		.object({
			/** 总开关：false 时即使配了 src/quote 也不渲染 */
			enabled: z.boolean().default(true),
			/** 图源（public 路径或外链）：单图 URL 或多图数组（构建期随机取一）；不配置则无图 */
			src: z.union([z.string(), z.array(z.string())]).optional(),
			/** banner 高度（vh） */
			height: z.number().int().min(10).max(90).default(32),
			/** 黑蒙层不透明度（0-1），深浅模式同色，保证文字可读 */
			dimOpacity: z.number().min(0).max(1).default(0.2),
			/** 图片 object-position（center / center 30% 等） */
			position: z.string().default("center"),
			/** true 仅首页显示，false 全站显示 */
			homeOnly: z.boolean().default(true),
			/** 主句，<em> 标签内文字会以强调色渲染；留空不渲染 hero 文案 */
			quote: z.string().default(""),
			/** 副句 */
			sub: z.string().default(""),
		})
		.default({
			enabled: true,
			height: 32,
			dimOpacity: 0.2,
			position: "center",
			homeOnly: true,
			quote: "",
			sub: "",
		}),
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
	/** 文章列表 */
	postList: z
		.object({
			/** 默认卡片形态：cover 图卡 / compact 紧凑行；文章 frontmatter.cardStyle 可按篇覆盖 */
			style: z.enum(["cover", "compact"]).default("cover"),
			/** 列表封面开关（§4.55）：false 时列表卡不渲染封面（整体降级纯文字形态） */
			showCover: z.boolean().default(true),
			/** 每页文章数（首页分页） */
			pageSize: z.number().int().min(1).default(10),
			/** 无图文章的兜底封面图（可选；不配置则降级为纯文字卡） */
			fallbackCover: z.string().optional(),
			/**
			 * 随机封面图源（§4.33）：apis 非空时，frontmatter 显式 image:"api" 的文章
			 * 从该列表取封面。URL 支持 {slug} 占位符（替换为文章 id），
			 * 并自动追加 ?v=<hash>（Java hashCode(slug)），同 slug 每次构建稳定同图。
			 * 客户端加载失败时按列表顺序依次重试，全部失败显示本地 fallbackCover。
			 */
			randomCover: z
				.object({
					apis: z.array(z.string()).default([]),
				})
				.default({ apis: [] }),
			/**
			 * 列表形态切换（§4.34→§4.55）：true 时导航栏右侧出现列表/网格切换按钮（仅首页/列表页渲染），
			 * 访客选择持久化 localStorage('qy-postList')；false 时访客不可切换，仅使用 defaultLayout。
			 */
			allowSwitch: z.boolean().default(false),
			/** 默认列表形态（§4.55）：list 上下列表 / grid 网格；访客未手动切换过时的初始形态 */
			defaultLayout: z.enum(["list", "grid"]).default("list"),
			/** 网格模式最小列宽（px），实际列数由容器宽自适应 */
			gridColumnWidth: z.number().int().min(220).max(600).default(320),
		})
		.default({ style: "cover", pageSize: 10 }),
	/** 文章页目录 */
	toc: z
		.object({
			enabled: z.boolean().default(true),
		})
		.default({ enabled: true }),
	/** 分类导航栏（§4.15→§4.23）：首页 post-list 与文章页 post-main 顶部渲染（与正文同列宽不全宽），关闭则全站不渲染 */
	categoryBar: z
		.object({
			enabled: z.boolean().default(false),
		})
		.default({ enabled: false }),
	/**
	 * 个人资料卡（§4.15）：sidebar widgets 中 type:"profile" 时渲染。
	 * 头像 + 昵称 + 简介 + 社交链接行；links[].icon 填内置图标名（§4.59，如 "bilibili"）
	 * 或内联 SVG 字符串（以 "<" 开头，向后兼容）。
	 */
	profile: z
		.object({
			/** 头像图 URL（留空渲染昵称首字 fallback） */
			avatar: z.string().default(""),
			name: z.string().default(""),
			bio: z.string().default(""),
			/** 点击头像/昵称跳转（如 /about/），留空则不包链接 */
			url: z.string().default(""),
			links: z
				.array(
					z.object({
						name: z.string(),
						url: z.string(),
						/**
						 * 图标（§4.65）：内置简名（如 "github"/"qq"/"wechat"/"weibo"/"bilibili"/
						 * "xiaohongshu"，完整清单见主题 README「社交图标」）、Iconify 全名
						 *（"集:名"，如 "simple-icons:bilibili"，站点装对应 @iconify-json/* 即可扩展）
						 * 或内联 SVG 字符串（以 "<" 开头，兼容旧写法）；
						 * 名字未命中时不渲染图标、只渲染文字。构建期内联，无运行时请求
						 */
						icon: z.string().default(""),
						/** true 时在图标旁显示名称文字 */
						showName: z.boolean().default(false),
					}),
				)
				.default([]),
		})
		.default({ avatar: "", name: "", bio: "", url: "", links: [] }),
	/**
	 * 相关/随机文章推荐（P1-12）：文章页 PostNav 后双栏卡。
	 * 相关栏构建期评分（标签/标题 Jaccard + 时间新鲜度 + 同分类），候选排除加密文章；
	 * 随机栏客户端 fetch /api/allPostMeta.json（加密文章不进随机池）。
	 */
	relatedPosts: z
		.object({
			enabled: z.boolean().default(true),
			/** 相关栏数量 */
			count: z.number().int().min(0).max(10).default(5),
			/** 随机栏数量 */
			randomCount: z.number().int().min(0).max(10).default(5),
		})
		.default({ enabled: true, count: 5, randomCount: 5 }),
	/**
	 * OG 分享图（P1-11，默认关）：构建期为每篇文章生成 1200x630 分享图（/og/<slug>.png）。
	 * satori（对象树→SVG）+ sharp（SVG→PNG）；Google Fonts 拉取失败时降级纯形状占位图，
	 * 构建不中断。网络受限环境可保持关闭或接受占位图。
	 */
	og: z
		.object({
			enabled: z.boolean().default(false),
		})
		.default({ enabled: false }),
	/**
	 * 分享海报（P1-13）：文章页「生成分享海报」按钮，纯浏览器 canvas + qrcode 能力，
	 * 构建零开销（qrcode 动态 import 分包，点开才加载）。
	 */
	sharePoster: z
		.object({
			enabled: z.boolean().default(true),
		})
		.default({ enabled: true }),
	/**
	 * 版权声明（文章级 licenseName/licenseUrl 覆盖名称与链接、license: false 按篇关闭；
	 * enabled=false 全站关闭）。prefix/suffix 自定义声明文案，留空用语言包默认
	 * （「本文采用 … 许可，转载请注明出处与作者。」）。
	 */
	license: z
		.object({
			enabled: z.boolean().default(true),
			name: z.string().default("CC BY-NC-SA 4.0"),
			url: z
				.string()
				.default("https://creativecommons.org/licenses/by-nc-sa/4.0/"),
			/** 声明前缀文案（许可链接之前），留空用语言包默认 */
			prefix: z.string().default(""),
			/** 声明后缀文案（许可链接之后），留空用语言包默认 */
			suffix: z.string().default(""),
		})
		.default({
			enabled: true,
			name: "CC BY-NC-SA 4.0",
			url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
			prefix: "",
			suffix: "",
		}),
	/** 建站日期（YYYY-MM-DD，站点信息卡「已运行」；不配置则不显示该行） */
	since: z.string().optional(),
	/**
	 * 顶部导航（§4.16 扩展）：item 可带 children 下拉与 external 外链标记；
	 * 配了 children 时 href 可省略（父项仅作下拉入口，点击展开/收起）。
	 */
	nav: z
		.array(
			z.object({
				label: z.string(),
				href: z.string().url().or(z.string().startsWith("/")).optional(),
				/** true = 外部链接，新窗口打开 */
				external: z.boolean().default(false),
				children: z
					.array(
						z.object({
							label: z.string(),
							href: z.string().url().or(z.string().startsWith("/")),
							external: z.boolean().default(false),
						}),
					)
					.default([]),
			}),
		)
		.default([]),
	/** 页脚自定义 HTML（§4.16→§4.57）：备案号等，经 set:html 渲染在版权行上方 */
	footer: z
		.object({
			customHtml: z.string().default(""),
		})
		.default({ customHtml: "" }),
	/**
	 * 默认深浅模式（§4.16）：仅作用户未选择时的初值，
	 * 切换后以 localStorage('qy-mode') 为准。
	 */
	colorMode: z.enum(["light", "dark", "system"]).default("system"),
	/**
	 * 暗色模式适配（§4.89）：adaptExternalImages 开启后，暗色下对外链内容图
	 * （data-external 标记，白底截图/图表易刺眼）施加亮度滤镜压暗；
	 * 本地图与 .no-adapt 单图豁免。默认关闭保持中性。
	 */
	darkMode: z
		.object({
			adaptExternalImages: z.boolean().default(false),
		})
		.default({ adaptExternalImages: false }),
	/**
	 * 代码高亮（§4.61）：Expressive Code（Astro 生态标准方案）接管代码块渲染，
	 * 替代 §4.17 自研 shiki 管线与 §4.37 自研折叠。light/dark 为 EC 支持的 Shiki
	 * 主题名（EC 约定 [dark, light] 顺序加载），跟随站点深浅模式切换。
	 * fold：行数超过 lineThreshold 自动折叠为 previewLines 行预览；
	 * lineNumbers 行号 / languageBadge 语言徽章 / wrap 长行换行为 EC 插件与渲染开关。
	 * 注意 default 必须写显式完整字面量：Zod v4 的 .default(x) 在输入缺失时直接取 x、
	 * 不做二次 parse，内层字段默认值不会补齐。
	 */
	codeTheme: z
		.object({
			light: z.string().default("github-light"),
			dark: z.string().default("github-dark"),
			fold: z
				.object({
					enabled: z.boolean().default(false),
					lineThreshold: z.number().int().min(1).default(15),
					previewLines: z.number().int().min(1).default(8),
					defaultCollapsed: z.boolean().default(true),
				})
				.default({
					enabled: false,
					lineThreshold: 15,
					previewLines: 8,
					defaultCollapsed: true,
				}),
			lineNumbers: z.boolean().default(true),
			languageBadge: z.boolean().default(false),
			wrap: z.boolean().default(false),
		})
		.default({
			light: "github-light",
			dark: "github-dark",
			fold: {
				enabled: false,
				lineThreshold: 15,
				previewLines: 8,
				defaultCollapsed: true,
			},
			lineNumbers: true,
			languageBadge: false,
			wrap: false,
		}),
	/** 独立页开关：关闭后主题不注入对应路由（路由完全不生成） */
	pages: z
		.object({
			about: z.boolean().default(true),
			friends: z.boolean().default(true),
			guestbook: z.boolean().default(true),
			sponsor: z.boolean().default(true),
			gallery: z.boolean().default(true),
			/** 专题（§4.31）：frontmatter series 聚合页 /series/ 与 /series/[name]/ */
			series: z.boolean().default(true),
			/** 说说页（§4.87）：/moments/ 短内容时间流；站点需定义 moments collection。默认关——老站点无该集合，开启前先在 content.config.ts 定义 */
			moments: z.boolean().default(false),
		})
		.default({
			about: true,
			friends: true,
			guestbook: true,
			sponsor: true,
			gallery: true,
			series: true,
			moments: false,
		}),
	/**
	 * 画廊/相册（M3b-b8）。相册数据纯配置驱动，照片两个来源：
	 * 1) site/public/gallery/<id>/ 目录扫描（图片文件按名排序，cover.* 优先做首图）
	 * 2) 同目录 urls.txt（每行一个远程图片 URL，# 开头为注释），追加在本地之后
	 * 加密相册（password 非空）经 EncryptedContent 构建期加密，slug 用相册 id。
	 */
	gallery: z
		.object({
			/** 画廊页标题 */
			title: z.string().default("画廊"),
			/** 画廊页副标题描述 */
			description: z.string().default(""),
			albums: z
				.array(
					z.object({
						/** 相册 id：对应 public/gallery/<id>/ 目录，同时是详情 URL 段与加密 slug */
						id: z.string(),
						name: z.string(),
						description: z.string().default(""),
						date: z.string().default(""),
						location: z.string().default(""),
						tags: z.array(z.string()).default([]),
						/** 封面（public 路径或外链）：留空依次取 cover.* / 第一张照片 */
						cover: z.string().default(""),
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
		.default({ title: "画廊", description: "", albums: [], columnWidth: 240 }),
	/**
	 * 友链数据源（决策 8）：同时驱动友链页全量渲染与首页侧栏友链 widget。
	 * 头像 image 留空时以 title 首字渲染字头像兜底。
	 */
	friends: z
		.object({
			/** 友链页标题 */
			title: z.string().default("友链"),
			/** 友链页副标题描述 */
			description: z.string().default(""),
			/** 页面级排序：weight 权重降序 / random 随机（构建期） */
			sort: z.enum(["weight", "random"]).default("weight"),
			/** 申请友链卡片（title 留空则整卡不渲染） */
			apply: z
				.object({
					title: z.string().default(""),
					description: z.string().default(""),
					/** 申请入口链接（mailto 或表单页） */
					link: z.string().default(""),
					label: z.string().default("申请友链"),
				})
				.default({ title: "", description: "", link: "", label: "申请友链" }),
			list: z
				.array(
					z.object({
						title: z.string(),
						site: z.string().url(),
						/** 头像图（外链或 public 路径；留空用字头像） */
						image: z.string().default(""),
						desc: z.string().default(""),
						tags: z.array(z.string()).default([]),
						/** 权重，越大越靠前（sort=weight 时生效） */
						weight: z.number().default(0),
						enabled: z.boolean().default(true),
						/** 首页/列表页侧栏友链 widget 优先展示（其余按 weight 补足） */
						featured: z.boolean().default(false),
					}),
				)
				.default([]),
		})
		.default({
			title: "友链",
			description: "",
			sort: "weight",
			apply: { title: "", description: "", link: "", label: "申请友链" },
			list: [],
		}),
	/**
	 * 侧栏 widget 体系（P2 侧栏改造）：
	 * - widgets 数组即渲染顺序，可自由增删/排序/开关；类型：
	 *   announcement / categories / tags / friends / calendar / toc / siteInfo / advertisement / profile
	 * - 公共配置（开关/显隐/位置）配置在数组项上；组件专属参数统一收进 item 的
	 *   specificConfig 入口（§4.52，对齐参考项目）：tags.specificConfig.count、
	 *   friends.specificConfig.count/random、calendar.specificConfig.postTooltip
	 * - enabled=false 跳过该 widget；两个方向的显隐（对齐参考模板 showOnPostPage/hideOnNonPostPage）：
	 *   showOnPost=false 仅列表页显示；postOnly=true 仅文章页侧栏显示（如 toc）
	 * - hideOnMobile=true 移动端（<768px）隐藏该 widget（§4.49 移动端差异化侧栏，默认 toc/calendar 隐藏）
	 * - position="sticky" 渲染进粘性容器，≥768px 跟随滚动（§4.50）；默认 "top" 普通流式
	 * - onPost=false 时文章详情页不渲染侧栏（TOC 保持正文右侧原位）
	 */
	sidebar: z
		.object({
			/** 文章详情页是否启用侧栏 */
			onPost: z.boolean().default(false),
			/** widget 渲染顺序 = 数组顺序；公共配置在数组项上，专属参数收进 specificConfig（§4.52） */
			widgets: z
				.array(
					z.discriminatedUnion("type", [
						sidebarWidgetBase.extend({ type: z.literal("announcement") }),
						sidebarWidgetBase.extend({ type: z.literal("categories") }),
						/**
						 * 标签 widget：specificConfig.count 为展示的热门标签数量（0 = 全部展示），
						 * 超出部分收进「…更多」入口跳转标签页（§4.48）
						 */
						sidebarWidgetBase.extend({
							type: z.literal("tags"),
							specificConfig: z
								.object({ count: z.number().int().min(0).default(12) })
								.default({}),
						}),
						/**
						 * 友链 widget：specificConfig.count 展示数量；random=true 构建期随机取样，
						 * false 则 featured 优先、其余按 weight 降序取前 count 个
						 */
						sidebarWidgetBase.extend({
							type: z.literal("friends"),
							specificConfig: z
								.object({
									count: z.number().int().min(1).default(3),
									random: z.boolean().default(false),
								})
								.default({}),
						}),
						sidebarWidgetBase.extend({
							type: z.literal("calendar"),
							specificConfig: z
								.object({
									/** 日历下方文章列表条目悬停显示全文 title（§4.41）；默认关 */
									postTooltip: z.boolean().default(false),
								})
								.default({}),
						}),
						sidebarWidgetBase.extend({ type: z.literal("toc") }),
						sidebarWidgetBase.extend({ type: z.literal("siteInfo") }),
						sidebarWidgetBase.extend({ type: z.literal("advertisement") }),
						sidebarWidgetBase.extend({ type: z.literal("profile") }),
					]),
				)
				.default([
					{ type: "announcement" },
					{ type: "categories", position: "sticky" },
					{ type: "tags", position: "sticky" },
					{ type: "friends" },
					{ type: "calendar", hideOnMobile: true, position: "sticky" },
					{
						type: "toc",
						postOnly: true,
						hideOnMobile: true,
						position: "sticky",
					},
					{ type: "siteInfo" },
					{ type: "advertisement" },
				]),
		})
		.default({
			onPost: false,
			widgets: [
				{ type: "announcement" },
				{ type: "categories", position: "sticky" },
				{ type: "tags", position: "sticky" },
				{ type: "friends" },
				{ type: "calendar", hideOnMobile: true, position: "sticky" },
				{ type: "toc", postOnly: true, hideOnMobile: true, position: "sticky" },
				{ type: "siteInfo" },
				{ type: "advertisement" },
			],
		}),
	/** 打赏页（收款码 image 与跳转 link 至少配一个；均为空渲染占位框） */
	sponsor: z
		.object({
			title: z.string().default("打赏"),
			description: z.string().default(""),
			/** 打赏用途说明（留空不渲染） */
			usage: z.string().default(""),
			showSponsorsList: z.boolean().default(true),
			/** 文章详情页是否渲染「打赏支持」入口（还需 pages.sponsor 开启） */
			showButtonInPost: z.boolean().default(true),
			methods: z
				.array(
					z.object({
						name: z.string(),
						/** 文本/emoji 角标（主题不内置图标依赖） */
						icon: z.string().default(""),
						/** 收款码图片（public 路径或外链） */
						image: z.string().default(""),
						/** 跳转链接（爱发电/ko-fi 等） */
						link: z.string().default(""),
						description: z.string().default(""),
						enabled: z.boolean().default(true),
					}),
				)
				.default([]),
			/** 打赏者名单（date 用 YYYY-MM-DD） */
			sponsors: z
				.array(
					z.object({
						name: z.string(),
						avatar: z.string().default(""),
						amount: z.string().default(""),
						date: z.string().default(""),
					}),
				)
				.default([]),
		})
		.default({
			title: "打赏",
			description: "",
			usage: "",
			showSponsorsList: true,
			showButtonInPost: true,
			methods: [],
			sponsors: [],
		}),
	/**
	 * 评论系统（适配层分发，五套可切换：artalk/twikoo/waline/giscus/disqus）。
	 * enabled=false 或 provider='none' 时页面完全不渲染评论区；
	 * 文章另受 frontmatter comment 字段按篇控制。
	 */
	comment: z
		.object({
			enabled: z.boolean().default(false),
			provider: z
				.enum(["none", "artalk", "twikoo", "waline", "giscus", "disqus"])
				.default("none"),
			/** 评论区标题 */
			title: z.string().default("评论"),
			artalk: z
				.object({
					/** Artalk 后端地址 */
					server: z.string().default(""),
					locale: z.string().default("zh-CN"),
					/** 文章访问量统计（Artalk pageview，挂载点 #artalk-pv 由站点自行放置） */
					visitorCount: z.boolean().default(true),
				})
				.default({ server: "", locale: "zh-CN", visitorCount: true }),
			twikoo: z
				.object({
					/** Twikoo 云函数/后端地址（Vercel/Netlify 部署 URL 或腾讯云环境 ID） */
					envId: z.string().default(""),
					/** 前端脚本地址（默认 npmmirror CDN，可换自部署或 jsdelivr） */
					jsUrl: z
						.string()
						.default(
							"https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
						),
					/** 自定义样式表（留空不加载） */
					cssUrl: z.string().default(""),
				})
				.default({
					envId: "",
					jsUrl:
						"https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
					cssUrl: "",
				}),
			waline: z
				.object({
					/** Waline 服务端地址（如 https://waline.example.com） */
					serverURL: z.string().default(""),
					lang: z.string().default("zh-CN"),
					/** 文章访问量统计（Waline pageview） */
					visitorCount: z.boolean().default(true),
				})
				.default({ serverURL: "", lang: "zh-CN", visitorCount: true }),
			giscus: z
				.object({
					repo: z.string().default(""),
					repoId: z.string().default(""),
					category: z.string().default(""),
					categoryId: z.string().default(""),
					/** giscus.app 生成参数，默认值与官方一致 */
					mapping: z.string().default("pathname"),
					strict: z.string().default("0"),
					reactionsEnabled: z.string().default("1"),
					emitMetadata: z.string().default("0"),
					inputPosition: z.string().default("top"),
					lang: z.string().default("zh-CN"),
					loading: z.string().default("lazy"),
				})
				.default({
					repo: "",
					repoId: "",
					category: "",
					categoryId: "",
					mapping: "pathname",
					strict: "0",
					reactionsEnabled: "1",
					emitMetadata: "0",
					inputPosition: "top",
					lang: "zh-CN",
					loading: "lazy",
				}),
			disqus: z
				.object({
					/** Disqus shortname（站点 shortname.disqus.com） */
					shortname: z.string().default(""),
				})
				.default({ shortname: "" }),
		})
		.default({
			enabled: false,
			provider: "none",
			title: "评论",
			artalk: { server: "", locale: "zh-CN", visitorCount: true },
			twikoo: {
				envId: "",
				jsUrl:
					"https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
				cssUrl: "",
			},
			waline: { serverURL: "", lang: "zh-CN", visitorCount: true },
			giscus: {
				repo: "",
				repoId: "",
				category: "",
				categoryId: "",
				mapping: "pathname",
				strict: "0",
				reactionsEnabled: "1",
				emitMetadata: "0",
				inputPosition: "top",
				lang: "zh-CN",
				loading: "lazy",
			},
			disqus: { shortname: "" },
		}),
	/**
	 * 文章过时提醒（orchid-blog showLastModified/outdatedThreshold 对齐）。
	 * 距最后更新（updated ?? published）超过 threshold 天时，文章页显示
	 * 「最后更新」卡片与过时警告；天数由客户端计算（静态站构建期计算会随时间失效）。
	 */
	outdated: z
		.object({
			enabled: z.boolean().default(true),
			/** 过期阈值（天）：距最后更新超过该天数才显示卡片 */
			threshold: z.number().int().min(1).default(30),
		})
		.default({ enabled: true, threshold: 30 }),
	/**
	 * 侧栏公告（P1-17）。content 留空则整卡不渲染；
	 * closable 仅前台隐藏（无持久化，刷新恢复）。
	 */
	announcement: z
		.object({
			title: z.string().default("公告"),
			content: z.string().default(""),
			link: z
				.object({
					text: z.string().default(""),
					url: z.string().default(""),
					external: z.boolean().default(false),
				})
				.default({ text: "", url: "", external: false }),
			closable: z.boolean().default(false),
		})
		.default({
			title: "公告",
			content: "",
			link: { text: "", url: "", external: false },
			closable: false,
		}),
	/**
	 * 侧栏广告位（P2 保留项，默认关闭）。enabled=false 整卡不渲染；
	 * expireDate（YYYY-MM-DD）过期不渲染；displayCount>0 时按 localStorage 计数超限隐藏。
	 */
	advertisement: z
		.object({
			enabled: z.boolean().default(false),
			title: z.string().default("广告"),
			/** 广告图（public 路径或外链，留空跳过） */
			image: z.string().default(""),
			/** 点击广告图跳转的链接（留空则图不可点） */
			imageLink: z.string().default(""),
			imageAlt: z.string().default("广告"),
			/** 文本内容（留空跳过） */
			content: z.string().default(""),
			/** 底部链接按钮（text 留空不渲染） */
			link: z
				.object({
					text: z.string().default(""),
					url: z.string().default(""),
					external: z.boolean().default(true),
				})
				.default({ text: "", url: "", external: true }),
			closable: z.boolean().default(true),
			/** 最大展示次数；-1 不限制 */
			displayCount: z.number().int().default(-1),
			/** 过期日期（YYYY-MM-DD），过期不渲染 */
			expireDate: z.string().optional(),
		})
		.default({
			enabled: false,
			title: "广告",
			image: "",
			imageLink: "",
			imageAlt: "广告",
			content: "",
			link: { text: "", url: "", external: true },
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
			googleAnalyticsId: z.string().default(""),
			/** Microsoft Clarity 项目 ID */
			microsoftClarityId: z.string().default(""),
			umami: z
				.object({
					websiteId: z.string().default(""),
					scriptUrl: z.string().default("https://cloud.umami.is/script.js"),
					/** Umami Live 录制（replays）脚本地址 */
					replaysScriptUrl: z
						.string()
						.default("https://cloud.umami.is/script.replays.js"),
					/** 外链自动标记 data-umami-event 上报 */
					trackOutboundLinks: z.boolean().default(true),
					/** Web Vitals 采集（自建 umami 需 v2.9+） */
					collectWebVitals: z.boolean().default(false),
					replays: z
						.object({
							enabled: z.boolean().default(false),
							sampleRate: z.number().min(0).max(1).default(0.15),
							maskLevel: z.enum(["moderate", "strict"]).default("moderate"),
							/** 单次录制最长毫秒 */
							maxDuration: z.number().int().default(300000),
							/** 录制屏蔽选择器（隐私元素） */
							blockSelector: z.string().default(""),
						})
						.default({
							enabled: false,
							sampleRate: 0.15,
							maskLevel: "moderate",
							maxDuration: 300000,
							blockSelector: "",
						}),
				})
				.default({
					websiteId: "",
					scriptUrl: "https://cloud.umami.is/script.js",
					replaysScriptUrl: "https://cloud.umami.is/script.replays.js",
					trackOutboundLinks: true,
					collectWebVitals: false,
					replays: {
						enabled: false,
						sampleRate: 0.15,
						maskLevel: "moderate",
						maxDuration: 300000,
						blockSelector: "",
					},
				}),
			la51: z
				.object({
					/** 51.la 站点 ID（CK 编码） */
					id: z.string().default(""),
					/** 私有部署 SDK 地址（留空用官方） */
					sdkUrl: z.string().default(""),
					ck: z.string().default(""),
					autoTrack: z.boolean().default(true),
					hashMode: z.boolean().default(false),
					screenRecord: z.boolean().default(true),
				})
				.default({
					id: "",
					sdkUrl: "",
					ck: "",
					autoTrack: true,
					hashMode: false,
					screenRecord: true,
				}),
		})
		.default({
			googleAnalyticsId: "",
			microsoftClarityId: "",
			umami: {
				websiteId: "",
				scriptUrl: "https://cloud.umami.is/script.js",
				replaysScriptUrl: "https://cloud.umami.is/script.replays.js",
				trackOutboundLinks: true,
				collectWebVitals: false,
				replays: {
					enabled: false,
					sampleRate: 0.15,
					maskLevel: "moderate",
					maxDuration: 300000,
					blockSelector: "",
				},
			},
			la51: {
				id: "",
				sdkUrl: "",
				ck: "",
				autoTrack: true,
				hashMode: false,
				screenRecord: true,
			},
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
					lightTheme: z.string().default("github-light"),
					darkTheme: z.string().default("github-dark"),
				})
				.default({
					enabled: false,
					lightTheme: "github-light",
					darkTheme: "github-dark",
				}),
			plantuml: z
				.object({
					enabled: z.boolean().default(false),
					/** PlantUML 渲染服务地址（图片由浏览器访问该服务加载，自建/内网在此替换） */
					server: z.string().default("https://www.plantuml.com/plantuml"),
					/** 浅/深主题名（空 = 尊重图内 !theme 指令；深色留空复用浅色 URL） */
					lightTheme: z.string().default(""),
					darkTheme: z.string().default(""),
				})
				.default({
					enabled: false,
					server: "https://www.plantuml.com/plantuml",
					lightTheme: "",
					darkTheme: "",
				}),
		})
		.default({
			mermaid: {
				enabled: false,
				lightTheme: "github-light",
				darkTheme: "github-dark",
			},
			plantuml: {
				enabled: false,
				server: "https://www.plantuml.com/plantuml",
				lightTheme: "",
				darkTheme: "",
			},
		}),
	/* ---------- 邮箱防爬（M3b-b4）：mailto 构建期编码，点击时内联脚本还原 ---------- */
	emailProtection: z
		.object({
			enabled: z.boolean().default(false),
			/** base64：抗爬性更好；rot13：零 atob 依赖 */
			method: z.enum(["base64", "rot13"]).default("base64"),
		})
		.default({ enabled: false, method: "base64" }),
	/**
	 * 图片防盗链（§4.87）：部分图床/CDN（如 B 站）校验 Referer，站内引用返回 403。
	 * 命中域名列表的外链图片构建期追加 referrerpolicy="no-referrer"。
	 * 裸域名匹配自身与全部子域；*.example.com 只匹配子域。留空不处理。
	 */
	noReferrer: z
		.object({
			domains: z.array(z.string()).default([]),
		})
		.default({ domains: [] }),
	/**
	 * RSS 输出（§4.87）：fullText 开启后 item 带 content:encoded 全文
	 * （构建期逐篇容器渲染，构建时间相应增加）；limit 控制输出条数。
	 */
	rss: z
		.object({
			fullText: z.boolean().default(false),
			limit: z.number().int().min(1).default(20),
		})
		.default({ fullText: false, limit: 20 }),
	/**
	 * favicon 图标列表（§4.30）：数组非空时替换默认 /favicon.svg；
	 * theme 指定 "light"/"dark" 时按系统深浅色经 media 切换（可配双图标）。
	 */
	favicon: z
		.array(
			z.object({
				src: z.string(),
				type: z.string().optional(),
				sizes: z.string().optional(),
				/** "light"/"dark"：按 prefers-color-scheme 生效 */
				theme: z.enum(["light", "dark"]).optional(),
			}),
		)
		.default([]),
	/**
	 * 构建期日期时区（IANA 名，如 "Asia/Shanghai"，§4.30）：
	 * formatDate 等输出与构建机时区解耦。留空跟随构建环境。
	 */
	timezone: z.string().optional(),
	/**
	 * 归档页按年折叠（§4.30 对齐参考站 foldArticle）：开启时最新一年默认展开，其余折叠。
	 */
	archive: z
		.object({
			fold: z.boolean().default(false),
		})
		.default({ fold: false }),
	/**
	 * 樱花飘落特效（§4.30）：全站 canvas 粒子（程序化花瓣，零贴图资产），
	 * prefers-reduced-motion 自动停用，页签隐藏暂停。
	 */
	sakura: z
		.object({
			enabled: z.boolean().default(false),
			/** 同屏花瓣数 */
			density: z.number().int().min(1).max(200).default(24),
		})
		.default({ enabled: false, density: 24 }),
	/**
	 * 音乐播放器（§4.36）：local 模式，自研播放内核（audio + LRC 解析），
	 * 根节点 transition:persist 跨页不断播。meting 在线模式预留后续扩展。
	 */
	music: z
		.object({
			enabled: z.boolean().default(false),
			/** 悬浮位置：left 左下 / right 右下 */
			position: z.enum(["left", "right"]).default("left"),
			/** 初始音量 0-1（访客调整后记忆于 localStorage） */
			volume: z.number().min(0).max(1).default(0.7),
			/** 循环模式：list 列表循环 / one 单曲循环 / random 随机 */
			playMode: z.enum(["list", "one", "random"]).default("list"),
			/** 是否显示歌词开关按钮 */
			showLyrics: z.boolean().default(true),
			/** 本地播放列表 */
			playlist: z
				.array(
					z.object({
						/** 曲名 */
						name: z.string(),
						artist: z.string().default(""),
						/** 音频地址（public 路径或外链） */
						url: z.string(),
						/** 封面图（可选，缺省渲染唱片图标） */
						cover: z.string().optional(),
						/** 歌词：.lrc 文件路径或内联 LRC 文本（可选，缺省无歌词） */
						lrc: z.string().optional(),
					}),
				)
				.default([]),
		})
		.default({
			enabled: false,
			position: "left",
			volume: 0.7,
			playMode: "list",
			showLyrics: true,
			playlist: [],
		}),
	/**
	 * Live2D 看板娘（§4.38）：l2d-widget 悬浮模型 + 菜单 + 气泡说话。
	 * 根节点 transition:persist 跨页常驻；enabled 且配置了 model 才渲染。
	 * zIndex 默认 240（低于返回顶部 250 / 音乐悬浮球 255，避免角落按钮被挡）。
	 */
	live2d: z
		.object({
			enabled: z.boolean().default(false),
			/** 模型：单对象或数组（数组时可经菜单 action=switchModel 轮换） */
			model: z
				.union([live2dModelSchema, z.array(live2dModelSchema).min(1)])
				.optional(),
			/** 悬浮位置 */
			position: z.enum(["bottom-left", "bottom-right"]).default("bottom-left"),
			/** 画布尺寸（px）：单一数字（正方形边长）或 {width,height} */
			size: z
				.union([
					z.number().int().min(100).max(600),
					z.object({
						width: z.number().int().min(100).max(600),
						height: z.number().int().min(100).max(600),
					}),
				])
				.default(280),
			/** 菜单/气泡等 UI 主题色（CSS 颜色或 CSS 变量），留空用库默认 */
			primaryColor: z.string().default(""),
			/** 入场/退场动画时长（ms） */
			transitionDuration: z.number().int().min(0).optional(),
			/** 入场/退场动画类型 */
			transitionType: z.enum(["slide", "fade"]).optional(),
			/** 悬浮菜单（覆盖默认三键：主页/回顶部/休眠）；action 内置
			 *  home/scrollToTop/sleep/switchModel，或 "link" + url 跳外链 */
			menus: z
				.object({
					items: z
						.array(
							z.object({
								/** 图标（iconify 名称，如 mdi:home） */
								icon: z.string().default(""),
								label: z.string(),
								action: z.string(),
								/** action=link 时的跳转地址 */
								url: z.string().optional(),
							}),
						)
						.default([]),
					align: z.enum(["left", "right"]).default("right"),
				})
				.optional(),
			/** 气泡说话：欢迎语与循环提示；整体不配置用库默认，enable:false 显式关闭 */
			tips: z
				.object({
					enable: z.boolean().default(true),
					welcomeMessage: z.array(z.string()).default([]),
					messages: z.array(z.string()).default([]),
					/** 单条气泡显示时长（ms） */
					duration: z.number().int().min(500).default(3000),
					/** 轮换间隔（ms） */
					interval: z.number().int().min(500).default(6000),
					/** 气泡相对模型的像素偏移 */
					offset: z
						.object({ x: z.number().default(0), y: z.number().default(0) })
						.default({ x: 0, y: 0 }),
					/** 打字机效果参数（透传库） */
					typing: z
						.object({
							param: z.string().optional(),
							speed: z.number().int().optional(),
							minValue: z.number().int().optional(),
							maxValue: z.number().int().optional(),
						})
						.optional(),
				})
				.optional(),
			/** 移动端按断点隐藏（隐藏态不加载模型，转桌面端自动拉起） */
			responsive: z
				.object({
					hideOnMobile: z.boolean().default(true),
					mobileBreakpoint: z.number().int().min(320).default(768),
				})
				.default({ hideOnMobile: true, mobileBreakpoint: 768 }),
			/** 容器层级 */
			zIndex: z.number().int().min(1).default(240),
		})
		// Zod v4 default 不二次 parse，必须写显式完整字面量
		.default({
			enabled: false,
			position: "bottom-left",
			size: 280,
			primaryColor: "",
			responsive: { hideOnMobile: true, mobileBreakpoint: 768 },
			zIndex: 240,
		}),
	/**
	 * 字体（§4.66，Astro Fonts API 标准方案）：声明式接入字体，主题负责把
	 * 本段映射进 astro 顶层 fonts 配置（provider 字符串经 fontProviders 工厂
	 * 转为 provider 对象）并在 <head> 渲染 <Font> 组件产出 @font-face 与变量。
	 * role 把字体变量映射到主题三角色（--font-body/--font-display/--font-mono）。
	 * 留空数组不注入不渲染，零开销。
	 */
	fonts: z
		.array(
			z.object({
				/** 字体族名（provider 侧标识，如 "Inter"；local 为自定义名） */
				name: z.string(),
				/** CSS 变量名（如 "--font-inter"）：Font 组件据此产出变量与 @font-face */
				cssVariable: z
					.string()
					.regex(/^--[a-zA-Z0-9-]+$/, "必须以 -- 开头且仅含字母/数字/连字符"),
				/** provider：六种标准来源 */
				provider: z.enum([
					"google",
					"fontsource",
					"local",
					"bunny",
					"fontshare",
					"npm",
				]),
				/** 字重（默认 [400]；Astro 只下载列出的字重档） */
				weights: z
					.array(z.number().int().min(1).max(1000))
					.min(1)
					.default([400]),
				/** 字形（默认 normal + italic） */
				styles: z
					.array(z.enum(["normal", "italic", "oblique"]))
					.min(1)
					.default(["normal", "italic"]),
				/** 语言子集（按子集拆分字体文件，默认 latin） */
				subsets: z.array(z.string()).min(1).default(["latin"]),
				/** 回退字体族（Astro 据此产出优化的 fallback @font-face） */
				fallbacks: z.array(z.string()).default(["sans-serif"]),
				/** font-display 行为，不传用 Astro 默认 */
				display: z
					.enum(["auto", "swap", "block", "metadata", "fallback"])
					.optional(),
				/** 是否 <link rel=preload> 预载（主题层字段，正文首屏字体建议开启） */
				preload: z.boolean().default(false),
				/**
				 * 角色映射（主题层字段）：body 正文 / display 标题 / mono 代码。
				 * 配置后 <head> 产出 html:root 高优先级规则，把对应角色变量
				 * 重定向为 var(本字体变量), 原角色回退栈（中文等未覆盖字形自然回落）。
				 */
				role: z.enum(["body", "display", "mono"]).optional(),
				/** provider=local 专属：本地字体文件声明 */
				options: z
					.object({
						variants: z
							.array(
								z.object({
									/** 字体文件路径（woff2 等，相对站点项目根或包内路径） */
									src: z.string(),
									/** 该文件的字重（如 "400"） */
									weight: z.string().optional(),
									/** 该文件的字形（normal/italic） */
									style: z.string().optional(),
								}),
							)
							.min(1)
							.optional(),
					})
					.optional(),
			}),
		)
		.default([]),
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
			description: z.string().default(""),
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
			/** 本篇是否展示版权声明（默认开；全站另受 license.enabled 控制） */
			license: z.boolean().default(true),
			/** 本篇是否展示评论（默认开） */
			comment: z.boolean().default(true),
			/** 列表卡片形态按篇覆盖：cover 图卡 / compact 紧凑行 / text 纯文字 */
			cardStyle: z.enum(["cover", "compact", "text"]).optional(),
			/** 专题名（§4.31）：同专题文章聚合到 /series/<name>/，文章页出专题导航 */
			series: z.string().optional(),
			/** 专题内顺序（小在前）；未配置则按发布时间升序 */
			seriesOrder: z.number().optional(),
			/**
			 * 专题内分组（§4.75）：专题页与文章页专题目录按组分块展示
			 * （未分组文章块在最前，各分组按组内首篇顺序依次排列，全局序号连续）。
			 * 组名直接来自本字段文本，无 i18n 参与。
			 */
			seriesGroup: z.string().optional(),
		})
		.extend(extensions);
}

/**
 * 内容 schema 工厂：说说集合 frontmatter（§4.87 说说页）。
 * 站点 content.config.ts 定义 moments collection（loader 扫描
 * src/content/moments 目录下全部 .md 文件，schema 用本工厂）。
 * 正文即说说内容（Markdown，支持主题全部增强语法）；主题开关 pages.moments
 * 打开后注入 /moments/（时间流，按 published 新→旧，每页 20 条）。
 */
export function defineMomentSchema(extensions: z.ZodRawShape = {}) {
	return z
		.object({
			published: z.coerce.date(),
			/** 心情 emoji（卡片右上角展示） */
			mood: z.string().optional(),
			tags: z.array(z.string()).default([]),
			/** 配图（public 路径或外链，网格展示 + 灯箱浏览） */
			images: z.array(z.string()).default([]),
			draft: z.boolean().default(false),
		})
		.extend(extensions);
}
