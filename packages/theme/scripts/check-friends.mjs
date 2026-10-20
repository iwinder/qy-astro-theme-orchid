#!/usr/bin/env node
/**
 * 友链存活检测（§4.90）：读取构建产物 dist/friends/index.html，抽取友链卡片
 * （a.friend-card + .friend-name），并发探测各站点可达性，输出检测报告。
 *
 * 设计为发布后/定时（CI cron）手动运行，不挂进 build——构建保持离线可复现。
 *
 * 用法（站点根目录）：
 *   node node_modules/@windcoder/astro-theme-orchid/scripts/check-friends.mjs \
 *     [--dist dist] [--timeout 8000] [--retries 1] [--concurrency 6] \
 *     [--json report.json] [--fail-on-dead]
 *
 * 判级：ok = 2xx/3xx；warn = 403/405/406/429/999（常见反爬拦截，未必失联）；
 * dead = 网络层失败（解析/超时/拒绝）与其余 4xx/5xx。网络层失败与 5xx 重试。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const UA =
	"Mozilla/5.0 (compatible; OrchidFriendChecker/+https://github.com/iwinder/qy-astro-theme-orchid)";
/** 这些状态码通常是 WAF/反爬拦截而非失联，只警告不定罪 */
const WARN_CODES = new Set([403, 405, 406, 429, 999]);

function parseArgs(argv) {
	const args = {
		dist: "dist",
		timeout: 8000,
		retries: 1,
		concurrency: 6,
		json: "",
		failOnDead: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--dist") args.dist = argv[++i];
		else if (a === "--timeout") args.timeout = Number(argv[++i]);
		else if (a === "--retries") args.retries = Number(argv[++i]);
		else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
		else if (a === "--json") args.json = argv[++i];
		else if (a === "--fail-on-dead") args.failOnDead = true;
		else if (a === "--help" || a === "-h") {
			console.log(
				"用法：node check-friends.mjs [--dist dist] [--timeout 8000] [--retries 1] [--concurrency 6] [--json report.json] [--fail-on-dead]",
			);
			process.exit(0);
		}
	}
	return args;
}

function decodeEntities(s) {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

/** 从友链页 HTML 抽取 [{ title, url }]（主题自有标记，结构稳定） */
export function extractFriends(html) {
	const out = [];
	const re =
		/<a class="friend-card card" href="([^"]+)"[\s\S]*?<div class="friend-name">([\s\S]*?)<\/div>/g;
	let m;
	while (true) {
		m = re.exec(html);
		if (!m) break;
		out.push({
			url: decodeEntities(m[1]),
			title: decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim(),
		});
	}
	return out;
}

/** HTTP 状态码 → ok/warn/dead 判级（0 = 网络层失败） */
export function classify(code) {
	if (code === 0) return "dead";
	if (code >= 200 && code < 400) return "ok";
	if (WARN_CODES.has(code)) return "warn";
	return "dead";
}

/** 单次探测：GET + 超时 + 立即丢弃响应体（只看状态码） */
async function probeOnce(url, timeout) {
	const started = Date.now();
	try {
		const res = await fetch(url, {
			redirect: "follow",
			signal: AbortSignal.timeout(timeout),
			headers: { "user-agent": UA, accept: "text/html,*/*;q=0.8" },
		});
		res.body?.cancel().catch(() => {});
		return { code: res.status, ms: Date.now() - started, msg: "" };
	} catch (err) {
		const cause = err?.cause?.code ?? err?.code ?? "";
		const msg =
			err?.name === "TimeoutError" || err?.name === "AbortError"
				? "超时"
				: cause === "ENOTFOUND" || cause === "EAI_AGAIN"
					? "域名无法解析"
					: cause === "ECONNREFUSED"
						? "连接被拒绝"
						: cause === "ECONNRESET"
							? "连接被重置"
							: cause === "CERT_HAS_EXPIRED" ||
									cause === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
								? "证书异常"
								: String(cause || err?.message || err);
		return { code: 0, ms: Date.now() - started, msg };
	}
}

/** 带重试探测：网络层失败与 5xx 重试（4xx 定局重试无意义） */
export async function probe(url, { timeout, retries }) {
	let last = await probeOnce(url, timeout);
	for (let i = 0; i < retries && (last.code === 0 || last.code >= 500); i++) {
		last = await probeOnce(url, timeout);
	}
	return { ...last, state: classify(last.code) };
}

/** CJK 感知的终端定宽 */
function pad(s, width) {
	let visual = 0;
	for (const ch of s) visual += ch.codePointAt(0) > 0xff ? 2 : 1;
	return visual >= width ? s : s + " ".repeat(width - visual);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const pagePath = resolve(args.dist, "friends", "index.html");
	let html;
	try {
		html = readFileSync(pagePath, "utf8");
	} catch {
		console.error(
			`[check-friends] 找不到 ${pagePath}\n  友链页未开启（pages.friends: false）或尚未构建；先 pnpm build 再检测。`,
		);
		process.exit(0);
	}

	const friends = extractFriends(html);
	if (!friends.length) {
		console.log("[check-friends] 友链页无友链卡片，无事可做。");
		process.exit(0);
	}
	console.log(
		`[check-friends] 共 ${friends.length} 条友链，并发 ${args.concurrency}，超时 ${args.timeout}ms，重试 ${args.retries} 次\n`,
	);

	const results = new Array(friends.length);
	let cursor = 0;
	async function worker() {
		while (cursor < friends.length) {
			const idx = cursor++;
			const { url, title } = friends[idx];
			process.stdout.write(`  探测 ${title} …\r`);
			const r = await probe(url, args);
			results[idx] = { ...r, title, url };
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(args.concurrency, friends.length) }, worker),
	);

	const ICON = { ok: "✓", warn: "⚠", dead: "✗" };
	console.log(
		"\n┌────┬──────┬────────┬────────┬──────────────────────┬──────────────────────────────────────┐",
	);
	console.log(
		`│ ${pad("状态", 2)} │ ${pad("站点", 18)} │ ${pad("HTTP", 6)} │ ${pad("耗时", 6)} │ ${pad("说明", 20)} │ 链接`,
	);
	console.log(
		"├────┼──────┼────────┼────────┼──────────────────────┼──────────────────────────────────────┤",
	);
	for (const r of results) {
		const note = r.state === "warn" ? "疑似反爬拦截，请人工复核" : r.msg;
		console.log(
			`│ ${ICON[r.state]}  │ ${pad(r.title, 18)} │ ${pad(String(r.code || "-"), 6)} │ ${pad(`${r.ms}ms`, 6)} │ ${pad(note, 20)} │ ${r.url}`,
		);
	}
	console.log(
		"└────┴──────┴────────┴────────┴──────────────────────┴──────────────────────────────────────┘",
	);

	const ok = results.filter((r) => r.state === "ok").length;
	const warn = results.filter((r) => r.state === "warn").length;
	const dead = results.filter((r) => r.state === "dead").length;
	console.log(`\n[check-friends] 完成：ok ${ok} / warn ${warn} / dead ${dead}`);
	if (warn)
		console.log(
			"  ⚠ warn 为常见反爬状态码（403/405/406/429/999），浏览器开一下再决定是否下架",
		);
	if (dead) {
		for (const r of results.filter((x) => x.state === "dead"))
			console.log(`  ✗ ${r.title} <${r.url}> ${r.msg || `HTTP ${r.code}`}`);
	}

	if (args.json) {
		const report = {
			checkedAt: new Date().toISOString(),
			total: friends.length,
			ok,
			warn,
			dead,
			results: results.map(({ title, url, state, code, ms, msg }) => ({
				title,
				url,
				state,
				code,
				ms,
				msg,
			})),
		};
		writeFileSync(resolve(args.json), `${JSON.stringify(report, null, 2)}\n`);
		console.log(`  报告已写入 ${resolve(args.json)}`);
	}

	if (args.failOnDead && dead > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	main();
}
