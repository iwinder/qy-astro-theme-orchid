/**
 * rehype 插件集（M3a，全部零依赖手写 hast 遍历）
 *
 * 挂载顺序（index.ts）：externalLinks → noReferrer → imageEnhance → callouts
 *   → figure → firstImage → anchor
 * 代码块渲染自 §4.61 起由 Expressive Code 接管（index.ts 直连 rehype 内核），
 * 本文件不再包含代码块插件。
 * 注意：hast 节点类名有两种形态——shiki/EC 产出用 HTML 属性名直接写 properties
 * （class 为字符串而非 className 数组）；remark-rehype 原始节点则是 className
 * 数组。读取类名务必走 getClassList 兼容两种形态。
 */
import fs from "node:fs";
import path from "node:path";

type Transformer = (tree: any, file: any) => void;

/** 浅遍历辅助：对 node.children 逐个调用 fn，fn 可通过返回 'skip' 跳过子树 */
function visit(node: any, fn: (n: any, parent: any | null) => void | "skip") {
	const children = node.children;
	if (!Array.isArray(children)) return;
	for (const child of children) {
		if (fn(child, node) !== "skip") visit(child, fn);
	}
}

const isBlank = (n: any) => n.type === "text" && !n.value.trim();

/**
 * 读取 hast 节点类名列表（兼容两种形态）：shiki 产出用 HTML 属性名直接写
 * properties（class 为字符串），remark-rehype 原始节点则是 className 数组。
 */
function getClassList(props: any): string[] {
	const raw = props?.className ?? props?.class;
	if (Array.isArray(raw)) return raw.map(String);
	if (typeof raw === "string") return raw.split(/\s+/).filter(Boolean);
	return [];
}

/* ---------------------------------------------------------------- 外链 */

/**
 * 外链新窗口打开：http(s) 绝对链接追加 target="_blank" rel="noopener noreferrer"；
 * 外链 <img> 追加 data-external 标记（暗色外链图适配 §4.89 的 CSS 挂点，标记本身零副作用）
 */
export function rehypeExternalLinks(): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "element") return;
			if (node.tagName === "img") {
				if (/^https?:\/\//i.test(String(node.properties?.src ?? ""))) {
					node.properties["data-external"] = "true";
				}
				return;
			}
			if (node.tagName !== "a") return;
			const href = String(node.properties?.href ?? "");
			if (!/^https?:\/\//i.test(href)) return;
			node.properties.target = "_blank";
			const rel = String(node.properties.rel ?? "");
			const parts = new Set(rel.split(/\s+/).filter(Boolean));
			parts.add("noopener");
			parts.add("noreferrer");
			node.properties.rel = [...parts].join(" ");
		});
	};
}

/**
 * 图片防盗链（§4.87）：部分图床/CDN（如 B 站）校验 Referer 头，站内引用返回 403。
 * 为匹配域名的外链 <img> 追加 referrerpolicy="no-referrer"（浏览器请求图片时不发
 * Referer，绕过防盗链限制），仅影响外链图片与匹配域名，本地图片不受影响。
 */
export interface NoReferrerOptions {
	/** 域名列表：裸域名匹配自身与全部子域；*.example.com 只匹配子域 */
	domains: string[];
}

export function rehypeNoReferrer(options: NoReferrerOptions): Transformer {
	if (!options.domains.length) return () => {};
	const matchers = options.domains.map((domain) => {
		const d = domain.toLowerCase();
		if (d.startsWith("*.")) {
			const base = d.slice(2);
			return (host: string) => host.endsWith(`.${base}`) && host !== base;
		}
		return (host: string) => host === d || host.endsWith(`.${d}`);
	});
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "element" || node.tagName !== "img") return;
			const src = String(node.properties?.src ?? "");
			if (!/^https?:\/\//i.test(src)) return;
			let host: string;
			try {
				host = new URL(src).hostname.toLowerCase();
			} catch {
				return;
			}
			if (matchers.some((match) => match(host))) {
				node.properties.referrerPolicy = "no-referrer";
			}
		});
	};
}

/* -------------------------------------------------------------- callouts */

const CALLOUT_META: Record<
	string,
	{ cls: string; title: string; icon: string }
> = {
	NOTE: { cls: "info", title: "注", icon: "info" },
	INFO: { cls: "info", title: "信息", icon: "info" },
	TIP: { cls: "tip", title: "技巧", icon: "tip" },
	ABSTRACT: { cls: "tip", title: "摘要", icon: "tip" },
	SUMMARY: { cls: "tip", title: "摘要", icon: "tip" },
	TLDR: { cls: "tip", title: "摘要", icon: "tip" },
	TODO: { cls: "tip", title: "待办", icon: "tip" },
	IMPORTANT: { cls: "important", title: "重要", icon: "important" },
	EXAMPLE: { cls: "important", title: "示例", icon: "important" },
	WARNING: { cls: "warn", title: "注意", icon: "warn" },
	CAUTION: { cls: "warn", title: "警告", icon: "warn" },
	ATTENTION: { cls: "warn", title: "注意", icon: "warn" },
	QUESTION: { cls: "warn", title: "问题", icon: "help" },
	HELP: { cls: "warn", title: "帮助", icon: "help" },
	FAQ: { cls: "warn", title: "问答", icon: "help" },
	DANGER: { cls: "danger", title: "危险", icon: "danger" },
	ERROR: { cls: "danger", title: "错误", icon: "x" },
	FAILURE: { cls: "danger", title: "失败", icon: "x" },
	FAIL: { cls: "danger", title: "失败", icon: "x" },
	MISSING: { cls: "danger", title: "缺失", icon: "x" },
	BUG: { cls: "danger", title: "缺陷", icon: "bug" },
	SUCCESS: { cls: "success", title: "成功", icon: "check" },
	CHECK: { cls: "success", title: "成功", icon: "check" },
	DONE: { cls: "success", title: "完成", icon: "check" },
	QUOTE: { cls: "quote", title: "引用", icon: "quote" },
	CITE: { cls: "quote", title: "引用", icon: "quote" },
};

/** 与原型一致的 lucide 风格图标（stroke 1.75） */
const CALLOUT_ICONS: Record<string, string> = {
	info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
	tip: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
	important:
		'<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
	warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
	danger: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
	x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	bug: '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
	quote:
		'<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
};

function iconSvg(name: string) {
	return {
		type: "element",
		tagName: "svg",
		properties: {
			className: ["co-icon"],
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.75",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			ariaHidden: "true",
		},
		children: [
			{ type: "raw", value: CALLOUT_ICONS[name] ?? CALLOUT_ICONS.info },
		],
	};
}

/**
 * GitHub 警告块语法：> [!TYPE]（26 种别名，GFM alert + Obsidian callout 集合）
 * 转换为 <div class="callout {cls}"><svg class="co-icon"/><div><b>标题</b>…原内容</div></div>
 * 中文默认标题；[!TYPE] 同一行剩余文字作为自定义标题；语义相近的别名共用配色。
 */
export function rehypeCallouts(): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "element" || node.tagName !== "blockquote") return;
			// 注意：Astro 7 的 mdast→hast 转换会给 blockquote 塞入首尾 "\n" 空白文本节点，
			// 不能假设 children[0] 就是 <p>，须按类型查找首个元素子节点
			const first = (node.children ?? []).find(
				(c: any) => c.type === "element",
			);
			if (!first || first.tagName !== "p") return;
			const firstText = first.children?.find((c: any) => c.type === "text");
			if (!firstText) return;
			const m = String(firstText.value).match(
				/^\[!(NOTE|INFO|TIP|ABSTRACT|SUMMARY|TLDR|TODO|IMPORTANT|EXAMPLE|WARNING|CAUTION|ATTENTION|QUESTION|HELP|FAQ|DANGER|ERROR|BUG|FAILURE|FAIL|MISSING|SUCCESS|CHECK|DONE|QUOTE|CITE)\][ \t]*\n?/i,
			);
			if (!m) return;
			const meta = CALLOUT_META[m[1].toUpperCase()];
			// 移除标记文本；[!TYPE] 同一行剩余文字作为自定义标题（GitHub 语法）。
			// 「无标题」时正则已吃掉换行（m[0] 以 \n 结尾），「有标题」时只吃到空格，
			// 故以 m[0] 是否以 \n 结尾区分，避免把正文首行误当标题
			const rest = String(firstText.value).slice(m[0].length);
			let custom = "";
			let bodyText = rest;
			if (!m[0].endsWith("\n")) {
				const nl = rest.indexOf("\n");
				if (nl === -1) {
					custom = rest.trim();
					bodyText = "";
				} else {
					custom = rest.slice(0, nl).trim();
					bodyText = rest.slice(nl + 1);
				}
			}
			firstText.value = bodyText;
			const title = custom || meta.title;
			if (!firstText.value && first.children.length === 1) {
				node.children = node.children.filter((c: any) => c !== first);
			}
			const body = {
				type: "element",
				tagName: "div",
				properties: {},
				children: [
					{
						type: "element",
						tagName: "b",
						properties: {},
						children: [{ type: "text", value: title }],
					},
					...node.children,
				],
			};
			node.tagName = "div";
			node.properties = { className: ["callout", meta.cls] };
			node.children = [iconSvg(meta.icon), body];
		});
	};
}

/* -------------------------------------------------------- 正文图片增强 */

/**
 * 正文图片增强（§4.106；§4.107 扩展外链）：
 * 1. 注入 loading="lazy" + decoding="async"（已有值不覆盖——作者显式声明优先）；
 * 2. 图片注入 LQIP 渐变背景：直接内联在 img style 上，图片加载后位图自然
 *    盖住渐变，无需 wrapper 结构与客户端 JS。本地 public 图（src 以 / 开头）
 *    查 `public:` 键，外链图（http(s) 绝对 URL）查 `url:` 键——键规则与
 *    scripts/generate-lqips.mjs 一致，外链 URL 须与渲染期逐字符一致。
 * lqips.json 读站点根（file.cwd）并模块级缓存——rehype transformer 运行于
 * 纯 Node，拿不到 vite 虚拟模块；缓存按构建进程生命周期，dev 下改 lqips.json
 * 需重启 dev server（与 vite 插件 configResolved 的读取时机一致）。
 */
let lqipTable: Record<string, string> | null = null;

function loadLqipTable(cwd: string): Record<string, string> {
	if (lqipTable) return lqipTable;
	// content layer 的 VFile cwd 不一定是站点根，依次尝试 file.cwd 与 process.cwd()
	for (const dir of [cwd, process.cwd()]) {
		try {
			lqipTable = JSON.parse(
				fs.readFileSync(path.join(dir, "lqips.json"), "utf8"),
			);
			break;
		} catch {
			/* 目录不对，尝试下一个 */
		}
	}
	lqipTable ??= {};
	return lqipTable;
}

/** src → lqips.json 键（本地 public: 前缀 / 外链 url: 前缀），非两者返回 null */
function lqipKey(src: string): string | null {
	if (src.startsWith("/")) return `public:${src.replace(/^\//, "")}`;
	if (/^https?:\/\//i.test(src)) return `url:${src}`;
	return null;
}

export function rehypeImageEnhance(): Transformer {
	return (tree, file) => {
		const lqips = loadLqipTable(String(file.cwd ?? ""));
		visit(tree, (node) => {
			if (node.type !== "element" || node.tagName !== "img") return;
			node.properties.loading ??= "lazy";
			node.properties.decoding ??= "async";
			const src = String(node.properties.src ?? "");
			const key = lqipKey(src);
			if (!key) return;
			const hex = lqips[key];
			if (!hex || !/^[0-9a-f]{18}$/i.test(hex)) return;
			const grad = `linear-gradient(135deg, #${hex.slice(0, 6)} 0%, #${hex.slice(6, 12)} 50%, #${hex.slice(12, 18)} 100%)`;
			const style = String(node.properties.style ?? "");
			node.properties.style = style
				? `${style};background:${grad}`
				: `background:${grad}`;
		});
	};
}

/* -------------------------------------------------------------- figure */

/**
 * 独立段落中的单图 → <figure>；img 的 title 属性 → <figcaption>。
 * 灯箱归组交给页面级 data-lightbox-gallery 容器（§4.70）：figure 不再自带
 * data-lightbox，否则文章容器内嵌套两组容器会被双重绑定点击监听而双开灯箱
 */
export function rehypeFigure(): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "element" || node.tagName !== "p") return;
			const meaningful = (node.children ?? []).filter((c: any) => !isBlank(c));
			if (
				meaningful.length !== 1 ||
				meaningful[0].type !== "element" ||
				meaningful[0].tagName !== "img"
			)
				return;
			const img = meaningful[0];
			const title = img.properties?.title;
			const figure: any = {
				type: "element",
				tagName: "figure",
				properties: {},
				children: [img],
			};
			if (title) {
				delete img.properties.title;
				figure.children.push({
					type: "element",
					tagName: "figcaption",
					properties: {},
					children: [{ type: "text", value: String(title) }],
				});
			}
			// 用 figure 替换 p 内容（p 无其他有意义子节点，直接整体替换）
			node.tagName = "figure";
			node.properties = figure.properties;
			node.children = figure.children;
		});
	};
}

/* -------------------------------------------------------------- 首图提取 */

/**
 * 提取正文第一张图片地址 → frontmatter.firstImage（列表卡片封面兜底，决策 9）
 */
export function rehypeFirstImage(): Transformer {
	return (tree, file) => {
		let found = false;
		visit(tree, (node) => {
			if (found) return "skip";
			if (node.type === "element" && node.tagName === "img") {
				const src = node.properties?.src;
				if (typeof src === "string" && src) {
					file.data.astro.frontmatter.firstImage = src;
					found = true;
				}
			}
			return;
		});
	};
}

/* ------------------------------------------------------------ 标题锚点 */

/**
 * h2–h4（Astro 已注入 id）末尾追加 <a class="h-anchor">#</a>
 */
export function rehypeAnchor(): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "element") return;
			if (!["h2", "h3", "h4"].includes(node.tagName)) return;
			const id = node.properties?.id;
			if (!id) return;
			node.children.push({
				type: "element",
				tagName: "a",
				properties: {
					className: ["h-anchor"],
					href: `#${id}`,
					ariaLabel: "链接到本节",
				},
				children: [{ type: "text", value: "#" }],
			});
		});
	};
}

/* -------------------------------------------------------------- 代码块 */

/* §4.61 起代码块渲染由 Expressive Code 接管（index.ts 直连 rehype 内核），
   自研 rehypeCodeBlock（复制/折叠按钮包装）已退役；此处不再有代码块插件 */
