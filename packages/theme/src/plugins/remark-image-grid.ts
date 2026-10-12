/**
 * [grid]…[/grid] 图片网格（A1，移植自参考模板 remark-image-grid）
 *
 * 支持两种形态：
 * 1. 同段：[grid] ![a](…) ![b](…) [/grid]（标签与图片同段）
 * 2. 跨段：[grid] 独行、图片段落若干、[/grid] 独行；未闭合时原样输出不转换
 *
 * 列数 = 网格内图片数（上限 4，无图缺省 2）。输出 div.image-grid[data-cols="N"]，
 * 布局由主题 CSS 生成——不用参考模板的 tailwind 动态类（md:grid-cols-N 这类
 * 拼接类名在 node_modules symlink 源码中不可靠扫描，见 §4.10）。
 */

const countImages = (node: any): number => {
	let count = node.type === "image" ? 1 : 0;
	if (Array.isArray(node.children)) {
		for (const child of node.children) count += countImages(child);
	}
	return count;
};

const gridNode = (children: any[]) => {
	const cols = Math.min(4, countImages({ children }) || 2);
	return {
		type: "paragraph",
		data: {
			hName: "div",
			hProperties: {
				className: ["image-grid"],
				"data-cols": String(cols),
			},
		},
		children,
	};
};

export function remarkImageGrid(): any {
	return (tree: any) => {
		if (tree.type !== "root") return;
		const newChildren: any[] = [];
		let inGrid = false;
		let gridChildren: any[] = [];

		for (const node of tree.children) {
			if (node.type === "paragraph" && node.children?.length > 0) {
				const first = node.children[0];
				const last = node.children[node.children.length - 1];
				const hasStart =
					first.type === "text" && first.value.trim().startsWith("[grid]");
				const hasEnd =
					last.type === "text" && last.value.trim().endsWith("[/grid]");

				// 形态 1：[grid]…[/grid] 同段
				if (hasStart && hasEnd && !inGrid) {
					first.value = first.value.replace(/^\s*\[grid\]\s*/, "");
					last.value = last.value.replace(/\s*\[\/grid\]\s*$/, "");
					newChildren.push(
						gridNode(
							node.children.filter(
								(n: any) => n.type !== "text" || n.value.trim() !== "",
							),
						),
					);
					continue;
				}

				// 形态 2：跨段开始（[grid] 独行则丢弃该段落）
				if (!inGrid && hasStart) {
					inGrid = true;
					first.value = first.value.replace(/^\s*\[grid\]\s*/, "");
					if (!(node.children.length === 1 && first.value.trim() === "")) {
						gridChildren.push(node);
					}
					continue;
				}

				// 形态 2：跨段结束，汇总图片数定列数
				if (inGrid && hasEnd) {
					inGrid = false;
					last.value = last.value.replace(/\s*\[\/grid\]\s*$/, "");
					if (!(node.children.length === 1 && last.value.trim() === "")) {
						gridChildren.push(node);
					}
					newChildren.push(gridNode(gridChildren));
					gridChildren = [];
					continue;
				}
			}

			if (inGrid) gridChildren.push(node);
			else newChildren.push(node);
		}

		// 未闭合：原样输出已收集内容
		if (inGrid) newChildren.push(...gridChildren);
		tree.children = newChildren;
	};
}
