/**
 * LQIP 占位渐变（M3b-b9，P1-14）：构建期从 virtual:theme/lqips 查表，
 * 返回内联渐变样式。查不到（外链 / data URL / 未生成 lqips.json）时
 * 返回纯色兜底，功能自然降级，无需配置开关。
 */
import lqips from "virtual:theme/lqips";

/** 图片 public 路径（/assets/x.jpg）→ 18 字符 compact hex 三段渐变背景 */
export function getLqipStyle(src: string): string {
	const hex = lqips[`public:${src.replace(/^\//, "")}`];
	if (hex && /^[0-9a-f]{18}$/i.test(hex)) {
		const c1 = `#${hex.slice(0, 6)}`;
		const c2 = `#${hex.slice(6, 12)}`;
		const c3 = `#${hex.slice(12, 18)}`;
		return `background:linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
	}
	return "background:var(--muted)";
}
