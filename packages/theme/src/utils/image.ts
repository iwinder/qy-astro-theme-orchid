/**
 * 站点图片路径三格式解析（§4.97，对齐参考站 ImageWrapper 能力）：
 * 1. `/` 开头 → 站点 public 静态资源，原样输出（不经构建管线优化）；
 * 2. `http(s)://` / `//` / `data:` → 外链或内联，原样输出；
 * 3. 其余相对路径（如 "assets/images/avatar.png"）→ 相对站点项目 src/ 目录
 *    构建期解析，返回带内容 hash 的构建产物 URL（唯一被优化的格式）。
 *
 * 解析机制：import.meta.glob("/src/assets/...") 的 `/` 前缀相对 Vite 项目根，
 * 主题包组件运行在站点构建管线中，因此命中站点项目的 src/assets；
 * 非 eager 按需 await，仅实际用到的图片进入构建产物。
 * ico 不参与 glob（favicon 走 public / 远程，无优化需求）。
 */

/** glob 命中的资源元数据（astro:assets 的 ImageMetadata 形状，此处仅用 src） */
interface AssetMeta {
	src: string;
}

/** 三格式判定：true = 相对 src/ 的本地资源（需构建期解析） */
export function isLocalImagePath(src: string): boolean {
	if (!src) return false;
	return !(
		src.startsWith("/") ||
		src.startsWith("http://") ||
		src.startsWith("https://") ||
		src.startsWith("//") ||
		src.startsWith("data:")
	);
}

/** 相对路径 → glob key："assets/avatar.png" → "/src/assets/avatar.png" */
export function toAssetKey(src: string): string {
	return `/src/assets/${src.replace(/^\.?\//, "")}`;
}

type AssetModules = Record<string, () => Promise<AssetMeta>>;

/**
 * 解析单张站点图片为可直接用于 <img src> 的 URL。
 * public / 外链原样返回；相对路径查 glob 表，命中则 await 产物元数据；
 * 未命中（文件不存在）时 console.warn 并原样返回，页面不断构建。
 *
 * 注意：import.meta.glob 第一参数必须是字符串字面量（vite 编译期静态分析，
 * 变量/常量在 dev 下直接报 Invalid glob import syntax），模式不能提取为常量。
 */
export async function resolveSiteImage(src: string): Promise<string> {
	if (!isLocalImagePath(src)) return src;
	const modules = import.meta.glob(
		"/src/assets/**/*.{png,jpg,jpeg,webp,avif,gif,svg}",
		{ import: "default" },
	) as unknown as AssetModules;
	const loader = modules[toAssetKey(src)];
	if (!loader) {
		console.warn(
			`[orchid-theme] 图片未找到: ${toAssetKey(src)}（相对站点 src/ 目录解析）`,
		);
		return src;
	}
	const meta = await loader();
	return meta.src;
}

/** 数组批量解析（banner/壁纸多图、歌单封面等），顺序保持 */
export async function resolveSiteImages(srcs: string[]): Promise<string[]> {
	return Promise.all(srcs.map((src) => resolveSiteImage(src)));
}
