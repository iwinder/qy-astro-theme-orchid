#!/usr/bin/env node
/**
 * LQIP 生成脚本（M3b-b9，P1-14）：扫描站点 public 下的图片，每张采样
 * 2×2 像素取三色，产出 18 字符 compact hex（三段 rgb hex 拼接），
 * 整体写入站点根 lqips.json（键 → 色，全量重建，增量收益有限故不做）。
 *
 * 运行：pnpm --filter site lqip（cwd 必须是 site 根）
 * 消费链路：lqips.json → themeLqipsPlugin（vite.ts）→ virtual:theme/lqips
 *   → utils/lqip.ts getLqipStyle() → 构建期内联渐变（零客户端请求）。
 *
 * 键约定：`public:<posix 相对路径>`。主题图片一律 public 路径或外链
 * （不用 astro:assets），故无需 src: 键；外链/无数据在消费端自然降级纯色。
 * sharp 经本脚本文件位置解析到 theme 包依赖，与 cwd 无关。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const cwd = process.cwd();
const publicDir = path.join(cwd, "public");
const outFile = path.join(cwd, "lqips.json");

const EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const EXCLUDED_DIRS = new Set(["node_modules", ".astro", "dist", ".git"]);

if (!fs.existsSync(publicDir)) {
	console.error(`[lqip] 未找到 ${publicDir}，请在 site 根目录运行本脚本`);
	process.exit(1);
}

/** 递归收集图片相对路径（posix 风格，排除构建/依赖目录） */
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
		} else if (EXTS.has(path.extname(entry.name).toLowerCase())) {
			out.push(base ? `${base}/${entry.name}` : entry.name);
		}
	}
	return out;
}

/** sharp 2×2 fill 采样 → 取 [0][1][3] 三像素（左上/右上/右下）rgb hex 拼接 */
async function sampleColors(file) {
	const { data, info } = await sharp(file)
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

try {
	const files = collectImages(publicDir);
	const entries = await Promise.all(
		files.map(async (rel) => [
			`public:${rel}`,
			await sampleColors(path.join(publicDir, rel)),
		]),
	);
	fs.writeFileSync(
		outFile,
		JSON.stringify(Object.fromEntries(entries), null, 2) + "\n",
	);
	console.log(`[lqip] ${files.length} 张图片 → ${path.relative(cwd, outFile)}`);
} catch (err) {
	console.error("[lqip] 生成失败：", err);
	process.exit(1);
}
