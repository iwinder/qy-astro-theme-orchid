/**
 * 站点图片路径三格式解析（§4.97，对齐参考站 ImageWrapper 能力）：
 * 1. `/` 开头 → 站点 public 静态资源，原样输出（不经构建管线优化）；
 * 2. `http(s)://` / `//` / `data:` → 外链或内联，原样输出；
 * 3. 其余相对路径（如 "assets/images/avatar.png"）→ 相对站点项目 src/ 目录
 *    构建期解析，且经 sharp image service 重编码（默认 webp + 压缩，
 *    §4.106 升级），返回优化产物 URL（唯一被优化的格式）。
 *
 * 解析机制：import.meta.glob 匹配站点根下 src 全目录的媒体扩展名，`/` 前缀
 * 相对 Vite 项目根，主题包组件运行在站点构建管线中，因此命中站点项目的 src/
 * （§4.108：不写死 assets/ 前缀，src 下任意目录的图片/视频均可解析；
 * ⚠️ 本段注释不可出现 glob 的双星斜杠字面量——含块注释终止符子串会提前闭合）；
 * 非 eager 按需 await，仅实际用到的媒体进入构建产物。
 * svg（矢量）与 gif（动图）不做 sharp 编码——转码会破坏矢量/动画，原样输出。
 * ico 不参与 glob（favicon 走 public / 远程，无优化需求）。
 */

import { getImage, type ImageMetadata } from "astro:assets";

/** glob 命中的资源元数据：图片为 ImageMetadata，视频等为产物 URL 字符串 */
type AssetMeta = ImageMetadata | string;

/** 三格式判定：true = 相对 src/ 的本地媒体资源（需构建期解析） */
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

/**
 * 相对路径 → glob key：不写死 assets/ 前缀（§4.108），相对路径不加 `/` 即
 * 相对站点 src/ 目录——"assets/images/avatar.png" → /src/assets/images/avatar.png，
 * "styles/x.svg" → /src/styles/x.svg，src 下任意目录均可解析。
 */
export function toAssetKey(src: string): string {
	return `/src/${src.replace(/^\.?\//, "")}`;
}

type AssetModules = Record<string, () => Promise<AssetMeta>>;

/**
 * 解析单张站点静态媒体（图片/视频）为可直接引用的 URL。
 * public / 外链原样返回；相对路径查 glob 表，命中则 await 产物元数据；
 * 未命中（文件不存在）时 console.warn 并原样返回，页面不断构建。
 *
 * §4.106：位图（png/jpg/webp/avif）额外经 getImage() 走 sharp image service
 * 构建期重编码（默认转 webp + 质量压缩，Astro 同图同参有编码缓存）；
 * svg/gif 保持原始产物 URL 不转码。失败时降级原样返回，页面不断构建。
 * §4.108：视频（mp4/webm/mov）glob 导出为产物 URL 字符串，直接返回。
 *
 * 注意：import.meta.glob 第一参数必须是字符串字面量（vite 编译期静态分析，
 * 变量/常量在 dev 下直接报 Invalid glob import syntax），模式不能提取为常量。
 */
export async function resolveSiteImage(src: string): Promise<string> {
	if (!isLocalImagePath(src)) return src;
	const modules = import.meta.glob(
		"/src/**/*.{png,jpg,jpeg,webp,avif,gif,svg,mp4,webm,mov}",
		{ import: "default" },
	) as unknown as AssetModules;
	const loader = modules[toAssetKey(src)];
	if (!loader) {
		console.warn(
			`[orchid-theme] 媒体文件未找到: ${toAssetKey(src)}（相对路径不带 / 时相对站点 src/ 目录解析）`,
		);
		return src;
	}
	const meta = await loader();
	if (typeof meta === "string") return meta;
	if (meta.format === "svg" || meta.format === "gif") return meta.src;
	try {
		const encoded = await getImage({ src: meta });
		return encoded.src;
	} catch (err) {
		console.warn(
			`[orchid-theme] 图片优化失败，回退原图: ${toAssetKey(src)}`,
			err,
		);
		return meta.src;
	}
}

/** 数组批量解析（banner/壁纸多图、歌单封面等），顺序保持 */
export async function resolveSiteImages(srcs: string[]): Promise<string[]> {
	return Promise.all(srcs.map((src) => resolveSiteImage(src)));
}
