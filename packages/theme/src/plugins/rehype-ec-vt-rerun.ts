/**
 * §4.74：Astro ClientRouter（View Transitions）下 EC 社区折叠插件的换页失效修复。
 * §4.76：二次根因修正——data-astro-rerun 确实会重执行脚本，但被脚本自身的
 * window 级幂等守卫拦截（早退），新页按钮依然无监听；现连守卫一并中和。
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
 * 2. §4.76 实测发现重执行仍无效：脚本首两行是 window 级早退守卫
 *    （if (window.ecCollapsibleInit) return; window.ecCollapsibleInit = true;），
 *    ClientRouter 换页只换 body 不换 window，标志位跨页存活 → 重执行被早退
 *    拦截，初始化整体短路。按钮级 dataset.init 守卫只防重复绑定，挡不住这里。
 *    → 修复：脚本文本中的 ecCollapsibleInit 全部改名为 ecCollapsibleInitVtRerun，
 *    守卫永读不中（undefined），每次执行都完整初始化。安全性：按钮级
 *    dataset.init 防重复监听；MutationObserver 每次重建并观察当前 body，
 *    旧 observer 附着已脱离文档的旧 body，随其一起 GC；离开含折叠块的页面
 *    后脚本不再存在、不重执行，无额外开销。
 *
 * 仅含折叠代码块的页面才有该脚本；若上游插件改名标志位或改结构，改名正则
 * 不命中即退化为 §4.74 行为（仅重执行，不中和守卫），不会更糟。
 */

/** 内联脚本特征：社区折叠插件按钮选择器，官方 EC 脚本不含此串 */
const COLLAPSIBLE_SCRIPT_MARKER = "ec-collapse__toggle";

/** 脚本级 window 幂等守卫标志位：改名使其永为 undefined，早退不命中 */
const INIT_FLAG_RE = /\becCollapsibleInit\b/g;
const INIT_FLAG_VT_NAME = "ecCollapsibleInitVtRerun";

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
			// 中和 window 级早退守卫（§4.76 根因 2）：标志位改名后守卫永为
			// false，data-astro-rerun 的重执行得以真正完成新页按钮绑定
			for (const text of child.children ?? []) {
				if (typeof text.value === "string") {
					text.value = text.value.replace(INIT_FLAG_RE, INIT_FLAG_VT_NAME);
				}
			}
		}
		walk(child);
	}
}

export function rehypeEcVtRerun() {
	return (tree: HastNode) => walk(tree);
}
