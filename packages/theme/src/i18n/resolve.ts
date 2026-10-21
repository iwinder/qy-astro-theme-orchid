/**
 * 语言包解析（纯函数，无 virtual:theme/config 依赖）。
 *
 * 独立成模块的原因：astro.config 的静态 import 链（index.ts → plugins/rehype.ts）
 * 在 astro 配置加载期求值，彼时 virtual:theme/config 尚未注册，顶层 import 会直接
 * 报 "Cannot find module"。需要 lang 的调用方（路由/组件走 i18n/index.ts 的 t()；
 * node 侧插件走本模块的 resolveLabel + 显式传入的 config.lang）。
 */

import en from "./en.js";
import ja from "./ja.js";
import ko from "./ko.js";
import ru from "./ru.js";
import zhCN, { type UiKey } from "./zh-CN.js";
import zhTW from "./zh-TW.js";

type Pack = Partial<Record<UiKey, string>>;

/** 已内置语言包（键为归一化 lang：小写、下划线转连字符；ja-jp/ko-kr 等经基础语言回退命中） */
const packs: Record<string, Pack> = {
	en: en,
	"en-us": en,
	"en-gb": en,
	"zh-tw": zhTW,
	"zh-hant": zhTW,
	ja: ja,
	ko: ko,
	ru: ru,
};

function norm(lang: string): string {
	return lang.toLowerCase().replace(/_/g, "-");
}

function resolvePack(lang: string): Pack {
	const l = norm(lang);
	if (packs[l]) return packs[l];
	const base = l.split("-")[0];
	if (packs[base]) return packs[base];
	return zhCN;
}

/** 取 UI 文案；vars 替换 {name} 占位符；缺译回退中文键源 */
export function resolveLabel(
	lang: string,
	key: UiKey,
	vars?: Record<string, string | number>,
): string {
	let s: string = resolvePack(lang)[key] ?? zhCN[key];
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			s = s.replaceAll(`{${k}}`, String(v));
		}
	}
	return s;
}

export type { UiKey };
