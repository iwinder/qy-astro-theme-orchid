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
 * LQIP 虚拟模块（M3b-b9，P1-14）：读取站点根 lqips.json
 * （generate-lqips.mjs 产物，键 `public:<路径>` → 18 字符 compact hex），
 * 以 `virtual:theme/lqips` 暴露给构建期内联占位渐变（utils/lqip.ts）。
 * 文件缺失（未跑生成脚本）时导出空对象，消费端自然降级纯色，不阻塞构建。
 * 注意：本插件必须注册在 overridesPlugin 之前——后者的 resolveId 会兜住
 * 所有 virtual:theme/* 并返回一个不存在的文件路径。
 */
export function themeLqipsPlugin() {
	const virtualId = "virtual:theme/lqips";
	const resolvedId = "\0" + virtualId;
	let lqips: Record<string, string> = {};
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
		},
		resolveId(id: string) {
			return id === virtualId ? resolvedId : null;
		},
		load(id: string) {
			if (id === resolvedId) return `export default ${JSON.stringify(lqips)};`;
		},
	};
}
