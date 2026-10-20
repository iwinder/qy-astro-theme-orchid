/**
 * check-friends.mjs 单元 + 集成测试（node:test 内置运行器，零测试依赖）
 *
 * 覆盖三条路径（不发真实网络请求）：
 *   1. extractFriends：多卡片抽取、HTML 实体解码、嵌套标签剥离
 *   2. classify：状态码 → ok/warn/dead 判级
 *   3. CLI 集成：友链页缺失 → 提示并 exit 0（不炸 CI）
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

const { extractFriends, classify } = await import(
	fileURLToPath(new URL("./check-friends.mjs", import.meta.url))
);

const scriptPath = fileURLToPath(
	new URL("./check-friends.mjs", import.meta.url),
);

test("extractFriends：抽取多张卡片并解码实体、剥离嵌套标签", () => {
	const html = `<!doctype html><html><body>
<a class="friend-card card" href="https://a.example.com/x?a=1&amp;b=2" target="_blank" rel="noopener">
	<div class="friend-avatar">A</div>
	<div class="friend-name">青山不改</div>
	<div class="friend-desc">山中岁月长</div>
</a>
<a class="friend-card card" href="https://b.example.com" target="_blank" rel="noopener">
	<div class="friend-avatar">B</div>
	<div class="friend-name"><span>拾光者</span>&amp;伙伴</div>
</a>
<a class="other-card" href="https://c.example.com"><div class="friend-name">不该被抽到</div></a>
</body></html>`;
	const friends = extractFriends(html);
	assert.equal(friends.length, 2);
	assert.equal(friends[0].title, "青山不改");
	assert.equal(friends[0].url, "https://a.example.com/x?a=1&b=2");
	assert.equal(friends[1].title, "拾光者&伙伴");
	assert.equal(friends[1].url, "https://b.example.com");
});

test("extractFriends：无卡片时返回空数组", () => {
	assert.deepEqual(
		extractFriends("<html><body><p>empty</p></body></html>"),
		[],
	);
});

test("classify：状态码判级（ok/warn/dead）", () => {
	assert.equal(classify(0), "dead"); // 网络层失败
	assert.equal(classify(200), "ok");
	assert.equal(classify(204), "ok");
	assert.equal(classify(301), "ok");
	assert.equal(classify(308), "ok");
	// 常见反爬拦截：只警告不定罪
	assert.equal(classify(403), "warn");
	assert.equal(classify(405), "warn");
	assert.equal(classify(406), "warn");
	assert.equal(classify(429), "warn");
	assert.equal(classify(999), "warn");
	// 其余 4xx/5xx 判死
	assert.equal(classify(404), "dead");
	assert.equal(classify(410), "dead");
	assert.equal(classify(500), "dead");
	assert.equal(classify(503), "dead");
});

test("CLI 集成：友链页缺失时提示并 exit 0", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "check-friends-"));
	try {
		const r = spawnSync(process.execPath, [scriptPath, "--dist", root], {
			cwd: root,
			encoding: "utf-8",
		});
		const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
		assert.equal(r.status, 0);
		assert.ok(out.includes("找不到"), `预期提示找不到友链页，实际：${out}`);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
