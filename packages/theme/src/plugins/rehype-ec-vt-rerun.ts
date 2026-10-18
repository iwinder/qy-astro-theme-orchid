/**
 * §4.74：Astro ClientRouter（View Transitions）下 EC 社区折叠插件的换页失效修复。
 * §4.76：二次根因修正——data-astro-rerun 确实会重执行脚本，但被脚本自身的
 * window 级幂等守卫拦截（早退），新页按钮依然无监听；首版修复曾试图把守卫
 * 标志位改名规避，实测仍有同会话跨页残留（写作指南页无折叠块但注入脚本并
 * 置标志，再 VT 进快速开始时读标志早退），最终改为整段删除守卫与赋值。
 *
 * 现象：经系列导航等 VT 换页进入新文章后，折叠代码块的展开按钮点击无效。
 *
 * 根因（两层）：
 * 1. expressive-code-collapsible@0.1.0 的交互脚本只在 DOMContentLoaded
 *    绑定一次，且 MutationObserver 闭包引用换页前的旧 body——ClientRouter
 *    swap 整体替换 body 后：内联脚本不重新执行、observer 观察的旧 body 已
 *    脱离文档，新页面的 .ec-collapse__toggle 无 click 监听。
 *    （EC core 官方脚本已用 astro:page-load 自适配 VT，copy 按钮等不受影响。）
 *    → 修复：标记 data-astro-rerun 让 ClientRouter swap 时重执行该脚本。
 * 2. §4.76 两轮实测发现重执行仍无效：脚本首两行是 window 级早退守卫
 *    （if (window.ecCollapsibleInit) return; window.ecCollapsibleInit = true;），
 *    ClientRouter 换页只换 body 不换 window——标志位在同一浏览器会话内跨页
 *    存活：任何注入过该脚本的页面（含无折叠代码块的文章，脚本照注入置位）
 *    之后 VT 进入有折叠块的文章时，重执行被早退拦截，绑定整体短路。
 *    → 修复：脚本文本中整段删除该守卫与标志赋值，每次执行都完整初始化。
 *      安全性：按钮级 dataset.init 守卫防重复绑定；MutationObserver 每次重
 *      建并观察当前 body，旧 observer 附着已脱离文档的旧 body，随其 GC；
 *      data-astro-rerun 每次 swap 恰执行一次、full load 一次，无同 DOM 重入；
 *      离开含折叠块的页面后脚本不存在、不执行，无额外开销。
 *
 * 仅含折叠代码块的页面才有该脚本；若上游插件改守卫名或改结构，删除正则
 * 不命中即退化为 §4.74 行为（仅重执行，不删守卫），不会更糟。
 */

/** 内联脚本特征：社区折叠插件按钮选择器，官方 EC 脚本不含此串 */
const COLLAPSIBLE_SCRIPT_MARKER = "ec-collapse__toggle";

/** window 级早退守卫：if (window.ecCollapsibleInit) return; （含前导空白） */
const GUARD_RE = /\s*if\s*\(\s*window\.ecCollapsibleInit\s*\)\s*return\s*;?/;
/** 守卫标志赋值：window.ecCollapsibleInit = true; （含前导空白） */
const FLAG_SET_RE = /\s*window\.ecCollapsibleInit\s*=\s*true\s*;?/;

interface HastNode {
	type: string;
	tagName?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
	value?: unknown;
}

function scriptText(node: HastNode): string {
	return (node.children ?? [])
		.map((child) => (typeof child.value === "string" ? child.value : ""))
		.join("");
}

function walk(node: HastNode): void {
	for (const child of node.children ?? []) {
		if (child.type !== "element") continue;
		if (
			child.tagName === "script" &&
			!child.properties?.src &&
			scriptText(child).includes(COLLAPSIBLE_SCRIPT_MARKER)
		) {
			child.properties["data-astro-rerun"] = true;
			// 删除 window 级早退守卫（§4.76 根因 2）：守卫标志在 ClientRouter
			// 换页间随 window 存活，任何先访问过含该脚本页面的会话都会让后续
			// 重执行早退短路；删除后每次执行都完整绑定新页按钮
			for (const text of child.children ?? []) {
				if (typeof text.value === "string") {
					text.value = text.value
						.replace(GUARD_RE, "")
						.replace(FLAG_SET_RE, "");
				}
			}
		}
		walk(child);
	}
}

export function rehypeEcVtRerun() {
	return (tree: HastNode) => walk(tree);
}
