/**
 * subset-fonts.mjs 集成测试（node:test 内置运行器，零测试依赖）
 *
 * fixture 字体取自主题已有依赖 katex 的分发包（node_modules/katex/dist/fonts），
 * 不向仓库引入二进制。覆盖三条路径：
 *   1. 无清单 → no-op（exit 0）
 *   2. 正常子集化 → 产出 woff2、重写 url()/href、删除原字体、体积显著缩小
 *   3. 清单字体缺失 → 跳过该字体但正常退出
 *
 * 运行：pnpm test（根 package.json → node --test 本文件）
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
	new URL("./subset-fonts.mjs", import.meta.url),
);
// scripts/ 与 node_modules 同级（packages/theme/），fixture 字体直接引用 katex 分发包
const fixtureFontPath = fileURLToPath(
	new URL(
		"../node_modules/katex/dist/fonts/KaTeX_Main-Regular.ttf",
		import.meta.url,
	),
);

/** 在系统临时目录搭一个最小 dist + 清单，跑完后清理 */
function makeFixture({ html, css, manifest }) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "subset-fonts-"));
	fs.mkdirSync(path.join(root, "dist/assets/fonts"), { recursive: true });
	fs.writeFileSync(path.join(root, "dist/index.html"), html);
	fs.writeFileSync(path.join(root, "dist/assets/style.css"), css);
	fs.copyFileSync(
		fixtureFontPath,
		path.join(root, "dist/assets/fonts/Fixture-Regular.ttf"),
	);
	if (manifest !== undefined) {
		fs.writeFileSync(
			path.join(root, "subset-fonts.json"),
			JSON.stringify(manifest),
		);
	}
	return root;
}

function runScript(cwd) {
	// 合并 stdout/stderr：脚本对可恢复问题（如字体缺失）走 console.error
	const r = spawnSync(process.execPath, [scriptPath], {
		cwd,
		encoding: "utf-8",
	});
	return `${r.stdout ?? ""}${r.stderr ?? ""}`;
}

const FIXTURE_HTML = `<!doctype html><html><head>
<link rel="stylesheet" href="/assets/style.css">
<link rel="preload" href="/assets/fonts/Fixture-Regular.ttf" as="font" type="font/ttf" crossorigin>
</head><body><h1>清言集 Hello Abc123 子集化验证</h1><img src="/x.png" alt="替代属性文本"></body></html>`;

const FIXTURE_CSS = `@font-face {
  font-family: "Fixture";
  src: url("/assets/fonts/Fixture-Regular.ttf") format("truetype");
}
body { font-family: "Fixture", serif; }`;

const FIXTURE_MANIFEST = {
	fonts: [{ src: "/assets/fonts/Fixture-Regular.ttf", extraChars: "…" }],
};

test("无清单时 no-op 跳过且 exit 0", () => {
	const root = makeFixture({
		html: FIXTURE_HTML,
		css: FIXTURE_CSS,
		manifest: undefined,
	});
	try {
		const out = runScript(root);
		if (!out.includes("跳过"))
			throw new Error(`预期输出包含"跳过"，实际：${out}`);
		const fontsDir = path.join(root, "dist/assets/fonts");
		const remain = fs.readdirSync(fontsDir);
		if (remain.length !== 1 || !remain[0].endsWith(".ttf")) {
			throw new Error(`no-op 不应改动字体目录，实际：${remain.join(", ")}`);
		}
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test("子集化：产出 woff2、重写引用、删除原字体、体积缩小", () => {
	const root = makeFixture({
		html: FIXTURE_HTML,
		css: FIXTURE_CSS,
		manifest: FIXTURE_MANIFEST,
	});
	try {
		const out = runScript(root);
		const fontsDir = path.join(root, "dist/assets/fonts");
		const remain = fs.readdirSync(fontsDir);

		// 原字体已删除，仅剩一个 woff2 子集
		if (remain.length !== 1 || !remain[0].endsWith(".woff2")) {
			throw new Error(`预期仅剩一个 woff2，实际：${remain.join(", ")}\n${out}`);
		}
		const subsetPath = path.join(fontsDir, remain[0]);
		const subsetSize = fs.statSync(subsetPath).size;
		const originalSize = fs.statSync(fixtureFontPath).size;
		if (subsetSize >= originalSize) {
			throw new Error(`子集 ${subsetSize}B 应小于原字体 ${originalSize}B`);
		}

		// CSS 的 url() 已重写且不再引用原 ttf
		const css = fs.readFileSync(
			path.join(root, "dist/assets/style.css"),
			"utf-8",
		);
		if (!css.includes(remain[0])) throw new Error(`CSS 未重写为 ${remain[0]}`);
		if (css.includes("Fixture-Regular.ttf"))
			throw new Error("CSS 仍引用原 ttf");

		// HTML 的 preload href 已重写
		const html = fs.readFileSync(path.join(root, "dist/index.html"), "utf-8");
		if (!html.includes(remain[0])) throw new Error("HTML preload 未重写");
		if (html.includes("Fixture-Regular.ttf"))
			throw new Error("HTML 仍引用原 ttf");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test("清单字体在 dist 缺失时跳过该字体并正常退出", () => {
	const root = makeFixture({
		html: FIXTURE_HTML,
		css: FIXTURE_CSS,
		manifest: FIXTURE_MANIFEST,
	});
	try {
		fs.rmSync(path.join(root, "dist/assets/fonts/Fixture-Regular.ttf"));
		const out = runScript(root);
		if (!out.includes("未找到字体"))
			throw new Error(`预期提示字体缺失，实际：${out}`);
		if (fs.existsSync(path.join(root, "dist/assets/fonts"))) {
			const remain = fs.readdirSync(path.join(root, "dist/assets/fonts"));
			if (remain.length !== 0)
				throw new Error(`不应产出子集，实际：${remain.join(", ")}`);
		}
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
