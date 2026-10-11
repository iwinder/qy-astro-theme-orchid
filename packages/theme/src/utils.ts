/** 格式化为 YYYY-MM-DD（跟随本地时区，避免 toISOString 的 UTC 偏移） */
export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

/** 文章最小结构约束：兼容站点内 CollectionEntry<'posts'> 与主题内部中间结果 */
export interface PostLike {
	id: string;
	body?: string;
	data: {
		title: string;
		description: string;
		published: Date;
		updated?: Date;
		draft: boolean;
		pinned: boolean;
		image?: string;
		tags: string[];
		category?: string;
		/** 加密文章：非空即视为加密（列表锁标 / 正文条件加密 / 评论 TOC 规避） */
		password?: string;
		/** 加密提示（仅展示，不参与解密） */
		passwordHint?: string;
		/** remark 插件注入：摘要 / 首图 / 字数 / 阅读时长 */
		excerpt?: string;
		firstImage?: string;
		words?: number;
		minutes?: number;
		cardStyle?: "cover" | "compact" | "text";
	};
}

/**
 * hex（#rrggbb）转 HSL，用于构建期把 accentColor 注入 --accent-h/s/l。
 * 例：#4a9d8f → { h: 170, s: 36, l: 45 }
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const m = hex.replace("#", "");
	const r = parseInt(m.slice(0, 2), 16) / 255;
	const g = parseInt(m.slice(2, 4), 16) / 255;
	const b = parseInt(m.slice(4, 6), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	if (max !== min) {
		const d = max - min;
		s = d / (1 - Math.abs(2 * l - 1));
		switch (max) {
			case r:
				h = 60 * (((g - b) / d) % 6);
				break;
			case g:
				h = 60 * ((b - r) / d + 2);
				break;
			default:
				h = 60 * ((r - g) / d + 4);
		}
	}
	return {
		h: Math.round((h + 360) % 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

/** 过滤草稿并排序：置顶优先，其余按发布时间倒序 */
export function getSortedPosts<T extends PostLike>(posts: T[]): T[] {
	return posts
		.filter((p) => !p.data.draft)
		.sort((a, b) => {
			if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
			return b.data.published.getTime() - a.data.published.getTime();
		});
}

/** 按标签聚合：Map<标签名, 文章[]>，标签按文章数降序 */
export function collectTags<T extends PostLike>(posts: T[]): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			const list = map.get(tag);
			if (list) list.push(post);
			else map.set(tag, [post]);
		}
	}
	return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
}

/** 按分类聚合：Map<分类名, 文章[]>，分类按文章数降序（无分类文章不参与） */
export function collectCategories<T extends PostLike>(
	posts: T[],
): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const post of posts) {
		const cat = post.data.category;
		if (!cat) continue;
		const list = map.get(cat);
		if (list) list.push(post);
		else map.set(cat, [post]);
	}
	return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
}

/** XML/RSS 文本转义 */
export function xmlEscape(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** 计算整站已发布文章总字数（站点信息卡「共 N 字」用） */
export function countTotalWords(posts: PostLike[]): number {
	return posts.reduce((sum, p) => sum + (p.data.words ?? 0), 0);
}

/** 建站至今天数（since: YYYY-MM-DD） */
export function daysSince(since: string): number {
	const start = new Date(`${since}T00:00:00`);
	if (Number.isNaN(start.getTime())) return 0;
	return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}
