import config from "virtual:theme/config";

/**
 * 格式化为 YYYY-MM-DD（§4.30：配置 timezone 时经 Intl timeZone 指定，与构建机时区解耦；
 * 未配置跟随本地时区，避免 toISOString 的 UTC 偏移）
 */
export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: config.timezone || undefined,
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
		/** 专题名（§4.31）：同专题文章聚合到 /series/<name>/ */
		series?: string;
		/** 专题内顺序（小在前）；未配置则按发布时间升序 */
		seriesOrder?: number;
		/** 专题内分组（§4.75）：专题页/专题目录按组分块展示 */
		seriesGroup?: string;
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

/** 专题内排序比较器：seriesOrder 升序（未配置排最后），同序按发布时间升序 */
function compareSeriesOrder<T extends PostLike>(a: T, b: T): number {
	const oa = a.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
	const ob = b.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
	if (oa !== ob) return oa - ob;
	return a.data.published.getTime() - b.data.published.getTime();
}

/** 专题渲染序列条目：groupHead 非空 = 该条目是新分块首条，值为组名（未分组块无头） */
export interface SeriesEntry<T> {
	post: T;
	/** 全局序号（0 起，贯穿分块连续编号） */
	index: number;
	groupHead: string | null;
}

/**
 * 专题分块序列（§4.75）：按 seriesOrder 排序后分块规范化——
 * 未分组文章为最前块，各分组（seriesGroup 非空）按组内首篇顺序依次排列。
 * 同组文章 seriesOrder 不连续时自动归拢，不依赖作者保证组内连续。
 * 序号贯穿所有分块连续递增，供专题页与文章页专题目录共用。
 */
export function seriesEntries<T extends PostLike>(
	posts: T[],
): SeriesEntry<T>[] {
	const sorted = [...posts].sort(compareSeriesOrder);
	const entries: SeriesEntry<T>[] = [];
	const groups = new Map<string, T[]>();
	for (const post of sorted) {
		const group = post.data.seriesGroup;
		if (!group) {
			entries.push({ post, index: entries.length, groupHead: null });
			continue;
		}
		const list = groups.get(group);
		if (list) list.push(post);
		else groups.set(group, [post]);
	}
	for (const [group, list] of groups) {
		for (const post of list) {
			entries.push({
				post,
				index: entries.length,
				groupHead: post === list[0] ? group : null,
			});
		}
	}
	return entries;
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

/* ---------- 随机封面（§4.33） ---------- */

/**
 * Java String.hashCode 同款散列：同 slug 跨构建/跨设备稳定，
 * 作为随机封面的确定性 seed（对齐 orchid-blog getSeedHash）。
 */
export function seedHash(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++)
		h = ((h << 5) - h + str.charCodeAt(i)) | 0;
	return Math.abs(h);
}

/** 把 seed 拼进 URL（已有 query 用 &，否则 ?），同 URL 每次构建请求同图 */
export function appendSeedParam(url: string, hash: number): string {
	return `${url}${url.includes("?") ? "&" : "?"}v=${hash}`;
}

/**
 * 随机封面单条 URL：{slug} 占位符替换为文章 id，再追加 ?v=<hash>。
 * 同 slug 的/apis[i] 输出恒定 → 列表页与文章页、多次构建之间图片一致。
 */
export function randomCoverUrl(template: string, slug: string): string {
	const withSlug = template.includes("{slug}")
		? template.replaceAll("{slug}", slug)
		: template;
	return appendSeedParam(withSlug, seedHash(slug));
}

/**
 * 解析文章封面（§4.33）：frontmatter image 为 "api" 且配置了图源时，
 * 返回 { cover, retries }——cover 按 slug 确定性轮转选一条（§4.113，
 * 支持本地图片列表做多源随机；单图源退化为恒取第一条，行为不变），
 * retries 为客户端加载失败时的依次重试列表（其余图源 + fallbackCover 兜底）。
 * 非 "api" 或未配置图源时原样返回，行为与之前一致。
 */
export function resolveCover(
	image: string | undefined,
	firstImage: string | undefined,
	fallbackCover: string | undefined,
	apis: string[],
	slug: string,
): { cover: string | undefined; retries: string[] | undefined } {
	if (image !== "api" || apis.length === 0) {
		return { cover: image || firstImage || fallbackCover, retries: undefined };
	}
	const urls = apis.map((u) => randomCoverUrl(u, slug));
	const idx = seedHash(slug) % urls.length;
	const retries = [...urls.slice(idx + 1), ...urls.slice(0, idx)];
	if (fallbackCover) retries.push(fallbackCover);
	return { cover: urls[idx], retries };
}
