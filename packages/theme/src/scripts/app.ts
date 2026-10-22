/* 清言集 · Theme Orchid — 全局交互脚本
   移植自 design/prototype/app.js（冻结），改造为 View Transitions 兼容版：
   - document/window 级一次性委托监听（VT 换页不失联）
   - astro:page-load 时重初始化页面级状态（nav active / reveal / TOC spy / 灯箱 PhotoSwipe / 调色面板）
   - astro:after-swap 时重应用暗色 class 与持久化 hue（VT swap 会替换 <html> 属性）
   - 搜索浮层（M3b-b6）：Pagefind 构建期索引，运行时惰性加载
   - 加密文章（M3b-b7）：Web Crypto 解密 + sessionStorage 密码缓存 */

import { openSharePoster } from "./share-poster.js";

const doc = document;
const root = doc.documentElement;

/* ---------- 深浅模式 ---------- */
function applyPreferredDark() {
	let mode: string | null = null;
	try {
		mode = localStorage.getItem("qy-mode");
	} catch {
		/* ignore */
	}
	/* 未选择时回落到 colorMode 配置（§4.16，boot 脚本同源逻辑） */
	const fallback = root.dataset.colorMode || "system";
	const dark = mode
		? mode === "dark"
		: fallback === "dark" ||
			(fallback === "system" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);
	root.classList.toggle("dark", dark);
}
applyPreferredDark();
doc.addEventListener("astro:after-swap", applyPreferredDark);
/* 灯箱（§4.69）：PhotoSwipeLightbox 实例挂在旧 body 的元素上，VT swap 后立即销毁；
   新 body 的委托绑定由 astro:page-load 的 initPage → initLightbox 重建 */
doc.addEventListener("astro:after-swap", () => {
	pswpLightbox?.destroy();
	pswpLightbox = null;
});

/* ---------- 客户端动态文案（构建期经 BaseLayout #qy-ui-labels 注入，读一次缓存） ---------- */
const UI_FALLBACK: Record<string, string> = {
	close: "关闭",
	prevImage: "上一张",
	nextImage: "下一张",
	copied: "已复制",
	fullscreen: "全屏",
	slideshow: "自动播放",
	thumbs: "缩略图条",
};
let uiLabels: Record<string, string> | null = null;
function ui(key: string): string {
	if (!uiLabels) {
		try {
			const el = doc.getElementById("qy-ui-labels");
			uiLabels = el
				? (JSON.parse(el.textContent || "{}") as Record<string, string>)
				: {};
		} catch {
			uiLabels = {};
		}
	}
	return uiLabels[key] || UI_FALLBACK[key] || key;
}

/* ---------- hue 调色面板（运行时覆写 --accent-h，s/l 保持配置值） ---------- */
const HUE_KEY = "qy-hue";

/* 构建期 hue（BaseLayout 由 accentColor 计算并写入 data-accent-h） */
function buildHue(): number {
	const v = parseFloat(root.dataset.accentH || "");
	return Number.isFinite(v) ? v : 0;
}

/* 当前生效 hue：运行时覆写优先，否则构建期值 */
function currentHue(): number {
	const cur = parseFloat(root.style.getPropertyValue("--accent-h"));
	return Number.isFinite(cur) ? cur : buildHue();
}

function persistHue(h: number | null) {
	try {
		if (h === null) localStorage.removeItem(HUE_KEY);
		else localStorage.setItem(HUE_KEY, String(h));
	} catch {
		/* ignore */
	}
}

function savedHue(): number | null {
	try {
		const v = parseFloat(localStorage.getItem(HUE_KEY) || "");
		if (Number.isFinite(v)) return ((v % 360) + 360) % 360;
	} catch {
		/* ignore */
	}
	return null;
}

/* VT swap 替换 <html> style 属性后，重应用持久化 hue（与 applyPreferredDark 并列） */
function applySavedHue() {
	const h = savedHue();
	if (h !== null) root.style.setProperty("--accent-h", String(h));
}
applySavedHue();
doc.addEventListener("astro:after-swap", applySavedHue);

/* 同步面板 UI：滑杆 / 徽章 / swatch 激活态（差值 <1° 判定，含 0/360 环绕）。
   swatch 可能在旧 palette-pop 或显示设置面板（§4.103 外观 Tab）内，全局查询 */
function syncPaletteUI(h: number) {
	const rounded = Math.round(((h % 360) + 360) % 360) % 360;
	const slider = doc.getElementById("hueSlider") as HTMLInputElement | null;
	if (slider) slider.value = String(rounded);
	const badge = doc.getElementById("hueBadge");
	if (badge) badge.textContent = String(rounded);
	doc.querySelectorAll<HTMLElement>(".swatch[data-hue]").forEach((sw) => {
		const dh = Math.abs(parseFloat(sw.dataset.hue || "0") - rounded);
		sw.classList.toggle("is-active", dh < 1 || dh > 359);
	});
}

function applyHue(h: number) {
	const v = Math.round(((h % 360) + 360) % 360);
	root.style.setProperty("--accent-h", String(v));
	syncPaletteUI(v);
	persistHue(v);
}

function closePalette() {
	const pop = doc.getElementById("palettePop");
	const toggle = doc.getElementById("paletteToggle");
	if (pop) pop.hidden = true;
	if (toggle) toggle.setAttribute("aria-expanded", "false");
}

/* 每次导航后同步面板状态并复位收起（面板 DOM 会随 swap 重建）；
   显示设置面板形态（§4.103）无 palettePop，仍需同步 hue 控件 */
function initPalette() {
	const pop = doc.getElementById("palettePop");
	if (pop) closePalette();
	syncPaletteUI(currentHue());
}

/* ---------- 通用灯箱（PhotoSwipe，§4.69-§4.71，MIT 替换 Fancybox） ---------- */
/* 主题公共 API：data-lightbox（单图）、data-lightbox-group/data-lightbox-item（组浏览）、
   data-lightbox-gallery（文章级组容器，§4.70）。容器内 img 即灯箱项：文章页把封面+整篇
   img（独立段落 figure、行内图、image-grid 网格图）归为一组（§4.71：封面经 wrapper 容器
   入组、成为组内第 0 张），左右切换/计数/缩略图条共享同一上下文；显式
   [data-lightbox]/[data-lightbox-group] 经 closest 就近匹配优先于文章容器。
   嵌套容器都会被绑定点击监听而双重触发开图，故内层绝不能再套组属性——rehypeFigure 产物
   （figure 包裸 img）也因此不带 data-lightbox（§4.70）。v5 的 _domElementToItemData 只从
   <a> 读 data-pswp-*，裸 img 结构下经 itemData filter 直读 element 补 src 与
   naturalWidth/Height。preloadFirstSlide 关闭：v5 打开前会预生成首图 Content 并注入 core
   缓存，数据不全时完整 itemData 无法生效，直接关掉最稳。自定义 UI（§4.70/§4.71）：uiRegister
   时惰性补齐 {gallery} 形 dataSource 的 items（与 core 同一逻辑 querySelectorAll('img')，
   谁先填充索引都一致），再按图数注册全屏按钮（恒有）与自动播放按钮/缩略图条/缩略图开关
   （>1 图；开关状态模块级跨打开保持）。PhotoSwipe v5 内置键盘/滑动/箭头/计数/关闭，
   wheelToZoom 对齐桌面滚轮缩放；pswp core 经 pswpModule 动态加载，保持代码分割。点击须
   落在 img 上（children 只匹配后代，容器空白处不触发）。 */
type PswpLightbox = typeof import("photoswipe/lightbox")["default"];
let pswpLightbox: PswpLightbox | null = null;
const LB_SELECTOR =
	"[data-lightbox], [data-lightbox-group], [data-lightbox-gallery]";
const LB_SLIDESHOW_INTERVAL = 4000;
/* 缩略图条显隐（§4.71）：模块级状态跨灯箱打开/跨页面导航保持用户选择 */
let lbThumbsVisible = true;

async function initLightbox() {
	if (!doc.querySelector(LB_SELECTOR)) return;
	/* photoswipe/lightbox 仅 default 导出（export { PhotoSwipeLightbox as default }），解构命名导出会拿到 undefined */
	const { default: PhotoSwipeLightbox } = await import("photoswipe/lightbox");
	/* destroy 放在 await 之后：initPage 首帧直跑与 astro:page-load 首载也会触发，两次调用
	   在 await 处交错时，先恢复者创建的实例会被后恢复者覆盖模块变量而泄漏双绑定 */
	pswpLightbox?.destroy();
	pswpLightbox = null;
	const lb = new PhotoSwipeLightbox({
		gallery: LB_SELECTOR,
		children: "img",
		preloadFirstSlide: false,
		wheelToZoom: true,
		pswpModule: () => import("photoswipe"),
		l10n: {
			closeTitle: ui("close"),
			arrowPrevTitle: ui("prevImage"),
			arrowNextTitle: ui("nextImage"),
		},
	});
	pswpLightbox = lb;
	/* v5 只从 <a> 读 data-pswp-*，裸 img 结构下 itemData 仅 { element }；
	   filter 直读 element 本身，不经模块变量间接寻址，任何实例交错状态下都正确 */
	lb.addFilter("itemData", (itemData) => {
		const el = itemData.element;
		const img = el instanceof HTMLImageElement ? el : el?.querySelector("img");
		if (!img) return itemData;
		if (!itemData.src) itemData.src = img.currentSrc || img.src;
		/* §4.106：列表 img 可能是缩略图（data-full-* 携带原图 URL 与尺寸）——
		   优先打开原图；无数据时沿用 img 自身 src 与 natural 尺寸 */
		if (img.dataset.fullSrc) {
			itemData.src = img.dataset.fullSrc;
			if (Number(img.dataset.fullWidth) > 0 && Number(img.dataset.fullHeight) > 0) {
				itemData.width = Number(img.dataset.fullWidth);
				itemData.height = Number(img.dataset.fullHeight);
			}
		} else if (img.naturalWidth > 0) {
			itemData.width = img.naturalWidth;
			itemData.height = img.naturalHeight;
		}
		return itemData;
	});
	/* 自定义 UI（§4.70）：全屏/自动播放/缩略图条。uiRegister 在 UI 构建期触发一次，
	   此时 pswp 就绪；{gallery} 形 dataSource 的 items 可能尚未被 core 惰性填充，主动补齐 */
	lb.on("uiRegister", () => {
		const pswp = lb.pswp;
		const ds = pswp?.options?.dataSource;
		if (!pswp || !ds) return;
		if (!Array.isArray(ds) && ds.gallery && !ds.items) {
			const gal =
				ds.gallery instanceof Element
					? ds.gallery
					: Array.isArray(ds.gallery)
						? ds.gallery[0]
						: null;
			if (gal) {
				ds.items = Array.from(
					gal.querySelectorAll<HTMLImageElement>("img"),
				).map((el) => ({ element: el }));
			}
		}
		const items = Array.isArray(ds) ? ds : (ds.items ?? []);
		if (!pswp.ui) return;

		/* 全屏（灯箱根元素进全屏；enter/exit 两态图标由 :fullscreen CSS 切换） */
		pswp.ui.registerElement({
			name: "qy-fullscreen",
			title: ui("fullscreen"),
			ariaLabel: ui("fullscreen"),
			isButton: true,
			appendTo: "bar",
			order: 8,
			html:
				'<svg class="qy-pswp-icn qy-icn-fs-enter" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>' +
				'<svg class="qy-pswp-icn qy-icn-fs-exit" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/></svg>',
			onClick: () => {
				type FsElement = HTMLElement & {
					webkitRequestFullscreen?: () => Promise<void> | void;
				};
				type FsDocument = Document & {
					webkitFullscreenElement?: Element | null;
					webkitExitFullscreen?: () => Promise<void> | void;
				};
				const d = doc as FsDocument;
				const target = pswp.element as FsElement | undefined;
				if (!target) return;
				if (d.fullscreenElement || d.webkitFullscreenElement) {
					(d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
				} else {
					(target.requestFullscreen || target.webkitRequestFullscreen)?.call(
						target,
					);
				}
			},
		});

		if (items.length < 2) return;

		/* 自动播放（is-active 态切 play/pause 图标；播到末张自动停；销毁时清定时器） */
		let slideshowTimer = 0;
		const stopSlideshow = (btn: HTMLElement) => {
			if (!slideshowTimer) return;
			clearInterval(slideshowTimer);
			slideshowTimer = 0;
			btn.classList.remove("is-active");
		};
		pswp.ui.registerElement({
			name: "qy-slideshow",
			title: ui("slideshow"),
			ariaLabel: ui("slideshow"),
			isButton: true,
			appendTo: "bar",
			order: 9,
			html:
				'<svg class="qy-pswp-icn qy-icn-fill qy-icn-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>' +
				'<svg class="qy-pswp-icn qy-icn-fill qy-icn-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7z"/><path d="M13.5 5H17v14h-3.5z"/></svg>',
			onClick: (_e, btn) => {
				if (slideshowTimer) {
					stopSlideshow(btn);
					return;
				}
				btn.classList.add("is-active");
				slideshowTimer = window.setInterval(
					() => pswp.next(),
					LB_SLIDESHOW_INTERVAL,
				);
			},
		});
		pswp.on("change", () => {
			if (slideshowTimer && pswp.currIndex === items.length - 1) {
				const btn = pswp.element?.querySelector<HTMLElement>(
					".pswp__button--qy-slideshow",
				);
				if (btn) stopSlideshow(btn);
			}
		});
		pswp.on("destroy", () => {
			if (slideshowTimer) clearInterval(slideshowTimer);
			slideshowTimer = 0;
		});

		/* 缩略图条（root 层横滚条，点击跳转；change 时同步高亮并居中滚动） */
		pswp.ui.registerElement({
			name: "qy-thumbs",
			tagName: "div",
			appendTo: "root",
			onInit: (el) => {
				items.forEach((item, i) => {
					const img =
						item.element instanceof HTMLImageElement ? item.element : null;
					const src =
						(img && (img.currentSrc || img.getAttribute("src"))) ||
						item.src ||
						"";
					const thumb = doc.createElement("button");
					thumb.type = "button";
					thumb.className = "pswp__qy-thumb";
					thumb.dataset.index = String(i);
					const thumbImg = doc.createElement("img");
					thumbImg.loading = "lazy";
					thumbImg.alt = "";
					if (src) thumbImg.src = src;
					thumb.appendChild(thumbImg);
					el.appendChild(thumb);
				});
				el.addEventListener("click", (e) => {
					const btn = (e.target as HTMLElement).closest<HTMLElement>(
						".pswp__qy-thumb",
					);
					const idx = btn?.dataset.index;
					if (idx !== undefined) pswp.goTo(Number(idx));
				});
				const sync = () => {
					el.querySelector(".pswp__qy-thumb.is-active")?.classList.remove(
						"is-active",
					);
					const active = el.children[pswp.currIndex];
					if (active instanceof HTMLElement) {
						active.classList.add("is-active");
						active.scrollIntoView({
							block: "nearest",
							inline: "center",
							behavior: "smooth",
						});
					}
				};
				pswp.on("change", sync);
				sync();
			},
		});

		/* 缩略图条开关（§4.71）：is-active/aria-pressed 表示「显示中」；模块级状态跨打开保持，
		   收起后重新显示时 dispatch change 触发 sync 把高亮缩略图滚回居中 */
		pswp.ui.registerElement({
			name: "qy-thumbs-toggle",
			title: ui("thumbs"),
			ariaLabel: ui("thumbs"),
			isButton: true,
			appendTo: "bar",
			order: 7,
			html: '<svg class="qy-pswp-icn" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M9 8v8"/><path d="M15 8v8"/></svg>',
			onInit: (btn) => {
				btn.classList.toggle("is-active", lbThumbsVisible);
				btn.setAttribute("aria-pressed", String(lbThumbsVisible));
				if (!lbThumbsVisible) {
					pswp.element
						?.querySelector(".pswp__qy-thumbs")
						?.classList.add("is-hidden");
				}
			},
			onClick: (_e, btn) => {
				lbThumbsVisible = !lbThumbsVisible;
				pswp.element
					?.querySelector(".pswp__qy-thumbs")
					?.classList.toggle("is-hidden", !lbThumbsVisible);
				btn.classList.toggle("is-active", lbThumbsVisible);
				btn.setAttribute("aria-pressed", String(lbThumbsVisible));
				if (lbThumbsVisible) pswp.dispatch("change");
			},
		});
	});
	lb.init();
}

/* ---------- 页面级初始化（每次导航执行） ---------- */
function initNavActive() {
	const page = doc.body.getAttribute("data-page");
	if (!page) return;
	doc.querySelectorAll<HTMLElement>(".nav-item.is-active").forEach((n) => {
		n.classList.remove("is-active");
	});
	doc
		.querySelectorAll<HTMLElement>(
			".nav-link[data-nav], .nav-sub-link[data-nav]",
		)
		.forEach((link) => {
			const on = link.getAttribute("data-nav") === page;
			link.classList.toggle("is-active", on);
			/* 子链接激活时父项同步高亮（§4.16 子菜单） */
			if (on) link.closest(".nav-item")?.classList.add("is-active");
		});
}

function closeMobileNav() {
	const nav = doc.getElementById("siteNav");
	const burger = doc.getElementById("navToggle");
	if (nav) nav.classList.remove("open");
	if (burger) burger.setAttribute("aria-expanded", "false");
}

/* reveal：全部同步入场（§4.40）：原 70ms 逐个级联在元素多时此起彼伏，
   整屏持续变化被感知为频闪——改为一帧后 batch 加类，单次整体淡入。
   reduced-motion 由 CSS 全局禁用过场兜底 */
function initReveal() {
	const reveals = doc.querySelectorAll(".reveal");
	if (!reveals.length) return;
	requestAnimationFrame(() => {
		reveals.forEach((el) => {
			el.classList.add("is-in");
		});
	});
}

/* TOC 高亮：IntersectionObserver，与原型同款 rootMargin */
let spy: IntersectionObserver | null = null;
function initTocSpy() {
	if (spy) {
		spy.disconnect();
		spy = null;
	}
	const tocLinks = doc.querySelectorAll<HTMLElement>('.toc a[href^="#"]');
	const headings = doc.querySelectorAll<HTMLElement>(
		".prose h2[id], .prose h3[id], .prose h4[id]",
	);
	if (
		!tocLinks.length ||
		!headings.length ||
		!("IntersectionObserver" in window)
	)
		return;
	const map = new Map<string, Element>();
	tocLinks.forEach((a) => {
		const href = a.getAttribute("href");
		if (href) map.set(href.slice(1), a);
	});
	spy = new IntersectionObserver(
		(entries) => {
			for (const en of entries) {
				if (!en.isIntersecting) continue;
				tocLinks.forEach((a) => {
					a.classList.remove("is-active");
				});
				const link = map.get(en.target.id);
				if (link) link.classList.add("is-active");
			}
		},
		{ rootMargin: "-30% 0px -60% 0px" },
	);
	headings.forEach((h) => {
		spy?.observe(h);
	});
}

/* back-top 显隐（window 级监听只挂一次，元素每次现查，VT 安全） */
function updateBackTop() {
	const backTop = doc.getElementById("backTop");
	if (!backTop) return;
	backTop.hidden = (window.scrollY || root.scrollTop) <= 480;
}

/* 阅读进度条（§4.12）：仅文章页有元素，scaleX 驱动零重排；内容不足一屏时隐藏 */
function updateReadProgress() {
	const bar = doc.getElementById("readProgress");
	if (!bar) return;
	const max = doc.documentElement.scrollHeight - window.innerHeight;
	if (max <= 0) {
		bar.hidden = true;
		return;
	}
	bar.hidden = false;
	bar.style.transform = `scaleX(${Math.min((window.scrollY || 0) / max, 1)})`;
}
window.addEventListener(
	"scroll",
	() => {
		updateBackTop();
		updateReadProgress();
		updateWallpaperScroll();
	},
	{ passive: true },
);
window.addEventListener("resize", updateReadProgress, { passive: true });

/* ---------- 搜索（M3b-b6 → §4.104）：Pagefind 构建期索引，标准动态 import 接入。
   导航浮层：输入即搜，最多 8 条，超出时尾部「查看全部」链接进独立搜索页；
   独立搜索页（/search/）：URL ?q= 关键词 + ?page= 页码，客户端分页渲染 ---------- */
type PagefindResultData = {
	url: string;
	excerpt: string;
	meta?: { title?: string };
};
type Pagefind = {
	search: (
		q: string,
	) => Promise<{ results: Array<{ data: () => Promise<PagefindResultData> }> }>;
	options?: (o: Record<string, unknown>) => Promise<void>;
};

/* undefined=未加载 null=不可用（dev 无索引/加载失败）；模块级缓存，VT 换页不重复加载 */
let pagefind: Pagefind | null | undefined;

async function loadPagefind(): Promise<Pagefind | null> {
	if (pagefind !== undefined) return pagefind;
	try {
		const src = "/pagefind/pagefind.js";
		// 标准 Pagefind 接入（官方推荐）：运行时直接动态 import 构建期索引入口。
		// 变量形式 + @vite-ignore：索引是 build 后才存在的产物，构建期不做静态解析，
		// dev 无索引时 import 失败走 catch 降级提示
		const pf = (await import(/* @vite-ignore */ src)) as unknown as Pagefind;
		if (pf.options) await pf.options({ excerptLength: 20 });
		pagefind = pf;
	} catch {
		pagefind = null;
	}
	return pagefind;
}

/* 浮层最多展示 8 条（§4.56 视口内条数），超出引导进独立搜索页（§4.104） */
const SEARCH_POP_MAX = 8;

/* 结果项（浮层与搜索页共用）：标题 + pagefind 受限高亮摘要 */
function searchItemEl(item: PagefindResultData): HTMLAnchorElement {
	const a = doc.createElement("a");
	a.className = "search-item";
	a.href = item.url;
	const title = doc.createElement("div");
	title.className = "search-item-title";
	title.textContent = item.meta?.title || item.url;
	const excerpt = doc.createElement("div");
	excerpt.className = "search-item-excerpt";
	/* pagefind 产出的受限高亮片段（<mark>/<strong>），非用户输入 */
	excerpt.innerHTML = item.excerpt;
	a.append(title, excerpt);
	return a;
}

function setSearchHint(text: string) {
	const box = doc.getElementById("searchResults");
	if (!box) return;
	box.replaceChildren();
	const p = doc.createElement("div");
	p.className = "search-hint";
	p.textContent = text;
	box.appendChild(p);
	box.hidden = false;
}

/* 请求序号：只接受最后一次输入的响应，防乱序覆盖 */
let searchSeq = 0;

function renderSearchResults(
	items: PagefindResultData[],
	more?: { keyword: string; total: number },
) {
	const box = doc.getElementById("searchResults");
	if (!box) return;
	box.replaceChildren();
	for (const item of items) box.appendChild(searchItemEl(item));
	if (more) {
		/* §4.104 超出浮层上限：尾部「查看全部 N 条结果」链接进独立搜索页 */
		const link = doc.createElement("a");
		link.className = "search-more";
		link.href = "/search/?q=" + encodeURIComponent(more.keyword);
		link.textContent = ui("searchMore").replace("{n}", String(more.total));
		box.appendChild(link);
	}
	box.hidden = false;
}

function closeSearch() {
	const pop = doc.getElementById("searchPop");
	if (pop && !pop.hidden) {
		pop.hidden = true;
		doc.getElementById("searchToggle")?.setAttribute("aria-expanded", "false");
	}
	/* §4.56 双输入框：桌面内联 + 移动端浮层内，关闭时一并清空 */
	for (const id of ["searchInput", "searchInputM"]) {
		const input = doc.getElementById(id) as HTMLInputElement | null;
		if (input) input.value = "";
	}
	const box = doc.getElementById("searchResults");
	if (box) {
		box.hidden = true;
		box.replaceChildren();
	}
}

/* 打开搜索（§4.12 快捷键用）：桌面聚焦内联框（输入即出结果浮层）；
   内联框不可见（<640px 移动形态）时打开浮层并聚焦浮层内输入框 */
function openSearch() {
	const inline = doc.getElementById("searchInput") as HTMLInputElement | null;
	if (inline?.offsetParent) {
		inline.focus();
		return;
	}
	const pop = doc.getElementById("searchPop");
	if (!pop?.hidden) return;
	pop.hidden = false;
	doc.getElementById("searchToggle")?.setAttribute("aria-expanded", "true");
	(doc.getElementById("searchInputM") as HTMLInputElement | null)?.focus();
}

/* 输入 → 300ms 防抖查询；searchSeq 丢弃过期响应；§4.56 有词即弹出结果浮层 */
function runSearch(keyword: string) {
	const seq = ++searchSeq;
	const box = doc.getElementById("searchResults");
	const pop = doc.getElementById("searchPop");
	if (!box || !pop) return;
	if (!keyword) {
		pop.hidden = true;
		box.hidden = true;
		box.replaceChildren();
		return;
	}
	pop.hidden = false;
	setSearchHint(ui("searchLoading"));
	window.setTimeout(async () => {
		if (seq !== searchSeq) return;
		const pf = await loadPagefind();
		if (seq !== searchSeq) return;
		if (!pf) {
			setSearchHint(ui("searchUnavailable"));
			return;
		}
		try {
			const res = await pf.search(keyword);
			/* res.results.length 即命中总数（惰性 API）；浮层只取前 SEARCH_POP_MAX 条加载详情 */
			const total = res.results.length;
			const items = await Promise.all(
				res.results.slice(0, SEARCH_POP_MAX).map((r) => r.data()),
			);
			if (seq !== searchSeq) return;
			if (total > SEARCH_POP_MAX) {
				renderSearchResults(items, { keyword, total });
			} else if (items.length) {
				renderSearchResults(items);
			} else {
				setSearchHint(ui("searchNoResults"));
			}
		} catch {
			if (seq === searchSeq) setSearchHint(ui("searchNoResults"));
		}
	}, 300);
}

/* ---------- 独立搜索页（§4.104，/search/）：URL ?q= 关键词 + ?page= 页码。
   静态外壳 + 客户端查询分页；输入即时刷新（replaceState 不经换页），
   翻页走真实链接经 VT 换页后由 astro:page-load 重新渲染 ---------- */
const SEARCH_PAGE_SIZE = 10;
let searchPageSeq = 0;
let searchPageTimer = 0;

/* 页码窗口：恒含首末页与当前页±2，间隙以省略号占位（与 Pagination.astro 同规则） */
function pagerNums(page: number, total: number): Array<number | "ellipsis"> {
	const set = new Set<number>([1, total]);
	for (let p = page - 2; p <= page + 2; p++) {
		if (p >= 1 && p <= total) set.add(p);
	}
	const nums = [...set].sort((a, b) => a - b);
	const out: Array<number | "ellipsis"> = [];
	let prev = 0;
	for (const n of nums) {
		if (prev && n - prev > 1) out.push("ellipsis");
		out.push(n);
		prev = n;
	}
	return out;
}

function searchPageHref(q: string, page: number): string {
	return (
		"/search/?q=" +
		encodeURIComponent(q) +
		(page > 1 ? "&page=" + page : "")
	);
}

function renderSearchPager(pager: HTMLElement, q: string, cur: number, pages: number) {
	if (pages <= 1) {
		pager.hidden = true;
		return;
	}
	pager.hidden = false;
	const nums = doc.createElement("div");
	nums.className = "pg-nums";
	const mk = (href: string, label: string, cls: string) => {
		const a = doc.createElement("a");
		a.className = cls;
		a.href = href;
		a.textContent = label;
		return a;
	};
	const span = (label: string) => {
		const s = doc.createElement("span");
		s.className = "page-item disabled";
		s.textContent = label;
		return s;
	};
	if (cur > 1) nums.appendChild(mk(searchPageHref(q, cur - 1), "‹", "page-item"));
	else nums.appendChild(span("‹"));
	for (const n of pagerNums(cur, pages)) {
		if (n === "ellipsis") {
			const gap = doc.createElement("span");
			gap.className = "pg-gap";
			gap.textContent = "…";
			nums.appendChild(gap);
		} else if (n === cur) {
			const s = doc.createElement("span");
			s.className = "page-item current";
			s.setAttribute("aria-current", "page");
			s.textContent = String(n);
			nums.appendChild(s);
		} else {
			nums.appendChild(mk(searchPageHref(q, n), String(n), "page-item"));
		}
	}
	if (cur < pages) nums.appendChild(mk(searchPageHref(q, cur + 1), "›", "page-item"));
	else nums.appendChild(span("›"));

	const adj = doc.createElement("div");
	adj.className = "pg-adj";
	if (cur > 1) adj.appendChild(mk(searchPageHref(q, cur - 1), ui("prevPage"), "pg-prev"));
	else adj.appendChild(span(ui("prevPage")));
	const mid = doc.createElement("span");
	mid.textContent = ui("pageOf")
		.replace("{current}", String(cur))
		.replace("{total}", String(pages));
	adj.appendChild(mid);
	if (cur < pages) adj.appendChild(mk(searchPageHref(q, cur + 1), ui("nextPage"), "pg-next"));
	else adj.appendChild(span(ui("nextPage")));

	pager.replaceChildren(nums, adj);
}

async function renderSearchPage() {
	const seq = ++searchPageSeq;
	const input = doc.getElementById("searchPageInput") as HTMLInputElement | null;
	const meta = doc.getElementById("searchPageMeta");
	const box = doc.getElementById("searchPageResults");
	const pager = doc.getElementById("searchPagePager");
	if (!input || !meta || !box || !pager) return;

	const params = new URLSearchParams(location.search);
	const q = (params.get("q") || "").trim();
	const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
	input.value = q;
	pager.hidden = true;

	if (!q) {
		box.replaceChildren();
		meta.textContent = ui("searchTypeSomething");
		return;
	}
	meta.textContent = ui("searchLoading");

	const pf = await loadPagefind();
	if (seq !== searchPageSeq) return;
	if (!pf) {
		meta.textContent = ui("searchUnavailable");
		box.replaceChildren();
		return;
	}
	try {
		const res = await pf.search(q);
		const total = res.results.length;
		if (seq !== searchPageSeq) return;
		if (!total) {
			box.replaceChildren();
			meta.textContent = ui("searchNoResults");
			return;
		}
		const pages = Math.ceil(total / SEARCH_PAGE_SIZE);
		const cur = Math.min(page, pages);
		const items = await Promise.all(
			res.results
				.slice((cur - 1) * SEARCH_PAGE_SIZE, cur * SEARCH_PAGE_SIZE)
				.map((r) => r.data()),
		);
		if (seq !== searchPageSeq) return;
		box.replaceChildren();
		for (const item of items) box.appendChild(searchItemEl(item));
		meta.textContent = ui("searchResultsTotal").replace("{n}", String(total));
		renderSearchPager(pager, q, cur, pages);
	} catch {
		if (seq === searchPageSeq) meta.textContent = ui("searchNoResults");
	}
}

/* ---------- 加密文章（M3b-b7）：Web Crypto 解密（与 utils/crypto.ts 构建期参数对齐） ---------- */
const PW_KEY_PREFIX = "qy-pw:";
const ENC_SALT_LEN = 16;
const ENC_IV_LEN = 12;
const ENC_TAG_LEN = 16;

function b64ToBytes(b64: string): Uint8Array {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

/** base64 密文 → PBKDF2(100k, SHA-256) 派生密钥 → AES-GCM 解密 → HTML 字符串 */
async function decryptContent(dataB64: string, pwd: string): Promise<string> {
	const raw = b64ToBytes(dataB64);
	const salt = raw.slice(0, ENC_SALT_LEN);
	const iv = raw.slice(ENC_SALT_LEN, ENC_SALT_LEN + ENC_IV_LEN);
	const tag = raw.slice(
		ENC_SALT_LEN + ENC_IV_LEN,
		ENC_SALT_LEN + ENC_IV_LEN + ENC_TAG_LEN,
	);
	const ct = raw.slice(ENC_SALT_LEN + ENC_IV_LEN + ENC_TAG_LEN);
	// Web Crypto 的 GCM 密文格式为 ciphertext+tag 连续排列，与 node:crypto 的分离输出拼接
	const combined = new Uint8Array(ct.length + ENC_TAG_LEN);
	combined.set(ct);
	combined.set(tag, ct.length);

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(pwd),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	const key = await crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["decrypt"],
	);
	const plain = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		combined,
	);
	return new TextDecoder().decode(plain);
}

/** 解密成功：注入 HTML → 隐藏锁 UI → 重跑 reveal 动画 + 灯箱属性预置（§4.68） */
function showDecrypted(
	container: HTMLElement,
	contentEl: HTMLElement,
	html: string,
) {
	contentEl.innerHTML = html;
	contentEl.hidden = false;
	container.hidden = true;
	initReveal();
	initLightbox();
}

function initEncrypted() {
	const container = doc.getElementById("encryptedContainer");
	const contentEl = doc.getElementById("decryptedContent");
	if (!container || !contentEl || container.hidden) return;
	const data = container.getAttribute("data-encrypted") || "";
	if (!data) return;
	const slug = container.getAttribute("data-slug") || "";
	const cacheKey = PW_KEY_PREFIX + slug;
	const form = doc.getElementById("encForm") as HTMLFormElement | null;
	const input = doc.getElementById("encInput") as HTMLInputElement | null;
	const errorEl = doc.getElementById("encError");

	form?.addEventListener("submit", (e) => {
		e.preventDefault();
		const pwd = input?.value.trim() ?? "";
		if (!pwd) return;
		if (errorEl) errorEl.hidden = true;
		decryptContent(data, pwd)
			.then((html) => {
				try {
					sessionStorage.setItem(cacheKey, pwd);
				} catch {
					/* ignore */
				}
				showDecrypted(container, contentEl, html);
			})
			.catch(() => {
				if (errorEl) errorEl.hidden = false;
			});
	});

	/* 缓存密码自动解密（salt/iv 确定性派生：同 slug+密码同密文，缓存跨刷新有效） */
	try {
		const cached = sessionStorage.getItem(cacheKey);
		if (cached) {
			decryptContent(data, cached)
				.then((html) => showDecrypted(container, contentEl, html))
				.catch(() => {
					try {
						sessionStorage.removeItem(cacheKey);
					} catch {
						/* ignore */
					}
				});
		}
	} catch {
		/* ignore */
	}
}

/* ---------- document 级委托（一次性，VT 换页不失联） ---------- */
doc.addEventListener("click", (e) => {
	const target = e.target as Element;
	if (!target || typeof target.closest !== "function") return;

	/* 点击调色面板/搜索浮层/显示设置面板外部时先收起（不拦截后续点击行为） */
	if (!target.closest(".palette-wrap")) {
		const pop = doc.getElementById("palettePop");
		if (pop && !pop.hidden) closePalette();
	}
	if (!target.closest(".search-wrap")) {
		const pop = doc.getElementById("searchPop");
		if (pop && !pop.hidden) closeSearch();
	}
	if (
		!target.closest(".ds-panel") &&
		!target.closest("#displaySettingsToggle")
	) {
		const panel = doc.getElementById("displaySettingsPanel");
		if (panel && !panel.hidden) closeDsPanel();
	}

	/* 搜索浮层开关（§4.56 移动端 icon 按钮；桌面内联框输入即搜，无开关） */
	if (target.closest("#searchToggle")) {
		const pop = doc.getElementById("searchPop");
		if (pop) {
			pop.hidden = !pop.hidden;
			doc
				.getElementById("searchToggle")
				?.setAttribute("aria-expanded", pop.hidden ? "false" : "true");
			if (!pop.hidden) {
				(
					doc.getElementById("searchInputM") as HTMLInputElement | null
				)?.focus();
			}
		}
		return;
	}

	/* 搜索结果/查看全部点击：浮层收起后放行默认导航（VT 接管换页；search-more 进独立搜索页） */
	if (target.closest(".search-item, .search-more")) {
		closeSearch();
	}

	/* 调色面板开关 */
	const paletteToggle = target.closest("#paletteToggle");
	if (paletteToggle) {
		const pop = doc.getElementById("palettePop");
		if (pop) {
			pop.hidden = !pop.hidden;
			paletteToggle.setAttribute(
				"aria-expanded",
				pop.hidden ? "false" : "true",
			);
		}
		return;
	}

	/* 预设色板（旧 palette-pop 与显示设置面板外观 Tab 共用同组 swatch） */
	const swatch = target.closest<HTMLElement>(".swatch[data-hue]");
	if (swatch) {
		const h = parseFloat(swatch.dataset.hue || "");
		if (Number.isFinite(h)) applyHue(h);
		return;
	}

	/* hue 重置：移除运行时覆写，回落到构建期 accentColor */
	if (target.closest("#hueReset")) {
		root.style.removeProperty("--accent-h");
		persistHue(null);
		syncPaletteUI(buildHue());
		return;
	}

	/* 模式切换 */
	if (target.closest("#modeToggle")) {
		const dark = root.classList.toggle("dark");
		try {
			localStorage.setItem("qy-mode", dark ? "dark" : "light");
		} catch {
			/* ignore */
		}
		return;
	}

	/* 壁纸模式循环切换（§4.98）：banner→fullscreen→overlay→none，localStorage 持久化 */
	if (target.closest("#wallpaperModeToggle")) {
		const cur = WP_MODES.indexOf(root.dataset.wallpaperMode || "banner");
		setWallpaperMode(WP_MODES[(cur + 1) % WP_MODES.length]!);
		return;
	}

	/* 显示设置面板（§4.103）：齿轮开合 / Tab 切换 / 模式与布局按钮 / 开关 / 组重置 */
	if (handleDsPanelClick(target)) return;

	/* 壁纸视频播放/暂停（§4.98） */
	if (target.closest("#wpPlayerToggle")) {
		const video = doc.querySelector<HTMLVideoElement>(".wp-video");
		if (video) {
			if (video.paused) video.play().catch(() => {});
			else video.pause();
		}
		return;
	}

	/* 壁纸视频上一段/下一段 */
	if (target.closest("#wpPlayerPrev")) {
		switchWallpaperVideo(-1);
		return;
	}
	if (target.closest("#wpPlayerNext")) {
		switchWallpaperVideo(1);
		return;
	}

	/* burger 导航 */
	if (target.closest("#navToggle")) {
		const nav = doc.getElementById("siteNav");
		if (nav) {
			const open = nav.classList.toggle("open");
			target
				.closest("#navToggle")
				?.setAttribute("aria-expanded", open ? "true" : "false");
		}
		return;
	}

	/* nav 子菜单 toggle（§4.16）：无 href 的父项点击展开/收起 */
	if (target.closest(".nav-sub-toggle")) {
		const item = target.closest(".nav-item");
		if (item) {
			const open = item.classList.toggle("open-sub");
			target
				.closest(".nav-sub-toggle")
				?.setAttribute("aria-expanded", open ? "true" : "false");
		}
		return;
	}

	/* 归档按年折叠（§4.30）：点击年份头切换该年时间线显隐 */
	if (target.closest(".archive-year")) {
		const btn = target.closest(".archive-year") as HTMLElement;
		const timeline = btn.closest(".timeline");
		if (timeline) {
			// toggle 返回 true = 加了 fold 类 = 已收起
			const collapsed = timeline.classList.toggle("fold");
			btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
		}
		return;
	}

	/* 列表形态切换（§4.34）：toggle grid-mode + localStorage 记忆，CSS 过渡呈现 */
	if (target.closest("#layoutSwitch")) {
		const list = doc.getElementById("postList");
		const btn = target.closest("#layoutSwitch") as HTMLElement | null;
		if (list && btn && list.dataset.allowSwitch === "true") {
			const toGrid = !list.classList.contains("grid-mode");
			list.classList.toggle("grid-mode", toGrid);
			list.style.setProperty("--col-w", `${list.dataset.gridCol || "320"}px`);
			btn.setAttribute("aria-pressed", toGrid ? "true" : "false");
			try {
				localStorage.setItem("qy-postList", toGrid ? "grid" : "list");
			} catch {
				/* ignore */
			}
		}
		return;
	}

	/* back-top */
	if (target.closest("#backTop")) {
		window.scrollTo({ top: 0, behavior: "smooth" });
		return;
	}

	/* 分享海报（b9.6）：文章页「生成分享海报」按钮 */
	const shareBtn = target.closest("#qy-share-btn");
	if (shareBtn) {
		openSharePoster(shareBtn as HTMLElement);
		return;
	}
});

/* 随机封面加载失败重试（§4.33）：img error 不冒泡，捕获阶段 document 级委托
   （bundled 一次性执行，VT 换页后仍有效）。按 data-api-retries 顺序换源，
   全部失败加 cover-broken 藏 img，露出底层 LQIP 渐变占位。 */
doc.addEventListener(
	"error",
	(e) => {
		const img = e.target as HTMLImageElement | null;
		if (img?.tagName !== "IMG") return;
		const raw = img.dataset.apiRetries;
		if (!raw) return;
		let list: string[] = [];
		try {
			list = JSON.parse(raw);
		} catch {
			return;
		}
		const idx = Number(img.dataset.retryIdx ?? "1");
		if (idx >= 0 && idx < list.length) {
			img.dataset.retryIdx = String(idx + 1);
			img.src = list[idx];
		} else {
			img.classList.add("cover-broken");
		}
	},
	true,
);

/* input 委托（VT 安全）：hue 滑杆 + 搜索输入 + 显示设置面板透明滑块（§4.103） */
doc.addEventListener("input", (e) => {
	const el = e.target as Element | null;
	if (el && el.id === "hueSlider") {
		const h = parseFloat((el as HTMLInputElement).value);
		if (Number.isFinite(h)) applyHue(h);
	}
	if (el && (el.id === "searchInput" || el.id === "searchInputM")) {
		runSearch((el as HTMLInputElement).value.trim());
	}
	/* 独立搜索页输入（§4.104）：300ms 防抖 + replaceState 同步 URL，客户端即时刷新不经换页 */
	if (el && el.id === "searchPageInput") {
		const q = (el as HTMLInputElement).value.trim();
		window.clearTimeout(searchPageTimer);
		searchPageTimer = window.setTimeout(() => {
			const url = new URL(location.href);
			if (q) url.searchParams.set("q", q);
			else url.searchParams.delete("q");
			url.searchParams.delete("page");
			history.replaceState(null, "", url);
			renderSearchPage();
		}, 300);
	}
	if (el instanceof HTMLInputElement && el.dataset.dsSlider) {
		handleDsSliderInput(el);
	}
});

doc.addEventListener("keydown", (e) => {
	/* 搜索浮层/显示设置面板：Esc 关闭 */
	if (e.key === "Escape") {
		const pop = doc.getElementById("searchPop");
		if (pop && !pop.hidden) {
			closeSearch();
			return;
		}
		const panel = doc.getElementById("displaySettingsPanel");
		if (panel && !panel.hidden) {
			closeDsPanel();
			return;
		}
	}
	/* 搜索快捷键（§4.12）：/ 或 ⌘/Ctrl+K；输入中、灯箱（PhotoSwipe）打开时不触发 */
	if (
		e.key === "/" ||
		((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
	) {
		if (e.altKey || e.shiftKey) return;
		const el = e.target as HTMLElement | null;
		const typing =
			!!el &&
			(el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
		if (!typing && !pswpLightbox?.pswp) {
			e.preventDefault();
			openSearch();
		}
		return;
	}
});

/* ---------- LQIP（b9.5）：图片加载完成后淡出占位渐变 ---------- */
function initLqip() {
	doc.querySelectorAll<HTMLImageElement>("img[data-lqip]").forEach((img) => {
		const box = img.parentElement;
		if (!box) return;
		const done = () => box.classList.add("qy-img-in");
		// 缓存命中立即淡出；load/error 均淡出（失败也不能永久盖住图位）
		if (img.complete && img.naturalWidth > 0) done();
		else {
			img.addEventListener("load", done, { once: true });
			img.addEventListener("error", done, { once: true });
		}
	});
}

/* ---------- 分类栏溢出渐隐（§4.21）：scrollWidth 溢出 → .is-scrollable 显右缘渐隐 ---------- */
// 模块级保存 resize handler 引用：VT 换页重复 initPage 时先移除旧监听防泄漏
const catBarResize: { fn?: () => void } = {};
function initCategoryBar() {
	const bar = doc.querySelector<HTMLElement>(".category-bar");
	if (!bar) return;
	const scroll = bar.querySelector<HTMLElement>(".bar-scroll");
	if (!scroll) return;

	const measure = () => {
		// +1 容差防亚像素抖动；溢出时 CSS 右缘渐隐提示可横向滑动
		bar.classList.toggle(
			"is-scrollable",
			scroll.scrollWidth > scroll.clientWidth + 1,
		);
	};
	measure();
	// 字体加载会改变量宽，就绪后重测一次（ready 为全局单例 promise，重复 then 无害）
	document.fonts?.ready.then(measure).catch(() => {});
	if (catBarResize.fn) window.removeEventListener("resize", catBarResize.fn);
	catBarResize.fn = measure;
	window.addEventListener("resize", measure, { passive: true });
}

/* ---------- 列表形态恢复（§4.34→§4.55） ---------- */
/* VT 换页后内联 boot 脚本不重执行，由这里按 localStorage > defaultLayout 恢复 grid-mode。
   defaultLayout 无论 allowSwitch 开关均生效（allowSwitch 仅控制访客切换按钮） */
function initPostListLayout() {
	const list = doc.getElementById("postList");
	if (!list) return;
	let mode: string;
	try {
		mode =
			localStorage.getItem("qy-postList") ||
			list.dataset.defaultLayout ||
			"list";
	} catch {
		mode = list.dataset.defaultLayout || "list";
	}
	list.classList.toggle("grid-mode", mode === "grid");
	list.style.setProperty("--col-w", `${list.dataset.gridCol || "320"}px`);
	const btn = doc.getElementById("layoutSwitch");
	if (btn) btn.setAttribute("aria-pressed", mode === "grid" ? "true" : "false");
}

/* ---------- 专题导航定位（§4.58）：目录 280px 限高滚动，当前篇在可视区外时居中定位 ---------- */
/* 只滚 .series-nav-list 容器内部（rect 差值计算），不带动页面滚动；已可见时不动作 */
function initSeriesNav() {
	const list = doc.querySelector<HTMLElement>(".series-nav-list");
	const cur = list?.querySelector<HTMLElement>(".series-nav-item.cur");
	if (!list || !cur) return;
	const lr = list.getBoundingClientRect();
	const cr = cur.getBoundingClientRect();
	if (cr.top < lr.top || cr.bottom > lr.bottom) {
		list.scrollTop += (cr.top + cr.bottom) / 2 - (lr.top + lr.bottom) / 2;
	}
}

/* ---------- 壁纸（§4.98）：模式切换 / 图片轮播 / 打字机 / 视频播放器 ---------- */
const WP_KEY = "qy-wallpaper";
const WP_MODES = ["banner", "fullscreen", "overlay", "none"];
// 模块级定时器/游标：VT 换页重复 initWallpaper 时先清后建防泄漏
let wpCarouselTimer: number | undefined;
let wpTyperTimer: number | undefined;
let wpVideoIdx = 0;

function savedWallpaperMode(): string | null {
	try {
		const m = localStorage.getItem(WP_KEY);
		return m && WP_MODES.includes(m) ? m : null;
	} catch {
		return null;
	}
}

/* 导航栏形态联动：banner/fullscreen 走配置的透明档，overlay/none 回实底 */
function syncWallpaperNav(mode: string) {
	root.dataset.wallpaperNav =
		mode === "banner" || mode === "fullscreen"
			? root.dataset.wpNavConfig || "solid"
			: "solid";
}

/* 壁纸模式统一切换入口（§4.98 循环按钮与 §4.103 面板模式宫格共用）：
   banner/fullscreen 解除 homeOnly 隐藏，overlay/none 停视频并回实底导航；
   data-wp-stage-hidden 同步供 hero 布局取消首屏下推 */
function setWallpaperMode(next: string) {
	root.dataset.wallpaperMode = next;
	syncWallpaperNav(next);
	const stage = doc.querySelector<HTMLElement>(".wp-stage");
	if (stage) {
		if (next === "banner" || next === "fullscreen") {
			delete stage.dataset.wallpaperHidden;
			delete root.dataset.wpStageHidden;
		} else {
			stage.setAttribute("data-wallpaper-hidden", "");
			root.dataset.wpStageHidden = "true";
		}
	}
	if (next === "overlay" || next === "none") pauseWallpaperVideo();
	try {
		localStorage.setItem(WP_KEY, next);
	} catch {
		/* ignore */
	}
	syncDsPanelState();
}

function pauseWallpaperVideo() {
	const video = doc.querySelector<HTMLVideoElement>(".wp-video");
	if (video && !video.paused) video.pause();
}

/* 恢复访客保存的壁纸模式（after-swap 与 initWallpaper 双入口，幂等）：
   boot 脚本负责首帧，这里兜底 VT 换页；显式偏好解除 homeOnly 的非首页隐藏；
   §4.103：面板开启时追加恢复布局/开关/透明三件套（html style 随 swap 重建需重应用）。
   注意：即使保存模式与 SSR 模式相同，也必须同步 data-wallpaper-hidden，否则
   非首页刷新时 SSR 渲染的隐藏标记不会被清除（banner/fullscreen 应始终可见） */
function applySavedWallpaper() {
	const m =
		root.dataset.wpSwitchable === "true"
			? savedWallpaperMode() || root.dataset.wallpaperMode
			: root.dataset.wallpaperMode;
	if (m && m !== root.dataset.wallpaperMode) {
		root.dataset.wallpaperMode = m;
		syncWallpaperNav(m);
	}
	const stage = doc.querySelector<HTMLElement>(".wp-stage");
	if (stage) {
		if (m === "banner" || m === "fullscreen") {
			delete stage.dataset.wallpaperHidden;
			delete root.dataset.wpStageHidden;
		} else {
			stage.setAttribute("data-wallpaper-hidden", "");
			root.dataset.wpStageHidden = "true";
		}
	}
	if (root.dataset.dsEnable === "true") applyDsPrefs();
}

/* 图片轮播：desktop/mobile 两组独立游标，--wp-interval 供 kenburns/zoom 动画时长对齐；
   §4.103：访客经面板关闭轮播（html[data-wp-carousel="off"]）时不建定时器 */
function initWallpaperCarousel() {
	const stage = doc.querySelector<HTMLElement>(".wp-stage");
	if (!stage || stage.dataset.carousel !== "true") return;
	if (root.dataset.wpCarousel === "off") return;
	const groups = Array.from(stage.querySelectorAll<HTMLElement>(".wp-images"));
	if (groups.length === 0) return;
	const interval =
		Math.max(1000, parseInt(stage.dataset.carouselInterval || "5000", 10)) ||
		5000;
	stage.style.setProperty("--wp-interval", `${(interval / 1000).toFixed(2)}s`);
	const cursors = groups.map(() => 0);
	wpCarouselTimer = window.setInterval(() => {
		groups.forEach((group, gi) => {
			const imgs = group.querySelectorAll(".wp-img");
			if (imgs.length < 2) return;
			imgs[cursors[gi]].classList.remove("active");
			cursors[gi] = (cursors[gi] + 1) % imgs.length;
			imgs[cursors[gi]].classList.add("active");
		});
	}, interval);
}

/* 逐字素切分（中文/emoji 安全），环境不支持时退回码元切分 */
function splitGraphemes(text: string): string[] {
	try {
		const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
		return Array.from(seg.segment(text), (s) => s.segment);
	} catch {
		return Array.from(text);
	}
}

/* 首页打字机：多条副标题循环（打完→停顿→删完→下一条），单条打完驻留 */
function initWallpaperTyper() {
	const el = doc.getElementById("wpTyper");
	if (!el) return;
	let subs: string[] = [];
	try {
		subs = JSON.parse(el.dataset.subtitles || "[]");
	} catch {
		/* ignore */
	}
	subs = subs.filter(Boolean);
	if (subs.length === 0) return;
	const speed = parseInt(el.dataset.speed || "100", 10) || 100;
	const delSpeed = parseInt(el.dataset.deleteSpeed || "50", 10) || 50;
	const pause = parseInt(el.dataset.pauseTime || "2000", 10) || 2000;
	const chars = subs.map(splitGraphemes);
	let si = 0;
	let ci = 0;
	let deleting = false;
	const tick = () => {
		const cur = chars[si];
		if (!deleting) {
			ci += 1;
			el.textContent = cur.slice(0, ci).join("");
			if (ci >= cur.length) {
				if (subs.length === 1) return;
				deleting = true;
				wpTyperTimer = window.setTimeout(tick, pause);
			} else {
				wpTyperTimer = window.setTimeout(tick, speed);
			}
		} else {
			ci -= 1;
			el.textContent = cur.slice(0, ci).join("");
			if (ci <= 0) {
				deleting = false;
				si = (si + 1) % subs.length;
				wpTyperTimer = window.setTimeout(tick, 300);
			} else {
				wpTyperTimer = window.setTimeout(tick, delSpeed);
			}
		}
	};
	wpTyperTimer = window.setTimeout(tick, speed);
}

/* 视频壁纸：初始源依 order/random 选取，自动播放（muted+playsinline 免手势），
   play/pause 事件同步按钮图标（is-playing）与 stage 播放态（data-video-playing） */
function initWallpaperVideo() {
	const video = doc.querySelector<HTMLVideoElement>(".wp-video");
	if (!video) return;
	let urls: string[] = [];
	try {
		urls = JSON.parse(video.dataset.playerUrls || "[]");
	} catch {
		/* ignore */
	}
	urls = urls.filter(Boolean);
	if (urls.length === 0) return;
	wpVideoIdx =
		video.dataset.playerMode === "random"
			? Math.floor(Math.random() * urls.length)
			: 0;
	video.src = urls[wpVideoIdx];
	video.loop = true;
	const sync = () => {
		const btn = doc.getElementById("wpPlayerToggle");
		if (btn) {
			btn.classList.toggle("is-playing", !video.paused);
			const label = video.paused ? ui("wpPlay") : ui("wpPause");
			btn.setAttribute("aria-label", label);
			btn.title = label;
		}
		doc
			.querySelector(".wp-stage")
			?.toggleAttribute("data-video-playing", !video.paused);
	};
	video.addEventListener("play", sync);
	video.addEventListener("pause", sync);
	sync();
	video.play().catch(() => sync()); // 自动播放被策略拦截时保持暂停态
}

/* 上一段/下一段视频（初始 idx 由 order/random 决定，此后线性切换） */
function switchWallpaperVideo(dir: 1 | -1) {
	const video = doc.querySelector<HTMLVideoElement>(".wp-video");
	if (!video) return;
	let urls: string[] = [];
	try {
		urls = JSON.parse(video.dataset.playerUrls || "[]");
	} catch {
		return;
	}
	if (urls.length === 0) return;
	wpVideoIdx = (wpVideoIdx + dir + urls.length) % urls.length;
	video.src = urls[wpVideoIdx];
	video.play().catch(() => {});
}

/* 导航栏滚动实底（html.wp-scrolled）：顶部走半透明档，滚过阈值回实底 */
function updateWallpaperScroll() {
	root.classList.toggle("wp-scrolled", (window.scrollY || 0) > 40);
}

function initWallpaper() {
	if (wpCarouselTimer !== undefined) {
		window.clearInterval(wpCarouselTimer);
		wpCarouselTimer = undefined;
	}
	if (wpTyperTimer !== undefined) {
		window.clearTimeout(wpTyperTimer);
		wpTyperTimer = undefined;
	}
	applySavedWallpaper();
	updateWallpaperScroll();
	if (!doc.querySelector(".wp-stage")) return;
	initWallpaperCarousel();
	initWallpaperTyper();
	initWallpaperVideo();
}

/* VT swap 替换 <html> 属性后立即恢复偏好模式（不等 page-load，防默认形态闪帧） */
doc.addEventListener("astro:after-swap", applySavedWallpaper);

/* ---------- 显示设置面板（§4.103，对齐 Firefly） ----------
   齿轮入口三 Tab 浮层（外观/壁纸/特效）；localStorage 键表见 design.md §4.103。
   应用机制：html data 属性（显隐类）+ html style CSS 变量（透明三件套），
   boot 内联脚本（BaseLayout）首帧应用，applyDsPrefs 为 after-swap/初始化双入口 */
const DS_KEY = {
	fsLayout: "qy-wp-fs-layout",
	homeText: "qy-wp-home-text",
	carousel: "qy-wp-carousel",
	waves: "qy-wp-waves",
	gradient: "qy-wp-gradient",
	opacity: "qy-wp-opacity",
	blur: "qy-wp-blur",
	cardOpacity: "qy-wp-card-opacity",
	sakura: "qy-sakura",
} as const;
/* 开关键 ↔ html data 属性 ↔ localStorage 键 映射（on/off 语义） */
const DS_SWITCH_MAP = {
	"home-text": { ls: DS_KEY.homeText, attr: "wpHomeText" },
	carousel: { ls: DS_KEY.carousel, attr: "wpCarousel" },
	waves: { ls: DS_KEY.waves, attr: "wpWaves" },
	gradient: { ls: DS_KEY.gradient, attr: "wpGradient" },
	sakura: { ls: DS_KEY.sakura, attr: "wpSakura" },
} as const;
type DsSwitchId = keyof typeof DS_SWITCH_MAP;

function lsGet(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}
function lsSet(key: string, val: string | null) {
	try {
		if (val === null) localStorage.removeItem(key);
		else localStorage.setItem(key, val);
	} catch {
		/* ignore */
	}
}

/* 透明三件套应用到 html style（boot 同款逻辑；null 表示清除覆写回落配置默认） */
function applyOverlayOpacity(v: number | null) {
	if (v === null) root.style.removeProperty("--wp-overlay-opacity");
	else root.style.setProperty("--wp-overlay-opacity", String(v));
}
function applyOverlayBlur(v: number | null) {
	if (v === null) {
		root.style.removeProperty("--wp-overlay-blur");
		root.style.removeProperty("--wp-overlay-scale");
	} else {
		root.style.setProperty("--wp-overlay-blur", `${v}px`);
		root.style.setProperty("--wp-overlay-scale", (1 + v / 100).toFixed(3));
	}
}
function applyCardOpacity(v: number | null) {
	if (v === null) root.style.removeProperty("--wp-card-opacity");
	else root.style.setProperty("--wp-card-opacity", `${Math.round(v * 100)}%`);
}

/* 开关应用：html data 属性 + 副作用（轮播定时器清/建、樱花停/启） */
function applyDsSwitch(id: DsSwitchId, on: boolean) {
	const { ls, attr } = DS_SWITCH_MAP[id];
	root.dataset[attr] = on ? "on" : "off";
	lsSet(ls, on ? "1" : "0");
	if (id === "carousel") {
		if (wpCarouselTimer !== undefined) {
			window.clearInterval(wpCarouselTimer);
			wpCarouselTimer = undefined;
		}
		if (on) initWallpaperCarousel();
	}
	if (id === "sakura") {
		doc.dispatchEvent(
			new CustomEvent("orchid:sakura-toggle", { detail: on ? "on" : "off" }),
		);
	}
}

/* 恢复面板全部访客偏好（boot 负责首帧，这里兜底 VT swap 与初始化） */
function applyDsPrefs() {
	const l = lsGet(DS_KEY.fsLayout);
	if (l === "classic" || l === "hero") root.dataset.wpFsLayout = l;
	for (const id of Object.keys(DS_SWITCH_MAP) as DsSwitchId[]) {
		const v = lsGet(DS_SWITCH_MAP[id].ls);
		if (v === "0" || v === "1")
			root.dataset[DS_SWITCH_MAP[id].attr] = v === "1" ? "on" : "off";
	}
	const op = parseFloat(lsGet(DS_KEY.opacity) || "");
	if (Number.isFinite(op)) applyOverlayOpacity(op);
	const bl = parseFloat(lsGet(DS_KEY.blur) || "");
	if (Number.isFinite(bl)) applyOverlayBlur(bl);
	const co = parseFloat(lsGet(DS_KEY.cardOpacity) || "");
	if (Number.isFinite(co)) applyCardOpacity(co);
}

/* 面板根节点配置默认值（DisplaySettings.astro 输出的 data-def-*） */
function dsPanel(): HTMLElement | null {
	return doc.getElementById("displaySettingsPanel");
}
function dsDef(key: string, fallback: number): number {
	const v = parseFloat(dsPanel()?.dataset[key] || "");
	return Number.isFinite(v) ? v : fallback;
}

/* 同步面板控件态：模式/布局按钮激活、组显隐（data-modes）、开关、滑块与徽章。
   模式或布局切换、面板打开、组重置、VT 换页后调用 */
function syncDsPanelState() {
	const panel = dsPanel();
	if (!panel) return;
	const mode = root.dataset.wallpaperMode || "none";
	const layout = root.dataset.wpFsLayout || "classic";
	/* 当前生效的模式 token：fullscreen+hero 组合单独成一个虚拟模式 */
	const tokens = [mode];
	if (mode === "fullscreen" && layout === "hero")
		tokens.push("fullscreen-hero");
	panel.querySelectorAll<HTMLElement>("[data-modes]").forEach((el) => {
		const modes = (el.dataset.modes || "").split(/\s+/).filter(Boolean);
		const visible = tokens.some((tok) => modes.includes(tok));
		if (el.classList.contains("ds-group"))
			el.classList.toggle("is-hidden", !visible);
		else el.classList.toggle("ds-row-hidden", !visible);
	});
	panel
		.querySelectorAll<HTMLElement>(".ds-mode-btn[data-mode]")
		.forEach((b) => {
			b.classList.toggle("is-active", b.dataset.mode === mode);
		});
	panel
		.querySelectorAll<HTMLElement>(".ds-mode-btn[data-fs-layout]")
		.forEach((b) => {
			b.classList.toggle("is-active", b.dataset.fsLayout === layout);
		});
	/* 开关态：html data 属性为当前生效值（boot/applyDsPrefs 已写入，默认 on） */
	for (const id of Object.keys(DS_SWITCH_MAP) as DsSwitchId[]) {
		const sw = panel.querySelector<HTMLElement>(`[data-ds-switch="${id}"]`);
		if (sw)
			sw.setAttribute(
				"aria-checked",
				root.dataset[DS_SWITCH_MAP[id].attr] === "off" ? "false" : "true",
			);
	}
	/* 滑块与徽章：localStorage 覆写优先，否则面板 data-def-*（配置默认） */
	const opSaved = parseFloat(lsGet(DS_KEY.opacity) || "");
	const op = Number.isFinite(opSaved) ? opSaved : dsDef("defOpacity", 0.8);
	const blSaved = parseFloat(lsGet(DS_KEY.blur) || "");
	const bl = Number.isFinite(blSaved) ? blSaved : dsDef("defBlur", 0);
	const coSaved = parseFloat(lsGet(DS_KEY.cardOpacity) || "");
	const co = Number.isFinite(coSaved) ? coSaved : dsDef("defCardOpacity", 0.5);
	const setSlider = (id: string, val: number, text: string) => {
		const s = panel.querySelector<HTMLInputElement>(`[data-ds-slider="${id}"]`);
		if (s) s.value = String(val);
		const badge = panel.querySelector<HTMLElement>(`[data-ds-badge="${id}"]`);
		if (badge) badge.textContent = text;
	};
	setSlider("opacity", Math.round(op * 100), `${Math.round(op * 100)}%`);
	setSlider("blur", bl, `${bl}px`);
	setSlider("card-opacity", Math.round(co * 100), `${Math.round(co * 100)}%`);
}

function closeDsPanel() {
	const panel = dsPanel();
	if (panel) panel.hidden = true;
	doc
		.getElementById("displaySettingsToggle")
		?.setAttribute("aria-expanded", "false");
}

/* 面板 click 委托（document 级）：命中面板内控件返回 true 拦截后续处理 */
function handleDsPanelClick(target: Element): boolean {
	/* 齿轮开合 */
	if (target.closest("#displaySettingsToggle")) {
		const panel = dsPanel();
		if (panel) {
			const open = panel.hidden;
			panel.hidden = !open;
			target
				.closest("#displaySettingsToggle")
				?.setAttribute("aria-expanded", open ? "true" : "false");
			if (open) syncDsPanelState();
		}
		return true;
	}
	/* Tab 切换 */
	const tab = target.closest<HTMLElement>(".ds-tab[data-tab]");
	if (tab) {
		const panel = dsPanel();
		if (panel) {
			panel.querySelectorAll(".ds-tab").forEach((b) => {
				b.classList.toggle("is-active", b === tab);
				b.setAttribute("aria-selected", b === tab ? "true" : "false");
			});
			panel.querySelectorAll<HTMLElement>(".ds-page").forEach((p) => {
				p.classList.toggle("is-active", p.dataset.page === tab.dataset.tab);
			});
		}
		return true;
	}
	/* 壁纸模式四选一（复用统一切换入口） */
	const modeBtn = target.closest<HTMLElement>("[data-mode]");
	if (modeBtn && dsPanel()?.contains(modeBtn)) {
		const m = modeBtn.dataset.mode || "";
		if (WP_MODES.includes(m)) setWallpaperMode(m);
		return true;
	}
	/* 全屏布局切换 */
	const layoutBtn = target.closest<HTMLElement>("[data-fs-layout]");
	if (layoutBtn) {
		const l = layoutBtn.dataset.fsLayout || "";
		if (l === "classic" || l === "hero") {
			root.dataset.wpFsLayout = l;
			lsSet(DS_KEY.fsLayout, l);
			syncDsPanelState();
		}
		return true;
	}
	/* 开关行 */
	const sw = target.closest<HTMLElement>("[data-ds-switch]");
	if (sw) {
		const id = sw.dataset.dsSwitch as DsSwitchId;
		if (id in DS_SWITCH_MAP) {
			const on = sw.getAttribute("aria-checked") !== "true";
			applyDsSwitch(id, on);
			sw.setAttribute("aria-checked", on ? "true" : "false");
		}
		return true;
	}
	/* 组重置（↺）：清本组 localStorage，回落配置默认并重应用 */
	const resetBtn = target.closest<HTMLElement>("[data-reset-group]");
	if (resetBtn) {
		if (resetBtn.dataset.resetGroup === "wallpaper") {
			lsSet(DS_KEY.homeText, null);
			lsSet(DS_KEY.carousel, null);
			lsSet(DS_KEY.waves, null);
			lsSet(DS_KEY.gradient, null);
			delete root.dataset.wpHomeText;
			delete root.dataset.wpCarousel;
			delete root.dataset.wpWaves;
			delete root.dataset.wpGradient;
			/* 轮播回到配置默认（开）：先清后建 */
			if (wpCarouselTimer !== undefined) {
				window.clearInterval(wpCarouselTimer);
				wpCarouselTimer = undefined;
			}
			initWallpaperCarousel();
		}
		if (resetBtn.dataset.resetGroup === "overlay") {
			lsSet(DS_KEY.opacity, null);
			lsSet(DS_KEY.blur, null);
			lsSet(DS_KEY.cardOpacity, null);
			applyOverlayOpacity(null);
			applyOverlayBlur(null);
			applyCardOpacity(null);
		}
		syncDsPanelState();
		return true;
	}
	return false;
}

/* 滑块 input（input 委托调用）：实时应用 + 持久化 + 徽章 */
function handleDsSliderInput(el: HTMLInputElement) {
	const id = el.dataset.dsSlider;
	const v = parseFloat(el.value);
	if (!Number.isFinite(v)) return;
	if (id === "opacity") {
		applyOverlayOpacity(v / 100);
		lsSet(DS_KEY.opacity, String(v / 100));
	} else if (id === "blur") {
		applyOverlayBlur(v);
		lsSet(DS_KEY.blur, String(v));
	} else if (id === "card-opacity") {
		applyCardOpacity(v / 100);
		lsSet(DS_KEY.cardOpacity, String(v / 100));
	} else return;
	const panel = dsPanel();
	const badge = panel?.querySelector<HTMLElement>(`[data-ds-badge="${id}"]`);
	if (badge) badge.textContent = id === "blur" ? `${v}px` : `${Math.round(v)}%`;
}

/* 每次导航后重绑面板（DOM 随 swap 重建）：复位收起 + 控件态同步 */
function initDisplaySettings() {
	const panel = dsPanel();
	if (!panel) return;
	closeDsPanel();
	syncDsPanelState();
}

/* ---------- 生命周期 ---------- */
function initPage() {
	initLightbox();
	initNavActive();
	closeMobileNav();
	initReveal();
	initTocSpy();
	updateBackTop();
	updateReadProgress();
	initPalette();
	initEncrypted();
	initLqip();
	initCategoryBar();
	initPostListLayout();
	initSeriesNav();
	initWallpaper();
	initDisplaySettings();
	renderSearchPage();
}
initPage();
doc.addEventListener("astro:page-load", initPage);
