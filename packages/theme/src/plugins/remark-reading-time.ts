/**
 * remark 插件：阅读时长与字数统计（写入 frontmatter.minutes / frontmatter.words）
 *
 * 口径（自实现，零依赖，对中文博客更准确）：
 * - words = CJK 字符数 + 非 CJK 单词数
 * - minutes = max(1, round(words / 275))，275 wpm 为 reading-time 默认速度
 * 值在渲染期由 remark 链写入，不经过 content collection schema 校验，
 * 组件通过 `const { remarkPluginFrontmatter } = await render(post)` 读取。
 */
export function remarkReadingTime() {
	return (tree: any, { data }: any) => {
		const text = mdastToString(tree);
		const words = countWords(text);
		data.astro.frontmatter.words = words;
		data.astro.frontmatter.minutes = Math.max(1, Math.round(words / 275));
	};
}

/** 近似 mdast-util-to-string：递归取 text / inlineCode 的 value，忽略 html 与 image */
function mdastToString(node: any): string {
	if (!node) return '';
	if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
	if (node.type === 'html' || node.type === 'image' || node.type === 'code') return '';
	let out = '';
	for (const child of node.children || []) out += mdastToString(child);
	return out;
}

const CJK = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;

function countWords(text: string): number {
	const cjk = (text.match(CJK) || []).length;
	const rest = text.replace(CJK, ' ');
	const latin = rest.split(/\s+/).filter(Boolean).length;
	return cjk + latin;
}
