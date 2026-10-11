#!/usr/bin/env node
/**
 * 字体子集化脚本（M4-3，移植自 orchid-blog/scripts/subset-fonts.ts）
 *
 * astro build 之后运行：扫描 dist/ 全部 HTML 收集实际用到的字符，
 * 为 subset-fonts.json 清单中声明的本地字体生成 woff2 子集，
 * 重写 dist 内 CSS/HTML 对原字体的 url()/href 引用，并删除 dist 中的原字体。
 * 相比原版的改动：原版靠 __SUBSET_FONT_{id}__ 占位符替换，但源码中并无
 * 占位符生成方（半成品机制）；本版直接重写原字体 URL，配合站点自写的
 * @font-face 即可端到端生效，且不再依赖 Astro Font API 与站点 src/config。
 *
 * 运行：pnpm --filter site build 内链（cwd 必须是 site 根）
 * 清单：site 根 subset-fonts.json（可选）：
 *   { "fonts": [{ "src": "/assets/fonts/Foo.ttf", "id": "foo", "extraChars": "…" }] }
 *   - src 必填：dist 绝对路径（/ 开头），也兼容 ./public/ 前缀写法
 *   - id 选填：默认取文件名；extraChars 选填：补充动态内容字符
 * 无清单或清单为空时跳过（exit 0），CI 无需感知。
 * dev 模式不受影响：dev 直接走 public 原字体，仅构建产物被子集化。
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

const DIST_DIR = "dist";
const MANIFEST_FILE = "subset-fonts.json";

/** 与 generate-lqips.mjs 一致：目录递归替代 glob 依赖 */
async function walkFiles(dir, exts, out = []) {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await walkFiles(full, exts, out);
		} else if (exts.has(path.extname(entry.name).toLowerCase())) {
			out.push(full);
		}
	}
	return out;
}

/**
 * 将清单 src 归一为 dist 绝对 URL（/ 开头）。
 * 兼容 ./public/x、public/x、/public/x、/x 四种写法；无法归一返回 null。
 */
function toPublicPath(rawSrc) {
	if (rawSrc.startsWith("/")) {
		const m = rawSrc.match(/^\/public\/(.+)$/);
		return m ? `/${m[1]}` : rawSrc;
	}
	const m = rawSrc.match(/^\.?\/?public\/(.+)$/);
	return m ? `/${m[1]}` : null;
}

/**
 * 从 HTML 提取可见文本：剔除 script/style，剥标签，
 * 解常见实体，另收 alt/title/aria-label/placeholder 属性值（移植原版）
 */
function extractTextFromHtml(html) {
	let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
	text = text.replace(/<[^>]+>/g, " ");
	text = text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");
	const attrs = html.matchAll(
		/(?:alt|title|aria-label|placeholder)=["']([^"']+)["']/gi,
	);
	for (const m of attrs) text += m[1];
	return text;
}

async function collectChars(distDir) {
	const files = await walkFiles(distDir, new Set([".html"]));
	const chars = new Set();
	for (const file of files) {
		const html = await fs.readFile(file, "utf-8");
		for (const c of extractTextFromHtml(html)) chars.add(c);
	}
	return [...chars].join("");
}

function contentHash(buffer) {
	return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

/** 生成 url(...) 与 href/src 属性两种引用形态的重写规则 */
function rewriteReferences(content, originalUrl, subsetUrl) {
	const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const urlRe = new RegExp(`url\\(\\s*(['"]?)${escaped}\\1\\s*\\)`, "g");
	const attrRe = new RegExp(`((?:href|src)=['"])${escaped}(['"])`, "g");
	return content
		.replace(urlRe, `url($1${subsetUrl}$1)`)
		.replace(attrRe, `$1${subsetUrl}$2`);
}

async function main() {
	const cwd = process.cwd();
	const distDir = path.join(cwd, DIST_DIR);

	// 1. 读清单；无清单/空清单 → no-op 跳过
	let manifest;
	try {
		manifest = JSON.parse(
			await fs.readFile(path.join(cwd, MANIFEST_FILE), "utf-8"),
		);
	} catch {
		console.log("[subset-fonts] 无 subset-fonts.json 清单，跳过（exit 0）");
		return;
	}
	const entries = (manifest.fonts ?? [])
		.map((e) => {
			const publicUrl = toPublicPath(e.src ?? "");
			if (!publicUrl) {
				console.warn(
					`[subset-fonts] ⚠ 无法归一 src 路径，跳过：${e.src}（需 /assets/... 或 public/ 前缀）`,
				);
				return null;
			}
			const id = (e.id || path.basename(publicUrl, path.extname(publicUrl)))
				.toLowerCase()
				.replace(/\s+/g, "-");
			return { id, url: publicUrl, extraChars: e.extraChars ?? "" };
		})
		.filter(Boolean);

	if (entries.length === 0) {
		console.log("[subset-fonts] 清单为空，跳过（exit 0）");
		return;
	}

	// 2. 收集 dist 页面实际字符
	console.log("[subset-fonts] 扫描 dist/ HTML 收集字符…");
	const pageChars = await collectChars(distDir);
	if (pageChars.length === 0) {
		console.warn("[subset-fonts] ⚠ dist/ 无 HTML 或无字符，跳过");
		return;
	}
	console.log(`[subset-fonts] 收集到 ${pageChars.length} 个去重字符`);

	// 3. 逐字体生成子集
	const outDir = path.join(distDir, "assets", "fonts");
	await fs.mkdir(outDir, { recursive: true });
	const results = [];
	for (const entry of entries) {
		const originalPath = path.join(distDir, entry.url.slice(1));
		let fontBuffer;
		try {
			fontBuffer = await fs.readFile(originalPath);
		} catch {
			console.error(
				`[subset-fonts] ❌ dist 中未找到字体 ${entry.url}（确认已在 public/ 放置并参与构建）`,
			);
			continue;
		}

		const charSet = new Set([...pageChars, ...entry.extraChars]);
		const chars = [...charSet].join("");
		try {
			const subsetBuffer = await subsetFont(fontBuffer, chars, {
				targetFormat: "woff2",
				preserveNameTable: true,
			});
			const hash = contentHash(subsetBuffer);
			const outName = `${entry.id}.${hash}.woff2`;
			await fs.writeFile(path.join(outDir, outName), subsetBuffer);

			const kb = (n) => (n / 1024).toFixed(1);
			const saved = (
				((fontBuffer.length - subsetBuffer.length) / fontBuffer.length) *
				100
			).toFixed(1);
			console.log(
				`[subset-fonts] ✔ ${entry.id} → ${outName}（${kb(subsetBuffer.length)} KB，原 ${kb(fontBuffer.length)} KB，省 ${saved}%）`,
			);
			results.push({ ...entry, outName });
		} catch (err) {
			console.error(`[subset-fonts] ❌ ${entry.id} 子集化失败:`, err);
		}
	}
	if (results.length === 0) {
		console.warn("[subset-fonts] ⚠ 未产出任何子集");
		return;
	}

	// 4. 重写 dist 内 CSS/HTML 引用（url() 与 href/src 属性）
	console.log("[subset-fonts] 重写 dist 内字体引用…");
	const targets = await walkFiles(distDir, new Set([".css", ".html"]));
	for (const file of targets) {
		let content = await fs.readFile(file, "utf-8");
		const before = content;
		for (const r of results) {
			content = rewriteReferences(content, r.url, `/assets/fonts/${r.outName}`);
		}
		if (content !== before) {
			await fs.writeFile(file, content);
			console.log(`[subset-fonts] ✔ 已更新 ${path.relative(cwd, file)}`);
		}
	}

	// 5. 删除 dist 中的原字体（public 源文件保留，dev 仍走原字体）
	for (const r of results) {
		const originalPath = path.join(distDir, r.url.slice(1));
		try {
			await fs.unlink(originalPath);
			console.log(
				`[subset-fonts] ✔ 已删除 ${path.relative(cwd, originalPath)}`,
			);
		} catch {
			// 原文件可能已不在 dist，忽略
		}
	}
	console.log("[subset-fonts] ✨ 字体子集化完成");
}

main().catch((err) => {
	console.error("[subset-fonts] ❌ 执行失败:", err);
	process.exit(1);
});
