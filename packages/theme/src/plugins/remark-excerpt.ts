/**
 * remark 插件：自动摘要（写入 frontmatter.excerpt）
 *
 * 取正文第一个 paragraph 的纯文本（与 orchid-blog 的 remark-excerpt 行为一致）。
 * description 字段仍是手动维护的展示摘要；excerpt 仅作列表兜底。
 */
export function remarkExcerpt() {
	return (tree: any, { data }: any) => {
		let excerpt = "";
		for (const node of tree.children || []) {
			if (node.type !== "paragraph") continue;
			excerpt = mdastToString(node).trim();
			break;
		}
		data.astro.frontmatter.excerpt = excerpt;
	};
}

/** 近似 mdast-util-to-string：递归取 text / inlineCode 的 value，忽略 html 与 image */
function mdastToString(node: any): string {
	if (!node) return "";
	if (node.type === "text" || node.type === "inlineCode")
		return node.value || "";
	if (node.type === "html" || node.type === "image" || node.type === "code")
		return "";
	let out = "";
	for (const child of node.children || []) out += mdastToString(child);
	return out;
}
