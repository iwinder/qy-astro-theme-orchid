/**
 * rehype 插件集（M3a，全部零依赖手写 hast 遍历）
 *
 * 挂载顺序（index.ts）：externalLinks → callouts → figure → firstImage → anchor → codeBlock
 * 注意：Astro 的 shiki 高亮在用户 rehype 插件之后运行，因此 codeBlock 只负责
 * 包装 <pre> 外层结构（.code-block/.code-head），pre 内容仍由 shiki 填充。
 * remark-math 的块级公式也会产出 <pre><code class="language-math">（后续由
 * rehype-katex 整体替换为 katex 渲染产物），此时不生成复制按钮（无可复制代码）。
 */
import { resolveLabel } from "../i18n/resolve.js";

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

/* ---------------------------------------------------------------- 外链 */

/**
 * 外链新窗口打开：http(s) 绝对链接追加 target="_blank" rel="noopener noreferrer"
 */
export function rehypeExternalLinks(): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "element" || node.tagName !== "a") return;
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

/* ---------------------------------------------------------------- figure */

/**
 * 独立段落中的单图 → <figure data-lightbox>；img 的 title 属性 → <figcaption>
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
				properties: { "data-lightbox": true },
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

/**
 * <pre><code class="language-x"> →
 * <div class="code-block"><div class="code-head"><span class="lang">x</span>
 * <button class="copy-btn" type="button">复制</button></div><pre>…</pre></div>
 *
 * pre 本体不动（shiki 在其后运行并填充高亮 HTML）。
 * 两阶段执行：先收集所有 pre，再替换，避免包装后的 div 被重复访问。
 */
export function rehypeCodeBlock(opts?: { uiLang?: string }): Transformer {
	const uiLang = opts?.uiLang || "zh-CN";
	return (tree) => {
		const targets: Array<{ pre: any; parent: any; index: number }> = [];
		visit(tree, (node, parent) => {
			if (node.type !== "element" || node.tagName !== "pre") return;
			if (!parent) return;
			targets.push({ pre: node, parent, index: parent.children.indexOf(node) });
		});
		for (const { pre, parent, index } of targets) {
			const code = (pre.children ?? []).find(
				(c: any) => c.type === "element" && c.tagName === "code",
			);
			const cls = Array.isArray(code?.properties?.className)
				? code.properties.className
				: [];
			const langMatch = cls.find((c: string) =>
				String(c).startsWith("language-"),
			);
			const lang = langMatch
				? String(langMatch).slice("language-".length)
				: "code";
			const head: any = {
				type: "element",
				tagName: "div",
				// data-pagefind-ignore（M3b-b6）：语言标签/复制按钮文本不进搜索索引
				properties: { className: ["code-head"], "data-pagefind-ignore": true },
				children: [
					{
						type: "element",
						tagName: "span",
						properties: { className: ["lang"] },
						children: [{ type: "text", value: lang }],
					},
				],
			};
			/* math 块将由 rehype-katex 整体替换，无可复制代码，不生成复制按钮 */
			if (lang !== "math") {
				head.children.push({
					type: "element",
					tagName: "button",
					properties: { className: ["copy-btn"], type: "button" },
					children: [{ type: "text", value: resolveLabel(uiLang, "copy") }],
				});
			}
			const wrapper = {
				type: "element",
				tagName: "div",
				properties: { className: ["code-block"] },
				children: [head, pre],
			};
			parent.children[index] = wrapper;
		}
	};
}
