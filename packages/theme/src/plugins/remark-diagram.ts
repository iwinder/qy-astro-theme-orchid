/**
 * remark 图表标记插件（M3b-b4，移植自 orchid-blog）
 *
 * - remarkMermaid：```mermaid 代码块 → 自定义节点 type='mermaid'，
 *   data.hName/hProperties 落为 <div class="mermaid-container" data-mermaid-code="…">，
 *   hChildren 保留源码文本（构建期渲染失败时可降级展示），value 置空避免重复输出
 * - remarkPlantuml：```plantuml 代码块 → <div class="plantuml-wrapper">，
 *   双主题 URL（injectTheme → pako deflate → PlantUML base64url）预编码进 data 属性，
 *   构建期零请求，主题切换由客户端换 src 完成
 */

import { buildUrl, encodePlantUML, injectTheme } from "./plantuml-encoder.js";

type Transformer = (tree: any, file: any) => void;

/** 深度遍历辅助（与 rehype.ts 内 visit 同风格），fn 返回 'skip' 跳过子树 */
function visit(node: any, fn: (n: any) => void | "skip") {
	const children = node.children;
	if (!Array.isArray(children)) return;
	for (const child of children) {
		if (fn(child) !== "skip") visit(child, fn);
	}
}

export function remarkMermaid(): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "code") return;
			if (String(node.lang ?? "").toLowerCase() !== "mermaid") return;
			const code = String(node.value ?? "");
			node.type = "mermaid";
			node.data = { ...node.data };
			node.data.hName = "div";
			node.data.hProperties = {
				className: ["mermaid-container"],
				"data-mermaid-code": code,
			};
			node.data.hChildren = [{ type: "text", value: code }];
			node.value = undefined;
		});
	};
}

export interface PlantumlOptions {
	/** PlantUML 渲染服务地址，如 https://www.plantuml.com/plantuml */
	server: string;
	/** 浅色主题名（空 = 不注入 !theme，尊重图内已有声明） */
	lightTheme?: string;
	/** 深色主题名（空 = 复用浅色 URL） */
	darkTheme?: string;
}

export function remarkPlantuml(options: PlantumlOptions): Transformer {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type !== "code") return;
			if (String(node.lang ?? "").toLowerCase() !== "plantuml") return;
			const code = String(node.value ?? "");
			const lightSource = injectTheme(code, options.lightTheme ?? "");
			const darkSource = injectTheme(code, options.darkTheme ?? "");
			const lightUrl = buildUrl(options.server, encodePlantUML(lightSource));
			const darkUrl =
				darkSource === lightSource
					? lightUrl
					: buildUrl(options.server, encodePlantUML(darkSource));
			node.type = "plantuml";
			node.data = { ...node.data };
			node.data.hName = "div";
			node.data.hProperties = {
				className: ["plantuml-wrapper"],
				"data-light-src": lightUrl,
				"data-dark-src": darkUrl,
				"data-plantuml-alt": code.slice(0, 200),
			};
			node.value = undefined;
		});
	};
}
