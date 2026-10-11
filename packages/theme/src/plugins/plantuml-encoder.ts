/**
 * PlantUML 服务器编码工具（M3b-b4，移植自 orchid-blog）
 *
 * PlantUML 文本编码三步：UTF-8 字节 → raw DEFLATE（无 zlib 头）→
 * PlantUML 自定义 base64 字母表（`0-9A-Za-z-_`，无 `=` 填充）。
 * 结果可直接拼到服务器 `/svg/`、`/png/` 路径之后。
 * @see https://plantuml.com/text-encoding
 */
import * as pako from "pako";

const PLANTUML_ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function encode6bit(value: number) {
	return PLANTUML_ALPHABET.charAt(value & 0x3f);
}

function append3bytes(b1: number, b2: number, b3: number) {
	const c1 = b1 >> 2;
	const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
	const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
	const c4 = b3 & 0x3f;
	return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

function encode64(bytes: Uint8Array) {
	let result = "";
	const length = bytes.length;
	for (let i = 0; i < length; i += 3) {
		if (i + 2 === length) {
			result += append3bytes(bytes[i], bytes[i + 1], 0);
		} else if (i + 1 === length) {
			result += append3bytes(bytes[i], 0, 0);
		} else {
			result += append3bytes(bytes[i], bytes[i + 1], bytes[i + 2]);
		}
	}
	return result;
}

/** PlantUML 专用编码：UTF-8 → deflateRaw(level 9) → 自定义 base64 */
export function encodePlantUML(source: string) {
	if (typeof source !== "string") {
		throw new TypeError(
			`encodePlantUML expects a string, got ${typeof source}`,
		);
	}
	const utf8Bytes = new TextEncoder().encode(source);
	const deflated = pako.deflateRaw(utf8Bytes, { level: 9 });
	return encode64(deflated);
}

/** 源码已含 `!theme` 或 `skinparam backgroundColor` 时尊重作者显式设置，不再注入 */
function hasExplicitTheme(source: string) {
	return (
		/^\s*!theme\s+\S+/m.test(source) ||
		/^\s*skinparam\s+backgroundColor\b/im.test(source)
	);
}

/**
 * 在源码头部注入 `!theme <name>`：
 * - 主题名为空 → 原样返回
 * - 已有显式主题/背景色 → 原样返回
 * - 首行是 `@startuml` → 该行之后插入
 * - 无 `@startuml` → 源码最前面插入
 */
export function injectTheme(source: string, themeName: string) {
	if (typeof source !== "string") {
		throw new TypeError(
			`injectTheme expects a string source, got ${typeof source}`,
		);
	}
	if (!themeName?.trim()) return source;
	if (hasExplicitTheme(source)) return source;
	const themeDirective = `!theme ${themeName.trim()}`;
	const startumlMatch = source.match(/^[^\S\r\n]*@startuml[^\r\n]*\r?\n?/);
	if (startumlMatch) {
		const insertAt = (startumlMatch.index ?? 0) + startumlMatch[0].length;
		return `${source.slice(0, insertAt)}${themeDirective}\n${source.slice(insertAt)}`;
	}
	return `${themeDirective}\n${source}`;
}

/** 拼接 `<server>/svg/<encoded>`，自动去 server 尾部斜杠 */
export function buildUrl(server: string, encoded: string) {
	if (typeof server !== "string" || !server.trim()) {
		throw new TypeError("buildUrl expects a non-empty server string");
	}
	if (typeof encoded !== "string" || !encoded.trim()) {
		throw new TypeError("buildUrl expects a non-empty encoded string");
	}
	const normalizedServer = server.replace(/\/+$/, "");
	return `${normalizedServer}/svg/${encoded}`;
}
