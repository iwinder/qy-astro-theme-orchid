import fs from "node:fs";
import path from "node:path";

/**
 * 画廊相册扫描（M3b-b8）：构建期在站点根目录扫描 public/gallery/<id>/。
 * process.cwd() 在 dev/build 时均为站点项目根，与 Astro 解析 public/ 一致。
 */

const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
/* §4.106：.thumb.webp 是 generate-lqips.mjs 的缩略图产物，不是照片本体 */
const THUMB_RE = /\.thumb\.webp$/i;
const COVER_RE = /^cover\./i;

export interface GalleryAlbumMeta {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	cover?: string;
	password?: string;
	passwordHint?: string;
}

/**
 * 扫描相册照片：本地文件（cover.* 提到首位）+ urls.txt 远程 URL（追加在本地之后）。
 * 目录不存在返回空数组（空相册合法，渲染空态）。
 */
export function scanAlbumPhotos(albumId: string): string[] {
	const dir = path.join(process.cwd(), "public", "gallery", albumId);
	if (!fs.existsSync(dir)) return [];

	const files = fs
		.readdirSync(dir)
		.filter((f) => IMAGE_RE.test(f) && !THUMB_RE.test(f))
		.sort();
	const coverIdx = files.findIndex((f) => COVER_RE.test(f));
	if (coverIdx > 0) {
		const [coverFile] = files.splice(coverIdx, 1);
		files.unshift(coverFile);
	}
	const localPhotos = files.map((f) => `/gallery/${albumId}/${f}`);

	// urls.txt：每行一个远程图片 URL，# 开头为注释
	const urlsFile = path.join(dir, "urls.txt");
	let remotePhotos: string[] = [];
	if (fs.existsSync(urlsFile)) {
		remotePhotos = fs
			.readFileSync(urlsFile, "utf-8")
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));
	}
	return [...localPhotos, ...remotePhotos];
}

/** 相册封面：显式 cover → cover.* 文件 → 第一张照片 → 空（空态兜底） */
export function getAlbumCover(
	album: GalleryAlbumMeta,
	photos: string[],
): string {
	if (album.cover) return album.cover;
	const coverFile = photos.find((p) => COVER_RE.test(p));
	return coverFile || photos[0] || "";
}

/** 列表页数据组装：扫描 + 封面 + 计数一次完成 */
export function buildAlbumIndex(albums: GalleryAlbumMeta[]) {
	return albums.map((album) => {
		const photos = scanAlbumPhotos(album.id);
		return {
			...album,
			cover: getAlbumCover(album, photos),
			photoCount: photos.length,
		};
	});
}
