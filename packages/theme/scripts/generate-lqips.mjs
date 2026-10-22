#!/usr/bin/env node
/**
 * LQIP + 缩略图生成脚本（M3b-b9，P1-14；§4.106 扩展双产物；§4.107 外链 LQIP）：
 * 产出两份构建期元数据：
 * 1. lqips.json：每张采样 2×2 像素取三色 → 18 字符 compact hex（三段 rgb hex 拼接）。
 *    两类键：`public:<posix 相对路径>`（站点 public 图片）+ `url:<完整外链 URL>`
 *    （文章封面/正文首图/相册 urls.txt 等外链图，fetch 下载后同样采样——
 *    缓存即产物自身：已有 url: 键不重复抓取，`--refresh` 强制重抓）。
 * 2. thumbs.json：每张 public 图同步生成同目录 `<名>.thumb.webp`（480 宽 q75，
 *    不放大小图），并记录原图宽高（灯箱打开原图时需正确原始尺寸）。
 *    外链图不做缩略图（版权/CORS/构建网络依赖，消费端回退原图）。
 *
 * 运行：pnpm --filter site lqip（cwd 必须是 site 根）
 * 消费链路：
 *   lqips.json  → themeLqipsPlugin（vite.ts）→ virtual:theme/lqips
 *     → utils/lqip.ts getLqipStyle() / rehypeImageEnhance() → 构建期内联渐变；
 *   thumbs.json → themeLqipsPlugin（vite.ts）→ virtual:theme/thumbs
 *     → utils/thumb.ts getThumbInfo() → 列表封面构建期换缩略图 URL。
 *
 * 外键一致性约定：url: 键的 URL 必须与渲染期逐字符一致——
 *   - frontmatter image / 正文首图 / urls.txt 行：原样提取（与 gallery.ts 的
 *     trim + `#` 注释过滤规则相同）；
 *   - image:"api"：复刻 utils.ts 的 randomCoverUrl（seedHash + ?v= 追加），
 *     apis 模板从 site/src/config/*.ts 正则提取首个 apis 数组。
 * 相册「显式外链 cover」（相册元数据字段）暂不收集：demo 站无此用法，
 * 且元数据格式多样，出现需求时再扩展。sharp 经本脚本位置解析 theme 依赖。
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const cwd = process.cwd();
const publicDir = path.join(cwd, "public");
const srcDir = path.join(cwd, "src");
const lqipFile = path.join(cwd, "lqips.json");
const thumbsFile = path.join(cwd, "thumbs.json");

const THUMB_WIDTH = 480;
const THUMB_QUALITY = 75;
const THUMB_SUFFIX = ".thumb.webp";
const FETCH_CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 15_000;
const REFRESH = process.argv.includes("--refresh");

const EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const EXCLUDED_DIRS = new Set(["node_modules", ".astro", "dist", ".git"]);

if (!fs.existsSync(publicDir)) {
	console.error(`[lqip] 未找到 ${publicDir}，请在 site 根目录运行本脚本`);
	process.exit(1);
}

/** 递归收集图片相对路径（posix 风格，排除构建/依赖目录与缩略图产物） */
function collectImages(dir, base = "") {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name)) continue;
			out.push(
				...collectImages(
					path.join(dir, entry.name),
					base ? `${base}/${entry.name}` : entry.name,
				),
			);
		} else if (
			EXTS.has(path.extname(entry.name).toLowerCase()) &&
			!entry.name.endsWith(THUMB_SUFFIX)
		) {
			out.push(base ? `${base}/${entry.name}` : entry.name);
		}
	}
	return out;
}

/** sharp 2×2 fill 采样 → 取 [0][1][3] 三像素（左上/右上/右下）rgb hex 拼接 */
async function sampleColors(input) {
	const { data, info } = await sharp(input)
		.resize(2, 2, { fit: "fill" })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const hex = (i) => {
		const o = i * info.channels;
		return [data[o], data[o + 1], data[o + 2]]
			.map((v) => v.toString(16).padStart(2, "0"))
			.join("");
	};
	return hex(0) + hex(1) + hex(3);
}

/** 生成 480 宽 webp 缩略图（不放大小图），返回 { thumb 相对路径, 原图宽高 } */
async function makeThumb(rel) {
	const file = path.join(publicDir, rel);
	const parsed = path.parse(rel);
	const thumbRel = path.posix.format({
		dir: parsed.dir,
		name: `${parsed.name}.thumb`,
		ext: ".webp",
	});
	const meta = await sharp(file).metadata();
	await sharp(file)
		.resize({ width: THUMB_WIDTH, withoutEnlargement: true })
		.webp({ quality: THUMB_QUALITY })
		.toFile(path.join(publicDir, thumbRel));
	return {
		thumb: thumbRel,
		width: meta.width ?? 0,
		height: meta.height ?? 0,
	};
}

// ---------- 外链 URL 收集（§4.107） ----------

/** 复刻 utils.ts seedHash（Java String.hashCode 同款），保证与渲染期键一致 */
function seedHash(str) {
	let h = 0;
	for (let i = 0; i < str.length; i++)
		h = ((h << 5) - h + str.charCodeAt(i)) | 0;
	return Math.abs(h);
}

/** 复刻 utils.ts randomCoverUrl：{slug} 替换 + ?v=<hash>（有 query 用 &） */
function randomCoverUrl(template, slug) {
	const withSlug = template.includes("{slug}")
		? template.replaceAll("{slug}", slug)
		: template;
	return `${withSlug}${withSlug.includes("?") ? "&" : "?"}v=${seedHash(slug)}`;
}

/** 从 site/src/config/*.ts 正则提取首个 randomCover.apis 模板（提取不到返回 null） */
function getApiTemplate() {
	const configDir = path.join(srcDir, "config");
	if (!fs.existsSync(configDir)) return null;
	for (const name of fs.readdirSync(configDir).sort()) {
		if (!/\.(m|c)?(ts|js)$/.test(name)) continue;
		const text = fs.readFileSync(path.join(configDir, name), "utf8");
		const apis = text.match(/apis:\s*\[([^\]]*)\]/);
		if (apis) {
			const url = apis[1].match(/["']([^"']+)["']/);
			if (url) return url[1];
		}
	}
	return null;
}

/** 正文首个外链图 URL：跳过 ```/~~~ 围栏代码块，md 图片语法或 <img> 均可 */
function extractFirstImage(body) {
	let inFence = false;
	for (const line of body.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		let m = line.match(/!\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)/);
		if (m) return m[1];
		m = line.match(/<img[^>]*\ssrc=["'](https?:\/\/[^"']+)["']/i);
		if (m) return m[1];
	}
	return null;
}

/** 收集外链图片 URL：文章 frontmatter image（含 api 确定性解析）+ 正文首图 + 相册 urls.txt */
function collectRemoteUrls() {
	const urls = new Set();
	const apiTemplate = getApiTemplate();
	const postsDir = path.join(srcDir, "content", "posts");
	if (fs.existsSync(postsDir)) {
		const walkMd = (dir) => {
			const out = [];
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				if (entry.isDirectory()) out.push(...walkMd(path.join(dir, entry.name)));
				else if (/\.(md|mdx)$/i.test(entry.name)) out.push(path.join(dir, entry.name));
			}
			return out;
		};
		for (const file of walkMd(postsDir)) {
			const text = fs.readFileSync(file, "utf8");
			const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
			let image;
			if (fm) {
				const im = fm[1].match(/^image:\s*["']?([^"'\n]+?)["']?\s*$/m);
				if (im) image = im[1].trim();
			}
			if (image && image !== "api" && /^https?:\/\//.test(image)) {
				urls.add(image);
			} else if (image === "api" && apiTemplate) {
				const slug = path.basename(file).replace(/\.(md|mdx)$/i, "");
				urls.add(randomCoverUrl(apiTemplate, slug));
			}
			// 正文首图（无封面文章它是列表封面；有封面文章供正文增强查表）
			const body = fm ? text.slice(fm[0].length) : text;
			const first = extractFirstImage(body);
			if (first) urls.add(first);
		}
	}
	const galleryDir = path.join(publicDir, "gallery");
	if (fs.existsSync(galleryDir)) {
		for (const entry of fs.readdirSync(galleryDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const urlsFile = path.join(galleryDir, entry.name, "urls.txt");
			if (!fs.existsSync(urlsFile)) continue;
			for (const line of fs.readFileSync(urlsFile, "utf-8").split("\n")) {
				const u = line.trim();
				if (u && !u.startsWith("#") && /^https?:\/\//.test(u)) urls.add(u);
			}
		}
	}
	return [...urls];
}

/** fetch 外链图 → sharp 采样（超时/非 2xx 抛错由调用方跳过） */
async function fetchSample(url) {
	const res = await fetch(url, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		headers: { "user-agent": "orchid-theme-lqip/1.0" },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return sampleColors(Buffer.from(await res.arrayBuffer()));
}

/** 固定并发的小任务池（保持顺序写 out） */
async function mapPool(items, limit, fn) {
	const out = new Array(items.length);
	let i = 0;
	async function worker() {
		while (i < items.length) {
			const idx = i++;
			try {
				out[idx] = await fn(items[idx]);
			} catch (err) {
				console.warn(`[lqip] 外链抓取失败，跳过: ${items[idx]} — ${err.message}`);
			}
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, () => worker()),
	);
	return out;
}

try {
	// public 图片：LQIP + 缩略图（照旧重算，public 内容变了要跟上）
	const files = collectImages(publicDir);
	const lqipEntries = [];
	const thumbEntries = [];
	for (const rel of files) {
		lqipEntries.push([
			`public:${rel}`,
			await sampleColors(path.join(publicDir, rel)),
		]);
		thumbEntries.push([`public:${rel}`, await makeThumb(rel)]);
	}

	// 外链：lqips.json 已有 url: 键即缓存，只抓缺失项
	let cached = {};
	if (!REFRESH) {
		try {
			cached = Object.fromEntries(
				Object.entries(JSON.parse(fs.readFileSync(lqipFile, "utf8"))).filter(
					([k, v]) => k.startsWith("url:") && /^[0-9a-f]{18}$/i.test(v),
				),
			);
		} catch {
			cached = {};
		}
	}
	const remoteUrls = collectRemoteUrls();
	const pending = remoteUrls.filter((u) => !(`url:${u}` in cached));
	console.log(
		`[lqip] 外链 ${remoteUrls.length} 条（缓存命中 ${remoteUrls.length - pending.length}，待抓 ${pending.length}）`,
	);
	const fetched = await mapPool(pending, FETCH_CONCURRENCY, async (url) => [
		url,
		await fetchSample(url),
	]);
	// 缓存命中的 url: 键原样合并（否则第二次运行会把它从产物中丢掉）
	for (const [k, v] of Object.entries(cached)) lqipEntries.push([k, v]);
	for (const pair of fetched) {
		if (pair) lqipEntries.push([`url:${pair[0]}`, pair[1]]);
	}

	fs.writeFileSync(
		lqipFile,
		JSON.stringify(Object.fromEntries(lqipEntries), null, 2) + "\n",
	);
	fs.writeFileSync(
		thumbsFile,
		JSON.stringify(Object.fromEntries(thumbEntries), null, 2) + "\n",
	);
	console.log(
		`[lqip] public ${files.length} 张 + 外链 ${remoteUrls.length - pending.length + fetched.filter(Boolean).length} 条 → ${path.relative(cwd, lqipFile)} + ${path.relative(cwd, thumbsFile)}`,
	);
} catch (err) {
	console.error("[lqip] 生成失败：", err);
	process.exit(1);
}
