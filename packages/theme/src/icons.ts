/**
 * 社交图标解析（§4.65 标准化迁移）：自研 SVG 表退役，改走 astro-icon + Iconify
 * 标准生态——构建期内联渲染、无运行时请求，语义与参考项目一致。
 *
 * icon 字段解析优先级（Sidebar 资料卡）：
 *   1. "<" 开头 → 内联 SVG 字符串（§4.59 向后兼容，调用方 set:html 直出）
 *   2. 含 ":" → Iconify 全名（如 "tabler:home"），直接透传 <Icon>；
 *      站点装任意 @iconify-json/* 集合包即可扩展
 *   3. 内置简名 → 查 NAMED_ICONS 映射表（下方）
 *   4. 标准库未收录品牌 → 查 FALLBACK_ICONS 内联兜底（仅 douyin）
 *   5. 未命中 → 返回 null，调用方跳过图标只渲染文字
 *
 * 简名映射的数据来源与许可：
 *   - 线性图标 → lucide（ISC）：github/email/rss，与原内置 SVG 同源，视觉零变化
 *   - 品牌图标 → simple-icons（CC0）：微博在其中的规范名为 sinaweibo
 */
export interface ResolvedIcon {
	/** Iconify 全名（"collection:name"），交给 astro-icon 的 <Icon> 渲染 */
	name?: string;
	/** 标准库未收录品牌的内联 SVG 兜底，调用方 set:html 直出 */
	html?: string;
}

/** 内置简名 → Iconify 全名 */
const NAMED_ICONS: Record<string, string> = {
	github: "lucide:github",
	email: "lucide:mail",
	rss: "lucide:rss",
	qq: "simple-icons:qq",
	wechat: "simple-icons:wechat",
	weibo: "simple-icons:sinaweibo",
	bilibili: "simple-icons:bilibili",
	xiaohongshu: "simple-icons:xiaohongshu",
	x: "simple-icons:x",
	telegram: "simple-icons:telegram",
	youtube: "simple-icons:youtube",
	instagram: "simple-icons:instagram",
	linkedin: "simple-icons:linkedin",
	discord: "simple-icons:discord",
	steam: "simple-icons:steam",
	zhihu: "simple-icons:zhihu",
	gitee: "simple-icons:gitee",
	juejin: "simple-icons:juejin",
	csdn: "simple-icons:csdn",
};

/** 常用别名 → 规范名（如微信拼音/旧称） */
const ALIASES: Record<string, string> = { weixin: "wechat", twitter: "x" };

// simple-icons 未收录抖音官方形（tiktok 为国际版），保留 CC0 单色内联兜底；
// 上游收录后可将该条并入 NAMED_ICONS
const FALLBACK_ICONS: Record<string, string> = {
	douyin:
		'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02c.08 1.53.63 3.09 1.75 4.17c1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97c-.57-.26-1.1-.59-1.62-.93c-.01 2.92.01 5.84-.02 8.75c-.08 1.4-.54 2.79-1.35 3.94c-1.31 1.92-3.58 3.17-5.91 3.21c-1.43.08-2.86-.31-4.08-1.03c-2.02-1.19-3.44-3.37-3.65-5.71c-.02-.5-.03-1-.01-1.49c.18-1.9 1.12-3.72 2.58-4.96c1.66-1.44 3.98-2.13 6.15-1.72c.02 1.48-.04 2.96-.04 4.44c-.99-.32-2.15-.23-3.02.37c-.63.41-1.11 1.04-1.36 1.75c-.21.51-.15 1.07-.14 1.61c.24 1.64 1.82 3.02 3.5 2.87c1.12-.01 2.19-.66 2.77-1.61c.19-.33.4-.67.41-1.06c.1-1.79.06-3.57.07-5.36c.01-4.03-.01-8.05.02-12.07"/></svg>',
};

/**
 * 按图标名解析（§4.59/§4.65）：trim + 小写 + 别名归一，
 * 命中返回 { name }（Iconify 全名）或 { html }（内联兜底），
 * 未命中返回 null（调用方跳过图标、只渲染文字）。
 */
export function resolveThemeIcon(raw: string): ResolvedIcon | null {
	const key = raw.trim().toLowerCase();
	if (!key) return null;
	// Iconify 全名直接透传（扩展点）
	if (key.includes(":")) return { name: key };
	const canonical = ALIASES[key] ?? key;
	if (NAMED_ICONS[canonical]) return { name: NAMED_ICONS[canonical] };
	if (FALLBACK_ICONS[canonical]) return { html: FALLBACK_ICONS[canonical] };
	return null;
}
