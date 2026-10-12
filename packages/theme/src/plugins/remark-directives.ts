/**
 * remark-directive 指令分发（A2/A3，移植自参考模板 remark-directive-rehype）
 *
 * 官方 remark-directive 将 :::container / ::leaf / :text 指令解析为三类
 * directive 节点，本插件统一改写：
 * - containerDirective + 26 种 admonition 类型 → blockquote，并在首段注入
 *   "[!TYPE] " 标记，复用既有 rehypeCallouts 渲染（自定义 label 融入标题）
 * - 其余指令 → hastscript 转成同名自定义标签（如 ::github{repo=…} →
 *   <github repo="…">），交由对应 rehype 插件替换（rehypeGithubCard）
 */
import { h } from "hastscript";

/** 参考模板的 26 种 admonition 类型（GitHub 6 种 + Obsidian 扩充别名） */
const ADMONITION_TYPES = new Set([
	"note",
	"tip",
	"important",
	"warning",
	"caution",
	"abstract",
	"summary",
	"tldr",
	"info",
	"todo",
	"success",
	"check",
	"done",
	"question",
	"help",
	"faq",
	"attention",
	"failure",
	"missing",
	"fail",
	"danger",
	"error",
	"bug",
	"example",
	"quote",
	"cite",
]);

export function remarkDirectives(): any {
	const transform = (node: any) => {
		if (
			node.type !== "containerDirective" &&
			node.type !== "leafDirective" &&
			node.type !== "textDirective"
		)
			return;
		const name = String(node.name ?? "").toLowerCase();

		if (node.type === "containerDirective" && ADMONITION_TYPES.has(name)) {
			const type = name.toUpperCase();
			const firstChild = node.children[0];
			if (firstChild?.data?.directiveLabel) {
				// 自定义标题：标记注入 label 首文本，由 rehypeCallouts 提为标题
				if (
					firstChild.children.length > 0 &&
					firstChild.children[0].type === "text"
				) {
					firstChild.children[0].value = `[!${type}] ${firstChild.children[0].value}`;
				} else {
					firstChild.children.unshift({
						type: "text",
						value: `[!${type}] `,
					});
				}
			} else {
				// 无标题：插入仅含标记的新段落
				node.children.unshift({
					type: "paragraph",
					children: [{ type: "text", value: `[!${type}]` }],
				});
			}
			// 关键：转 blockquote 且清除 hProperties，防止变成自定义标签
			node.type = "blockquote";
			node.data = node.data ?? {};
			node.data.hName = "blockquote";
			delete node.data.hProperties;
		} else {
			// 其他指令：转同名自定义标签（attributes 原样带入），样式缺省不可见，
			// 由对应 rehype 插件负责替换
			node.data = node.data ?? {};
			const hast = h(name, node.attributes ?? {});
			node.data.hName = hast.tagName;
			node.data.hProperties = hast.properties;
		}
	};

	const walk = (node: any) => {
		if (!Array.isArray(node.children)) return;
		for (const child of node.children) {
			transform(child);
			walk(child);
		}
	};

	return (tree: any) => walk(tree);
}
