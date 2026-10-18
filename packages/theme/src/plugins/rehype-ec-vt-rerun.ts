/**
 * §4.74：Astro ClientRouter（View Transitions）下 EC 社区折叠插件的换页失效修复。
 *
 * 现象：经系列导航等 VT 换页进入新文章后，折叠代码块的展开按钮点击无效。
 *
 * 根因：expressive-code-collapsible@0.1.0 的交互脚本只在 DOMContentLoaded
 * 绑定一次，且 MutationObserver 闭包引用换页前的旧 body——ClientRouter swap
 * 整体替换 body 后：内联脚本不重新执行、observer 观察的旧 body 已脱离文档，
 * 新页面的 .ec-collapse__toggle / .ec-collapse__header-toggle 无 click 监听。
 * （EC core 官方脚本已用 astro:page-load 自适配 VT，copy 按钮等不受影响。）
 *
 * 修复：识别出含该插件特征（ec-collapse__toggle）的内联 <script>，标记
 * data-astro-rerun——ClientRouter swap 时会重新执行该脚本；脚本自带
 * dataset.init 幂等保护 + 全文档 querySelectorAll 扫描，重跑即完成新页
 * 按钮绑定，observer 也随之重新观察新 body（动态插入场景一并修复）。
 * 仅含折叠代码块的页面才有该脚本，离开后自然不执行，无额外开销。
 */

/** 内联脚本特征：社区折叠插件按钮选择器，官方 EC 脚本不含此串 */
const COLLAPSIBLE_SCRIPT_MARKER = "ec-collapse__toggle";

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
		}
		walk(child);
	}
}

export function rehypeEcVtRerun() {
	return (tree: HastNode) => walk(tree);
}
