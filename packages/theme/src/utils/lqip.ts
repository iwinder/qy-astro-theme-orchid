/**
 * LQIP 占位渐变（M3b-b9，P1-14；§4.107 扩展外链）：
 * 构建期从 virtual:theme/lqips 查表返回内联渐变样式。两类键——
 * `public:<posix 路径>`（本地 public 图）与 `url:<完整外链 URL>`（§4.107 构建期
 * 抓取采样的外链图）。查不到（未收录外链 / data URL / 未生成 lqips.json）时
 * 兜底为主题色柔和渐变（color-mix 跟随明暗主题），不再是灰色纯色。
 */
import lqips from "virtual:theme/lqips";

/** 18 字符 compact hex → 三段 135° 渐变背景样式 */
function hexToStyle(hex: string): string {
	return `background:linear-gradient(135deg, #${hex.slice(0, 6)} 0%, #${hex.slice(6, 12)} 50%, #${hex.slice(12, 18)} 100%)`;
}

/**
 * 图片 src（本地 / 开头 public 路径，或完整外链 URL）→ LQIP 渐变背景。
 * 键规则与 scripts/generate-lqips.mjs 一致：外链 URL 须与渲染期逐字符一致
 * （randomCoverUrl / urls.txt / frontmatter image 或首图原样）。
 */
export function getLqipStyle(src: string): string {
	const key = src.startsWith("/")
		? `public:${src.replace(/^\//, "")}`
		: `url:${src}`;
	const hex = lqips[key];
	if (hex && /^[0-9a-f]{18}$/i.test(hex)) return hexToStyle(hex);
	return `background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, var(--surface)) 0%, color-mix(in srgb, var(--accent) 9%, var(--surface)) 100%)`;
}
