import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedThemeConfig } from "./schema.js";

/**
 * 主题内部统一通过 `virtual:theme/...` 引用可覆盖组件：
 *   import Header from 'virtual:theme/components/Header.astro'
 * 解析优先级：site/src/overrides/（路径镜像虚拟 id，去掉前缀）
 *   virtual:theme/components/X.astro → site/src/overrides/components/X.astro
 *   下存在同名文件时优先采用；override 文件内部再 import 同一虚拟路径时
 * 强制走默认实现，从而支持「包装默认实现」式定制而不产生自引用死循环。
 */
const VIRTUAL_PREFIX = "virtual:theme/";

export function overridesPlugin() {
	// vite.ts 位于包内 src/ 下，默认实现根即 src/
	const themeSrcDir = path.dirname(fileURLToPath(import.meta.url));
	let overridesDir: string | undefined;

	return {
		name: "@windcoder/astro-theme-orchid:overrides",
		enforce: "pre" as const,
		// root 在 configResolved 阶段确定（兼容 URL / string 两种形态）
		configResolved(resolvedConfig: { root: URL | string }) {
			const rootDir =
				typeof resolvedConfig.root === "string"
					? resolvedConfig.root
					: fileURLToPath(resolvedConfig.root);
			overridesDir = path.join(rootDir, "src", "overrides");
		},
		resolveId(id: string, importer?: string) {
			if (!id.startsWith(VIRTUAL_PREFIX)) return null;
			const rel = id.slice(VIRTUAL_PREFIX.length);
			if (overridesDir) {
				const relImporter = importer
					? path.relative(overridesDir, importer)
					: "";
				const importerInOverrides =
					!!importer &&
					relImporter !== "" &&
					!relImporter.startsWith("..") &&
					!path.isAbsolute(relImporter);
				if (!importerInOverrides) {
					const overrideFile = path.join(overridesDir, rel);
					if (fs.existsSync(overrideFile)) return overrideFile;
				}
			}
			return path.join(themeSrcDir, rel);
		},
	};
}

/** 将站点配置暴露为虚拟模块，主题组件通过 `import config from 'virtual:theme/config'` 消费 */
export function themeConfigPlugin(config: ResolvedThemeConfig) {
	const virtualId = "virtual:theme/config";
	const resolvedId = "\0" + virtualId;
	return {
		name: "@windcoder/astro-theme-orchid:config",
		enforce: "pre" as const,
		resolveId(id: string) {
			return id === virtualId ? resolvedId : null;
		},
		load(id: string) {
			if (id === resolvedId) return `export default ${JSON.stringify(config)};`;
		},
	};
}

/**
 * LQIP + 缩略图虚拟模块（M3b-b9，P1-14；§4.106 扩展双产物）：读取站点根
 * lqips.json（键 `public:<路径>` → 18 字符 compact hex）与 thumbs.json
 * （键 `public:<路径>` → { thumb, width, height }），分别以
 * `virtual:theme/lqips`（utils/lqip.ts 构建期内联占位渐变）与
 * `virtual:theme/thumbs`（utils/thumb.ts 列表封面换缩略图 URL）暴露。
 * 文件缺失（未跑生成脚本）时导出空对象，消费端自然降级（纯色/原图），不阻塞构建。
 * 注意：本插件必须注册在 overridesPlugin 之前——后者的 resolveId 会兜住
 * 所有 virtual:theme/* 并返回一个不存在的文件路径。
 */
export function themeLqipsPlugin() {
	type ThumbMeta = { thumb: string; width: number; height: number };
	const lqipsId = "virtual:theme/lqips";
	const thumbsId = "virtual:theme/thumbs";
	let lqips: Record<string, string> = {};
	let thumbs: Record<string, ThumbMeta> = {};
	return {
		name: "@windcoder/astro-theme-orchid:lqips",
		enforce: "pre" as const,
		configResolved(resolvedConfig: { root: URL | string }) {
			const rootDir =
				typeof resolvedConfig.root === "string"
					? resolvedConfig.root
					: fileURLToPath(resolvedConfig.root);
			try {
				lqips = JSON.parse(
					fs.readFileSync(path.join(rootDir, "lqips.json"), "utf8"),
				);
			} catch {
				lqips = {};
			}
			try {
				thumbs = JSON.parse(
					fs.readFileSync(path.join(rootDir, "thumbs.json"), "utf8"),
				);
			} catch {
				thumbs = {};
			}
		},
		resolveId(id: string) {
			if (id === lqipsId) return "\0" + lqipsId;
			if (id === thumbsId) return "\0" + thumbsId;
			return null;
		},
		load(id: string) {
			if (id === "\0" + lqipsId)
				return `export default ${JSON.stringify(lqips)};`;
			if (id === "\0" + thumbsId)
				return `export default ${JSON.stringify(thumbs)};`;
			return undefined;
		},
	};
}

/**
 * Pagefind dev 中间件（§4.104）：dev 下为搜索提供构建期索引。
 * Vite 禁止以模块 import 引用 public 内的 JS（"should not be imported
 * from source code"），把索引同步进 public 行不通；故与社区标准方案
 * astro-pagefind 同款——前置中间件把构建产物 dist/pagefind 直接静态服务。
 * dist/pagefind 不存在（未跑过 build）时放行，app.ts 的 loadPagefind
 * 捕获失败后降级为「索引不可用」提示。仅 dev 生效（configureServer 只在
 * dev server 调用）；build/preview 的索引由 pagefind --site dist 原地产出。
 */
const PAGEFIND_MIME: Record<string, string> = {
	".js": "text/javascript",
	".mjs": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".wasm": "application/wasm",
};

export function pagefindDevPlugin() {
	let distPagefind = "";
	return {
		name: "@windcoder/astro-theme-orchid:pagefind-dev",
		enforce: "pre" as const,
		configResolved(resolvedConfig: {
			root: URL | string;
			build: { outDir: string };
		}) {
			const rootDir =
				typeof resolvedConfig.root === "string"
					? resolvedConfig.root
					: fileURLToPath(resolvedConfig.root);
			distPagefind = path.resolve(
				rootDir,
				resolvedConfig.build.outDir,
				"pagefind",
			);
		},
		configureServer(server: {
			middlewares: {
				use: (
					fn: (
						req: { url?: string },
						res: {
							setHeader: (name: string, value: string) => void;
							end: (data: Buffer) => void;
						},
						next: () => void,
					) => void,
				) => void;
			};
		}) {
			server.middlewares.use((req, res, next) => {
				const url = (req.url || "").split("?")[0];
				if (!url.startsWith("/pagefind/")) return next();
				// 剥掉 "/pagefind/" 前缀后再拼接，避免 pagefind 二次重复；
				// resolve + 前缀校验防目录穿越；读不到（未 build）时放行走 404
				const file = path.resolve(distPagefind, url.slice("/pagefind/".length));
				if (!file.startsWith(distPagefind + path.sep)) return next();
				fs.readFile(file, (err, buf) => {
					if (err) return next();
					res.setHeader(
						"Content-Type",
						PAGEFIND_MIME[path.extname(file)] ?? "application/octet-stream",
					);
					res.end(buf);
				});
			});
		},
	};
}
