/**
 * 缩略图查表（§4.106）：构建期从 virtual:theme/thumbs 查表，把列表封面
 * public 原图路径换成 generate-lqips.mjs 预生成的 480 宽 webp 缩略图 URL，
 * 并携带原图宽高（灯箱打开原图时用，详见 app.ts itemData filter）。
 * 查不到（外链 / data URL / 未生成 thumbs.json）时全部回退原图，自然降级。
 */
import thumbs from "virtual:theme/thumbs";

export interface ThumbInfo {
	/** 原图 URL（即传入 src，灯箱大图通道） */
	full: string;
	/** 列表展示 URL：命中缩略图时为 `<原图去 .thumb 前缀目录>/<名>.thumb.webp`，否则同 full */
	src: string;
	/** 原图宽高（未命中/无数据时缺省） */
	width?: number;
	height?: number;
}

/** public 路径 → 缩略图信息；非 public 路径或查表未命中时 src === full */
export function getThumbInfo(src: string): ThumbInfo {
	const hit = thumbs[`public:${src.replace(/^\//, "")}`];
	if (hit?.thumb && hit.width > 0 && hit.height > 0) {
		return { full: src, src: `/${hit.thumb}`, width: hit.width, height: hit.height };
	}
	return { full: src, src };
}
