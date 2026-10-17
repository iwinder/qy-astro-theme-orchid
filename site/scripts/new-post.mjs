// new-post（§4.67）：写作辅助脚本，对齐参考实现 orchid-blog/scripts/new-post.js。
// 用法：pnpm new-post <标题>[.md|.mdx]   （无扩展名时默认 .md，可显式写 .mdx）
// 在 site/src/content/posts/ 下按 frontmatter 骨架生成新文章；
// 字段与主题 definePostSchema 对齐，其余字段（updated/pinned/series 等）按需手补。
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0) {
	console.error("Usage: pnpm new-post <title>[.md|.mdx]");
	process.exit(1);
}

let slug = args[0];
if (!/\.(md|mdx)$/i.test(slug)) {
	slug += ".md";
}

const targetDir = "./src/content/posts";
const targetFile = join(targetDir, slug);

if (existsSync(targetFile)) {
	console.error(`Error: file already exists: ${targetFile}`);
	process.exit(1);
}

const now = new Date();
const today = [
	now.getFullYear(),
	String(now.getMonth() + 1).padStart(2, "0"),
	String(now.getDate()).padStart(2, "0"),
].join("-");

mkdirSync(dirname(targetFile), { recursive: true });

const frontmatter = `---
title: ${parse(slug).name}
published: ${today}
description: ''
image: ''
tags: []
category: ''
draft: false
lang: ''
---

`;

writeFileSync(targetFile, frontmatter, "utf-8");
console.log(`Created: ${targetFile}`);
