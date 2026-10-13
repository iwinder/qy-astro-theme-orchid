import { z } from "astro/zod";

/**
 * 主题配置 schema（astro.config.ts 中 defineTheme({...}) 的入参）
 * 后续新增配置项一律给 default，保证老站点升级后无需改动配置
 */
export const themeConfigSchema = z.object({
	/** 站点名 */
	title: z.string(),
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
			quote: z.string().default(""),
			sub: z.string().default(""),
		})
		.default({ quote: "", sub: "" }),
	/** 文章列表 */
	postList: z
		.object({
			/** 默认卡片形态：cover 图卡 / compact 紧凑行；文章 frontmatter.cardStyle 可按篇覆盖 */
			style: z.enum(["cover", "compact"]).default("cover"),
			/** 每页文章数（首页分页） */
			pageSize: z.number().int().min(1).default(10),
			/** 无图文章的兜底封面图（可选；不配置则降级为纯文字卡） */
			fallbackCover: z.string().optional(),
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
	 * 头像 + 昵称 + 简介 + 社交链接行；links[].icon 存内联 SVG 字符串。
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
						/** 内联 SVG 字符串（经 set:html 渲染） */
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
	/** 页脚附加文案 */
	footerText: z.string().default(""),
	/** 页脚自定义 HTML（§4.16）：备案号等，经 set:html 渲染在页脚最底部 */
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
	/** 代码高亮双主题（§4.17）：值为 Shiki 内置主题名，light/dark 跟随站点深浅模式切换 */
	codeTheme: z
		.object({
			light: z.string().default("github-light"),
			dark: z.string().default("github-dark"),
		})
		.default({}),
	/** 独立页开关：关闭后主题不注入对应路由（路由完全不生成） */
	pages: z
		.object({
			about: z.boolean().default(true),
			friends: z.boolean().default(true),
			guestbook: z.boolean().default(true),
			sponsor: z.boolean().default(true),
			gallery: z.boolean().default(true),
		})
		.default({
			about: true,
			friends: true,
			guestbook: true,
			sponsor: true,
			gallery: true,
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
	 * - enabled=false 跳过该 widget；两个方向的显隐（对齐参考模板 showOnPostPage/hideOnNonPostPage）：
	 *   showOnPost=false 仅列表页显示；postOnly=true 仅文章页侧栏显示（如 toc）
	 * - onPost=false 时文章详情页不渲染侧栏（TOC 保持正文右侧原位）
	 */
	sidebar: z
		.object({
			/** 文章详情页是否启用侧栏 */
			onPost: z.boolean().default(false),
			/** widget 渲染顺序 = 数组顺序 */
			widgets: z
				.array(
					z.object({
						type: z.enum([
						"announcement",
						"categories",
						"tags",
						"friends",
						"calendar",
						"toc",
						"siteInfo",
						"advertisement",
						"profile",
					]),
						enabled: z.boolean().default(true),
						/** 文章页侧栏是否保留该 widget（false = 仅首页/列表页显示） */
						showOnPost: z.boolean().default(true),
						/** 仅文章页侧栏显示（true = 首页/列表页不出现，如 toc） */
						postOnly: z.boolean().default(false),
					}),
				)
				.default([
					{ type: "announcement" },
					{ type: "categories" },
					{ type: "tags" },
					{ type: "friends" },
					{ type: "calendar" },
					{ type: "toc", postOnly: true },
					{ type: "siteInfo" },
					{ type: "advertisement" },
				]),
			/** 友链 widget 参数 */
			friends: z
				.object({
					count: z.number().int().min(1).default(3),
					/** 构建期随机取样；false 则 featured 优先、其余按 weight 降序取前 count 个 */
					random: z.boolean().default(false),
				})
				.default({ count: 3, random: false }),
		})
		.default({
			onPost: false,
			widgets: [
				{ type: "announcement" },
				{ type: "categories" },
				{ type: "tags" },
				{ type: "friends" },
				{ type: "calendar" },
				{ type: "toc", postOnly: true },
				{ type: "siteInfo" },
				{ type: "advertisement" },
			],
			friends: { count: 3, random: false },
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
					jsUrl: "https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
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
				jsUrl: "https://registry.npmmirror.com/twikoo/1.7.13/files/dist/twikoo.min.js",
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
		})
		.extend(extensions);
}
