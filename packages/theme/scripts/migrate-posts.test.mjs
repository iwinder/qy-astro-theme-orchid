/**
 * migrate-posts.mjs 单元 + 集成测试（node:test 内置运行器，零测试依赖）
 *
 * 覆盖四条路径（不发网络请求、不动仓库文件，fixture 全在系统临时目录）：
 *   1. frontmatter 解析与日期归一化（hexo 斜杠格式、date-only 保真）
 *   2. 三平台字段映射（hexo/hugo/generic）与白名单外字段报告
 *   3. slug 净化、标题三级回退、输出路径冲突序号
 *   4. CLI 集成：缺 --src exit 1、dry-run 不落盘、--write 落盘可回读
 *
 * 运行：pnpm test（根 package.json → node --test packages/theme/scripts）
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse as yamlParse } from "yaml";

const {
	parseFrontmatter,
	normalizeDate,
	formatDate,
	resolveTitle,
	toSlug,
	findRelativeImages,
	mapFrontmatter,
	scanMarkdownFiles,
	migrateFile,
	runMigration,
} = await import(
	fileURLToPath(new URL("./migrate-posts.mjs", import.meta.url))
);

const scriptPath = fileURLToPath(
	new URL("./migrate-posts.mjs", import.meta.url),
);

/* ---------- 1. parseFrontmatter ---------- */

test("parseFrontmatter：标准界定符解析并剥离 frontmatter", () => {
	const { data, body, broken } = parseFrontmatter(
		"---\ntitle: 你好\ntags:\n  - a\n  - b\n---\n\n正文第一段。\n",
	);
	assert.equal(broken, false);
	assert.equal(data.title, "你好");
	assert.deepEqual(data.tags, ["a", "b"]);
	// `---` 后的首个换行被界定符消费，剩余正文保留一个前导空行
	assert.equal(body, "\n正文第一段。\n");
});

test("parseFrontmatter：无 frontmatter 时原文即正文", () => {
	const { data, body, broken } = parseFrontmatter("# 直接正文\n");
	assert.deepEqual(data, {});
	assert.equal(body, "# 直接正文\n");
	assert.equal(broken, false);
});

test("parseFrontmatter：YAML 损坏时 broken 标记并按空数据处理", () => {
	const { data, broken } = parseFrontmatter("---\ntitle: [未闭合\n---\n正文\n");
	assert.equal(broken, true);
	assert.deepEqual(data, {});
});

test("parseFrontmatter：frontmatter 是数组等非对象时 broken 标记", () => {
	const { data, broken } = parseFrontmatter("---\n- a\n- b\n---\n正文\n");
	assert.equal(broken, true);
	assert.deepEqual(data, {});
});

/* ---------- 2. 日期归一化 ---------- */

test("normalizeDate：date-only 原样保留（避免时区漂移）", () => {
	assert.equal(normalizeDate("2024-01-05"), "2024-01-05");
});

test("normalizeDate：hexo 斜杠格式转 ISO（含/不含时间）", () => {
	assert.equal(normalizeDate("2023/07/01"), "2023-07-01");
	assert.equal(normalizeDate("2023/07/01 9:05"), "2023-07-01T09:05:00");
	assert.equal(normalizeDate("2023/07/01 12:34:56"), "2023-07-01T12:34:56");
});

test("normalizeDate：带显式时区偏移的 ISO 串直接取墙钟（避免本地化漂移）", () => {
	assert.equal(
		normalizeDate("2022-03-04T10:00:00+08:00"),
		"2022-03-04T10:00:00",
	);
	assert.equal(normalizeDate("2022-03-04T10:00:00Z"), "2022-03-04T10:00:00");
	assert.equal(normalizeDate("2022-03-04 10:00+0800"), "2022-03-04T10:00:00");
	assert.equal(
		normalizeDate("2022-03-04T10:00:00.123+08:00"),
		"2022-03-04T10:00:00",
	);
});

test("normalizeDate：Date 对象与自然语言串走本地格式化", () => {
	assert.equal(normalizeDate(new Date(2023, 6, 1)), "2023-07-01");
	assert.equal(
		normalizeDate(new Date(2023, 6, 1, 8, 30, 0)),
		"2023-07-01T08:30:00",
	);
	assert.equal(normalizeDate("2023-07-01T08:30:00"), "2023-07-01T08:30:00");
});

test("normalizeDate：非法值返回 null", () => {
	assert.equal(normalizeDate("不是日期"), null);
	assert.equal(normalizeDate(123), null);
	assert.equal(normalizeDate(undefined), null);
	assert.equal(normalizeDate(new Date("not-a-date")), null);
});

test("formatDate：零点只写日期，其余带 T 时间", () => {
	assert.equal(formatDate(new Date(2024, 0, 5)), "2024-01-05");
	assert.equal(
		formatDate(new Date(2024, 0, 5, 7, 8, 9)),
		"2024-01-05T07:08:09",
	);
});

/* ---------- 3. 标题与 slug ---------- */

test("resolveTitle：frontmatter → 正文一级标题 → 文件名 三级回退", () => {
	assert.deepEqual(resolveTitle({ title: "甲" }, "# 乙\n", "丙"), {
		title: "甲",
		from: "frontmatter",
	});
	assert.deepEqual(resolveTitle({}, "引言\n\n# 正文标题\n", "丙"), {
		title: "正文标题",
		from: "heading",
	});
	assert.deepEqual(resolveTitle({ title: "  " }, "无标题正文", "我的文件"), {
		title: "我的文件",
		from: "filename",
	});
	assert.deepEqual(resolveTitle({ title: 42 }, "", "丙"), {
		title: "42",
		from: "frontmatter",
	});
});

test("toSlug：空白转横线、剔除不安全字符、保留中文、空值兜底", () => {
	assert.equal(toSlug("Hello World"), "Hello-World");
	assert.equal(toSlug("我的: 第一篇*文章?"), "我的-第一篇文章");
	assert.equal(toSlug('  a/b\\c:d*e?f"g<h>i|j  '), "abcdefghij");
	assert.equal(toSlug("...---"), "post");
	assert.equal(toSlug("中文标题"), "中文标题");
	assert.equal(toSlug(".hidden"), "hidden");
});

/* ---------- 4. 相对图片检测 ---------- */

test("findRelativeImages：抓相对路径，放过绝对与外链", () => {
	const body = [
		"![本地图](images/a.png)",
		"![外链](https://cdn.example.com/b.webp)",
		"![协议相对](//cdn.example.com/c.webp)",
		"![根路径](/assets/d.jpg)",
		"<img src='e.gif' alt='行内'>",
		"![data URI](data:image/png;base64,xxx)",
	].join("\n");
	assert.deepEqual(findRelativeImages(body), ["images/a.png", "e.gif"]);
});

/* ---------- 5. 三平台字段映射 ---------- */

test("mapFrontmatter hexo：date/categories/photos/published:false 全套映射", () => {
	const { fm, notes } = mapFrontmatter(
		{
			title: "旧文",
			date: "2023/07/01 12:00:00",
			updated: "2024-01-02",
			categories: [["技术", "子类"], "随笔"],
			tags: ["a", "b"],
			cover: "https://img.example.com/x.jpg",
			published: false,
			abbrlink: "1a2b",
		},
		"hexo",
	);
	assert.deepEqual(fm, {
		title: "旧文",
		published: "2023-07-01T12:00:00",
		updated: "2024-01-02",
		draft: true,
		image: "https://img.example.com/x.jpg",
		tags: ["a", "b"],
		category: "技术",
	});
	assert.equal(notes.length, 1);
	assert.match(notes[0], /未映射字段：abbrlink/);
});

test("mapFrontmatter hexo：photos 数组兜底 image", () => {
	const { fm } = mapFrontmatter(
		{ title: "x", date: "2024-01-01", photos: ["p1.jpg", "p2.jpg"] },
		"hexo",
	);
	assert.equal(fm.image, "p1.jpg");
});

test("mapFrontmatter hugo：lastmod/summary/images/draft/slug", () => {
	const { fm, notes } = mapFrontmatter(
		{
			title: "H",
			date: "2022-03-04T10:00:00+08:00",
			lastmod: "2022-03-05",
			summary: "这是摘要",
			categories: ["生活"],
			tags: ["t"],
			images: ["cover.webp"],
			draft: true,
			slug: "my-post",
		},
		"hugo",
	);
	assert.equal(fm.published, "2022-03-04T10:00:00");
	assert.equal(fm.updated, "2022-03-05");
	assert.equal(fm.description, "这是摘要");
	assert.equal(fm.category, "生活");
	assert.equal(fm.image, "cover.webp");
	assert.equal(fm.draft, true);
	// slug 供输出文件名用，不算未映射
	assert.deepEqual(notes, []);
});

test("mapFrontmatter generic：published 优先于 date、banner、category", () => {
	const { fm } = mapFrontmatter(
		{
			title: "G",
			date: "2020-01-01",
			published: "2021-06-06",
			banner: "b.jpg",
			category: "技术",
			categories: ["不该被用"],
		},
		"generic",
	);
	assert.equal(fm.published, "2021-06-06");
	assert.equal(fm.image, "b.jpg");
	assert.equal(fm.category, "技术");
});

test("mapFrontmatter：draft 非 true 不写、缺失字段不产出键", () => {
	const { fm } = mapFrontmatter({ title: "只有标题" }, "generic");
	assert.deepEqual(fm, { title: "只有标题" });
});

/* ---------- 6. migrateFile：兜底与冲突 ---------- */

test("migrateFile：缺标题取正文标题、缺时间用 mtime 兜底并提示", () => {
	const r = migrateFile({
		rel: "2023-old-post.md",
		raw: "# 正文标题\n\n内容",
		platform: "generic",
		mtimeMs: new Date(2024, 4, 1, 9, 0, 0).getTime(),
		usedSlugs: new Set(),
		flat: true,
	});
	assert.equal(r.fm.title, "正文标题");
	assert.match(r.fm.published, /^2024-05-01T09:00:00$/);
	assert.ok(r.notes.some((n) => n.includes("正文首个一级标题")));
	assert.ok(r.notes.some((n) => n.includes("文件修改时间")));
	assert.equal(r.relOut, "2023-old-post.md");
});

test("migrateFile：slug 冲突自动加 -2/-3 序号", () => {
	const usedSlugs = new Set();
	const mk = (raw) =>
		migrateFile({
			rel: raw,
			raw: `---\ntitle: ${raw}\n---\n\n正文`,
			platform: "generic",
			mtimeMs: 0,
			usedSlugs,
			flat: true,
		});
	mk("hello.md");
	mk("hello.md");
	const third = mk("hello.md");
	assert.equal(third.relOut, "hello-3.md");
});

test("migrateFile：默认保留相对目录、flat 拍平、相对图片提示", () => {
	const common = { platform: "generic", mtimeMs: 0, usedSlugs: new Set() };
	const nested = migrateFile({
		rel: "tech/web/a.md",
		raw: "![图](img/x.png)\n\n正文",
		...common,
		flat: false,
	});
	assert.equal(nested.relOut, "tech/web/a.md");
	assert.ok(nested.notes.some((n) => n.includes("img/x.png")));

	const flattened = migrateFile({
		rel: "tech/web/a.md",
		raw: "正文",
		...common,
		flat: true,
	});
	assert.equal(flattened.relOut, "a.md");
});

test("migrateFile：内容以 --- 包裹、正文原样、键序固定", () => {
	const r = migrateFile({
		rel: "p.md",
		raw: "---\ntitle: T\ndate: 2024-02-03\ntags: [x]\ncustom: 1\n---\n\n\n正文。",
		platform: "generic",
		mtimeMs: 0,
		usedSlugs: new Set(),
		flat: true,
	});
	const lines = r.content.split("\n");
	assert.equal(lines[0], "---");
	assert.ok(r.content.startsWith("---\ntitle: T\n"));
	assert.ok(r.content.includes("published: 2024-02-03"));
	assert.ok(r.content.endsWith("\n\n正文。"));
	// 正文一字不动（除 frontmatter 后多余空行）
	assert.ok(r.content.includes("正文。"));
	// 未映射字段只进报告不进产物
	assert.ok(!r.content.includes("custom"));
});

test("migrateFile：hugo 平台 slug 字段决定输出文件名", () => {
	const r = migrateFile({
		rel: "2020-01-01-orig-name.md",
		raw: "---\ntitle: H\nslug: my-slug\ndate: 2020-01-01\n---\n正文",
		platform: "hugo",
		mtimeMs: 0,
		usedSlugs: new Set(),
		flat: true,
	});
	assert.equal(r.relOut, "my-slug.md");
});

/* ---------- 7. runMigration + CLI 集成 ---------- */

test("runMigration：dry-run 不落盘，--write 落盘且保留子目录", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "migrate-posts-"));
	const out = path.join(root, "out");
	try {
		const src = path.join(root, "src");
		fs.mkdirSync(path.join(src, "tech"), { recursive: true });
		fs.writeFileSync(
			path.join(src, "tech", "a.md"),
			"---\ntitle: 甲\ndate: 2023/05/06\ncategories: [技术]\n---\n\n![图](img/a.png)\n",
		);
		fs.writeFileSync(
			path.join(src, "b.markdown"),
			"# 标题来自正文\n\n内容段落。",
		);

		// dry-run：报告齐全但不写盘
		const report = runMigration({
			src,
			out,
			platform: "hexo",
			write: false,
			flat: false,
		});
		assert.equal(report.total, 2);
		assert.deepEqual(
			report.results.map((r) => r.output),
			["b.md", "tech/a.md"],
		);
		assert.ok(!fs.existsSync(out));

		// --write：落盘 + 保留子目录结构 + 可被 yaml 回读
		runMigration({ src, out, platform: "hexo", write: true, flat: false });
		const written = path.join(out, "tech", "a.md");
		assert.ok(fs.existsSync(written));
		assert.ok(fs.existsSync(path.join(out, "b.md")));
		const fm = yamlParse(
			fs.readFileSync(written, "utf8").split(/^---$/m)[1] ?? "",
		);
		assert.equal(fm.title, "甲");
		assert.ok(String(fm.published).startsWith("2023-05-06"));
		assert.equal(fm.category, "技术");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test("scanMarkdownFiles：递归收集并排序", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "migrate-posts-"));
	try {
		fs.mkdirSync(path.join(root, "sub"), { recursive: true });
		fs.writeFileSync(path.join(root, "b.md"), "");
		fs.writeFileSync(path.join(root, "a.markdown"), "");
		fs.writeFileSync(path.join(root, "sub", "c.md"), "");
		fs.writeFileSync(path.join(root, "ignored.txt"), "");
		assert.deepEqual(scanMarkdownFiles(root), [
			"a.markdown",
			"b.md",
			"sub/c.md",
		]);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test("CLI 集成：缺 --src exit 1，未知平台 exit 1，--help exit 0", () => {
	const missing = spawnSync(process.execPath, [scriptPath], {
		encoding: "utf-8",
	});
	assert.equal(missing.status, 1);
	assert.match(`${missing.stderr}`, /--src/);

	const badPlatform = spawnSync(
		process.execPath,
		[scriptPath, "--src", os.tmpdir(), "--platform", "wordpress"],
		{ encoding: "utf-8" },
	);
	assert.equal(badPlatform.status, 1);
	assert.match(`${badPlatform.stderr}`, /--platform/);

	const help = spawnSync(process.execPath, [scriptPath, "--help"], {
		encoding: "utf-8",
	});
	assert.equal(help.status, 0);
	assert.match(`${help.stdout}`, /用法/);
});

test("CLI 集成：dry-run 报告不写盘，加 --write 落盘", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "migrate-posts-"));
	const out = path.join(root, "out");
	try {
		const src = path.join(root, "src");
		fs.mkdirSync(src, { recursive: true });
		fs.writeFileSync(
			path.join(src, "hello.md"),
			"---\ntitle: 你好\ndate: 2024-01-01\n---\n\n正文",
		);

		const dry = spawnSync(
			process.execPath,
			[scriptPath, "--src", src, "--out", out],
			{ encoding: "utf-8" },
		);
		assert.equal(dry.status, 0);
		assert.match(`${dry.stdout}`, /dry-run 预览/);
		assert.ok(!fs.existsSync(out));

		const write = spawnSync(
			process.execPath,
			[scriptPath, "--src", src, "--out", out, "--write", "--flat"],
			{ encoding: "utf-8" },
		);
		assert.equal(write.status, 0);
		assert.match(`${write.stdout}`, /已写入/);
		assert.ok(fs.existsSync(path.join(out, "hello.md")));
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
