#!/usr/bin/env node
/**
 * 文章迁移工具（§4.94）：把 Hexo / Hugo 或通用 Markdown 博客文章迁移为符合
 * 主题 definePostSchema 的 frontmatter（title/published 必需，其余尽力映射），
 * 正文一字不动；默认 dry-run 只出报告，--write 才写盘。
 *
 * 用法（站点根目录）：
 *   node node_modules/@windcoder/astro-theme-orchid/scripts/migrate-posts.mjs \
 *     --src <文章目录> [--platform hexo|hugo|generic] [--out migrated-posts] \
 *     [--write] [--flat]
 *
 * 规则：
 *   - 只迁移 frontmatter。主题无 <!-- more --> 摘要分隔符机制，列表摘要由
 *     remark-excerpt 取正文首段自动兜底，无需转换。
 *   - 标题三级回退：frontmatter → 正文首个 `# 标题` → 文件名；
 *     发布时间缺失时用文件修改时间兜底。
 *   - 白名单之外的 frontmatter 字段不写入目标，仅在报告中列出，便于人工核对。
 *   - 正文中的相对路径图片在报告中提示：目录结构调整后需人工核对引用。
 *   - 输出文件名取自源文件名（Hugo 优先 slug 字段），冲突自动加 -2/-3 序号；
 *     默认保留相对目录结构，--flat 拍平到输出根目录。
 */
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";

const pad2 = (n) => String(n).padStart(2, "0");

function parseArgs(argv) {
	const args = {
		src: "",
		platform: "generic",
		out: "migrated-posts",
		write: false,
		flat: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--src") args.src = argv[++i];
		else if (a === "--platform") args.platform = argv[++i] ?? "";
		else if (a === "--out") args.out = argv[++i];
		else if (a === "--write") args.write = true;
		else if (a === "--flat") args.flat = true;
		else if (a === "--help" || a === "-h") {
			console.log(
				"用法：node migrate-posts.mjs --src <文章目录> [--platform hexo|hugo|generic] [--out migrated-posts] [--write] [--flat]",
			);
			process.exit(0);
		}
	}
	return args;
}

/** 解析 `---` 界定的 frontmatter；无界定符或 YAML 损坏时 broken/空对象兜底 */
export function parseFrontmatter(raw) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
	if (!m) return { data: {}, body: raw, broken: false };
	let data = {};
	let broken = false;
	try {
		const parsed = parse(m[1]);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			data = parsed;
		} else if (parsed != null) {
			broken = true;
		}
	} catch {
		broken = true;
	}
	return { data, body: raw.slice(m[0].length), broken };
}

/** 日期值归一化为 YAML 友好字符串；非法返回 null。
 *  date-only 原样保留（避免时区漂移），hexo 斜杠格式转 ISO，
 *  带显式时区偏移的 ISO 串直接取墙钟（同理，避免经 Date 本地化漂移），其余 new Date 兜底。 */
export function normalizeDate(value) {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : formatDate(value);
	}
	if (typeof value !== "string") return null;
	const s = value.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	const slash =
		/^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
	if (slash) {
		const date = `${slash[1]}-${slash[2]}-${slash[3]}`;
		return slash[4]
			? `${date}T${pad2(slash[4])}:${slash[5]}:${slash[6] ?? "00"}`
			: date;
	}
	const offseted =
		/^(\d{4}-\d{2}-\d{2})[Tt ](\d{2}:\d{2})(?::(\d{2}))?(?:\.\d+)?(?:[Zz]|[+-]\d{2}:?\d{2})$/.exec(
			s,
		);
	if (offseted) return `${offseted[1]}T${offseted[2]}:${offseted[3] ?? "00"}`;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : formatDate(d);
}

/** Date → 本地时分秒格式：零点只写日期，其余带 T 时间（无时区后缀，保墙钟） */
export function formatDate(d) {
	const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
	const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
	return time === "00:00:00" ? date : `${date}T${time}`;
}

/** 任意嵌套结构拍平成非空字符串数组（hexo categories 可能是嵌套数组） */
function flattenStrings(value) {
	if (value == null) return [];
	if (Array.isArray(value)) return value.flatMap(flattenStrings);
	const s = String(value).trim();
	return s ? [s] : [];
}

/** 标题三级回退：frontmatter → 正文首个 `# 标题` → 文件名 */
export function resolveTitle(data, body, fallback) {
	const t = data.title;
	if (typeof t === "string" && t.trim()) {
		return { title: t.trim(), from: "frontmatter" };
	}
	if (typeof t === "number") return { title: String(t), from: "frontmatter" };
	const m = /^[ \t]*#[ \t]+(.+?)[ \t]*$/m.exec(body);
	if (m) {
		return { title: m[1].replace(/[#*`_]/g, "").trim(), from: "heading" };
	}
	return { title: fallback, from: "filename" };
}

/** 文件名净化：空白转 -，剔除文件系统不安全字符，空值兜底 "post"（保留中文） */
export function toSlug(name) {
	const slug = name
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[/\\:*?"<>|\p{Cc}]/gu, "")
		.replace(/^[.-]+|[.-]+$/g, "");
	return slug || "post";
}

/** 正文里的相对路径图片（不含 http(s)://、//、/、data: 开头） */
export function findRelativeImages(body) {
	const out = [];
	const re = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img[^>]+src=["']([^"']+)["']/g;
	for (const m of body.matchAll(re)) {
		const url = m[1] ?? m[2];
		if (
			!url.startsWith("/") &&
			!url.startsWith("data:") &&
			!url.startsWith("#") &&
			!/^(https?:)?\/\//.test(url)
		) {
			out.push(url);
		}
	}
	return out;
}

/**
 * 按平台把源 frontmatter 映射为目标白名单字段（键序固定）。
 * 白名单外与未消费的源键进 notes，不写入目标。
 */
export function mapFrontmatter(data, platform) {
	const notes = [];
	const used = new Set();
	/** 取第一个有值的键；候选键一律记为已消费（不进未映射报告） */
	const take = (...keys) => {
		let hit;
		for (const k of keys) {
			const v = data[k];
			if (hit === undefined && v !== undefined && v !== null && v !== "") {
				hit = v;
			}
			used.add(k);
		}
		return hit;
	};

	const fm = {};
	const title = take("title");
	if (title !== undefined) fm.title = String(title);

	const description = take("description", "summary", "excerpt");
	if (description !== undefined) fm.description = String(description);

	const rawPublished =
		platform === "generic"
			? take("published", "date", "created")
			: take("date", "publishDate");
	const published = normalizeDate(rawPublished);
	if (published) fm.published = published;

	const rawUpdated =
		platform === "hugo"
			? take("lastmod", "updated")
			: take("updated", "modified", "lastmod");
	const updated = normalizeDate(rawUpdated);
	if (updated) fm.updated = updated;

	if (platform === "hexo") {
		const p = take("published");
		if (p === false || p === "false") fm.draft = true;
	} else {
		const d = take("draft");
		if (d === true || d === "true") fm.draft = true;
	}

	let image;
	if (platform === "hexo") {
		image = take("cover", "image") ?? flattenStrings(take("photos"))[0];
	} else if (platform === "hugo") {
		image = take("image", "cover") ?? flattenStrings(take("images"))[0];
	} else {
		image = take("cover", "image", "banner", "thumbnail");
	}
	if (image !== undefined && image !== "") fm.image = String(image);

	const tags = flattenStrings(take("tags"));
	if (tags.length) fm.tags = tags;

	const categories = flattenStrings(take("category", "categories"));
	if (categories.length) fm.category = categories[0];

	// hugo slug 供输出文件名用（见 migrateFile），标记已消费避免误报
	if (platform === "hugo") take("slug");

	const unmapped = Object.keys(data).filter((k) => !used.has(k));
	if (unmapped.length) {
		notes.push(`未映射字段：${unmapped.join("、")}（未写入目标）`);
	}
	return { fm, notes };
}

/** 递归收集 src 下 .md/.markdown，返回 posix 分隔符的相对路径（排序稳定） */
export function scanMarkdownFiles(srcDir) {
	const out = [];
	function walk(dir) {
		for (const ent of readdirSync(dir, { withFileTypes: true })) {
			const abs = join(dir, ent.name);
			if (ent.isDirectory()) walk(abs);
			else if (ent.isFile() && /\.(md|markdown)$/i.test(ent.name)) {
				out.push(relative(srcDir, abs).replace(/\\/g, "/"));
			}
		}
	}
	walk(srcDir);
	return out.sort();
}

/** 迁移单篇：映射 frontmatter + 兜底补齐 + 生成输出路径与文件内容 */
export function migrateFile({ rel, raw, platform, mtimeMs, usedSlugs, flat }) {
	const notes = [];
	const { data, body, broken } = parseFrontmatter(raw);
	if (broken) notes.push("frontmatter 解析失败，已按无元数据处理");

	const { fm, notes: mapNotes } = mapFrontmatter(data, platform);
	notes.push(...mapNotes);

	const base = basename(rel).replace(/\.(md|markdown)$/i, "");
	const title = resolveTitle(data, body, base);
	fm.title = title.title;
	if (title.from === "heading") notes.push("标题缺失，已取正文首个一级标题");
	else if (title.from === "filename") notes.push("标题缺失，已使用文件名");

	if (!fm.published) {
		fm.published = formatDate(new Date(mtimeMs));
		notes.push("发布时间缺失，已用文件修改时间兜底");
	}

	for (const img of new Set(findRelativeImages(body))) {
		notes.push(`正文含相对路径图片：${img}（目录调整后需人工核对）`);
	}

	const slugSource =
		platform === "hugo" && typeof data.slug === "string" && data.slug.trim()
			? data.slug.trim()
			: base;
	const slug = toSlug(slugSource);
	const dir =
		flat || dirname(rel) === "." ? "" : `${dirname(rel).replace(/\\/g, "/")}/`;
	let relOut = `${dir}${slug}.md`;
	for (let n = 2; usedSlugs.has(relOut); n++) relOut = `${dir}${slug}-${n}.md`;
	usedSlugs.add(relOut);

	const content = `---\n${stringify(fm)}---\n\n${body.replace(/^\r?\n+/, "")}`;
	return { relOut, fm, content, notes };
}

/** 迁移整目录：write 为 false 时只生成报告不落盘 */
export function runMigration({
	src,
	out,
	platform,
	write = false,
	flat = false,
}) {
	const usedSlugs = new Set();
	const results = [];
	for (const rel of scanMarkdownFiles(src)) {
		const abs = join(src, rel);
		const { mtimeMs } = statSync(abs);
		const r = migrateFile({
			rel,
			raw: readFileSync(abs, "utf8"),
			platform,
			mtimeMs,
			usedSlugs,
			flat,
		});
		if (write) {
			const absOut = resolve(out, r.relOut);
			mkdirSync(dirname(absOut), {
				recursive: true,
			});
			writeFileSync(absOut, r.content);
		}
		results.push({ source: rel, output: r.relOut, notes: r.notes });
	}
	return { platform, total: results.length, write, results };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.src) {
		console.error(
			"[migrate-posts] 缺少 --src <文章目录>。加 --help 查看用法。",
		);
		process.exit(1);
	}
	if (!["hexo", "hugo", "generic"].includes(args.platform)) {
		console.error(
			`[migrate-posts] 未知 --platform ${args.platform}，可选 hexo | hugo | generic。`,
		);
		process.exit(1);
	}
	const src = resolve(args.src);
	try {
		if (!scanMarkdownFiles(src).length) {
			console.log(
				`[migrate-posts] ${src} 下没有 .md / .markdown 文件，无事可做。`,
			);
			process.exit(0);
		}
	} catch {
		console.error(`[migrate-posts] 无法读取目录 ${src}，请确认路径。`);
		process.exit(1);
	}

	console.log(
		`[migrate-posts] 平台 ${args.platform}，输出 ${resolve(args.out)}${args.write ? "" : "（dry-run 预览，不会写盘）"}\n`,
	);

	const report = runMigration({ ...args, src });
	for (const f of report.results) {
		console.log(`  ${f.source}  →  ${f.output}`);
		for (const n of f.notes) console.log(`      ⚠ ${n}`);
	}

	const noted = report.results.filter((f) => f.notes.length).length;
	console.log(
		`\n[migrate-posts] 完成：${report.total} 篇，${noted} 篇有提示${
			args.write
				? `，已写入 ${resolve(args.out)}`
				: "。确认无误后加 --write 落盘"
		}`,
	);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	main();
}
