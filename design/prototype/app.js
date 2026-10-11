/* 清言集 · Theme Orchid 高保真原型 — 共享脚本（冻结）
   nav active / burger / mode / palette / search / back-top / reveal / QyLightbox */
(() => {
	var doc = document;
	var root = doc.documentElement;

	/* ---------- 搜索索引（冻结 mock 数据） ---------- */
	var SEARCH_INDEX = [
		{
			title: "山色入城：一次江南的慢行",
			tags: ["江南", "随笔"],
			cat: "旅行",
			url: "post.html",
			date: "2026-09-28",
		},
		{
			title: "茶室笔记：器物与留白",
			tags: ["茶器", "美学"],
			cat: "生活",
			url: "post.html",
			date: "2026-09-12",
		},
		{
			title: "Astro 主题架构：把定制还给站点",
			tags: ["Astro", "前端"],
			cat: "技术",
			url: "post.html",
			date: "2026-08-30",
		},
		{
			title: "竹林午后：雾、光与呼吸",
			tags: ["摄影", "自然"],
			cat: "摄影",
			url: "post.html",
			date: "2026-08-17",
		},
		{
			title: "关于加密文章的一点想法",
			tags: ["安全", "随笔"],
			cat: "技术",
			url: "post.html",
			date: "2026-07-25",
		},
		{
			title: "夜航西飞：读书摘记",
			tags: ["读书", "摘记"],
			cat: "阅读",
			url: "post.html",
			date: "2026-06-30",
		},
	];

	/* ---------- 导航 active（唯一机制：body data-page ↔ data-nav） ---------- */
	var page = doc.body.getAttribute("data-page");
	if (page) {
		var links = doc.querySelectorAll(".nav-link[data-nav]");
		for (var i = 0; i < links.length; i++) {
			if (links[i].getAttribute("data-nav") === page)
				links[i].classList.add("is-active");
		}
	}

	/* ---------- burger 导航 ---------- */
	var nav = doc.getElementById("siteNav");
	var burger = doc.getElementById("navToggle");
	if (nav && burger) {
		burger.addEventListener("click", () => {
			var open = nav.classList.toggle("open");
			burger.setAttribute("aria-expanded", open ? "true" : "false");
		});
	}

	/* ---------- 深浅模式 ---------- */
	var modeBtn = doc.getElementById("modeToggle");
	if (modeBtn) {
		modeBtn.addEventListener("click", () => {
			var dark = root.classList.toggle("dark");
			try {
				localStorage.setItem("qy-mode", dark ? "dark" : "light");
			} catch (e) {}
		});
	}

	/* ---------- hue 调色 ---------- */
	var palBtn = doc.getElementById("paletteToggle");
	var palPop = doc.getElementById("palettePop");
	var CURRENT_HUE = getComputedStyle(root)
		.getPropertyValue("--accent-h")
		.trim();
	function markSwatch() {
		if (!palPop) return;
		var sw = palPop.querySelectorAll(".swatch");
		for (var i = 0; i < sw.length; i++) {
			sw[i].classList.toggle(
				"is-active",
				sw[i].getAttribute("data-hue") === String(CURRENT_HUE),
			);
		}
	}
	if (palBtn && palPop) {
		palBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			var show = palPop.hidden;
			palPop.hidden = !show;
			palBtn.setAttribute("aria-expanded", show ? "true" : "false");
			if (show) markSwatch();
		});
		doc.addEventListener("click", (e) => {
			if (!palPop.hidden && !palPop.contains(e.target) && e.target !== palBtn) {
				palPop.hidden = true;
				palBtn.setAttribute("aria-expanded", "false");
			}
		});
		palPop.addEventListener("click", (e) => {
			var btn = e.target.closest(".swatch");
			if (!btn) return;
			var hue = btn.getAttribute("data-hue");
			CURRENT_HUE = hue;
			root.style.setProperty("--accent-h", hue);
			try {
				localStorage.setItem("qy-hue", hue);
			} catch (err) {}
			markSwatch();
		});
	}

	/* ---------- 搜索浮层 ---------- */
	var overlay = doc.getElementById("searchOverlay");
	var input = doc.getElementById("searchInput");
	var results = doc.getElementById("searchResults");
	var empty = doc.getElementById("searchEmpty");
	var closeBtn = doc.getElementById("searchClose");
	var list = [];
	var cursor = -1;

	function openSearch() {
		if (!overlay || !overlay.hidden) return;
		overlay.hidden = false;
		if (input) {
			input.value = "";
			renderResults([]);
			input.focus();
		}
	}
	function closeSearch() {
		if (!overlay || overlay.hidden) return;
		overlay.hidden = true;
		cursor = -1;
	}
	function renderResults(items) {
		if (!results || !empty) return;
		results.innerHTML = "";
		list = items;
		cursor = items.length ? 0 : -1;
		empty.hidden = items.length > 0;
		for (var i = 0; i < items.length; i++) {
			((item, idx) => {
				var a = doc.createElement("a");
				a.className = "search-item" + (idx === 0 ? " is-active" : "");
				a.href = item.url;
				a.innerHTML = '<div class="si-title"></div><div class="si-meta"></div>';
				a.querySelector(".si-title").textContent = item.title;
				a.querySelector(".si-meta").textContent =
					item.cat + " · " + item.date + " · " + item.tags.join(" / ");
				a.addEventListener("mousemove", () => {
					setCursor(idx);
				});
				results.appendChild(a);
			})(items[i], i);
		}
	}
	function setCursor(idx) {
		cursor = idx;
		var items = results.querySelectorAll(".search-item");
		for (var i = 0; i < items.length; i++)
			items[i].classList.toggle("is-active", i === idx);
	}
	function doSearch(q) {
		q = q.trim().toLowerCase();
		if (!q) {
			renderResults([]);
			return;
		}
		var out = [];
		for (var i = 0; i < SEARCH_INDEX.length; i++) {
			var it = SEARCH_INDEX[i];
			var hay = (
				it.title +
				" " +
				it.cat +
				" " +
				it.tags.join(" ")
			).toLowerCase();
			if (hay.indexOf(q) !== -1) out.push(it);
		}
		renderResults(out);
	}
	if (overlay && input && results && empty) {
		var searchToggle = doc.getElementById("searchToggle");
		if (searchToggle) searchToggle.addEventListener("click", openSearch);
		if (closeBtn) closeBtn.addEventListener("click", closeSearch);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeSearch();
		});
		input.addEventListener("input", () => {
			doSearch(input.value);
		});
		doc.addEventListener("keydown", (e) => {
			if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
				e.preventDefault();
				overlay.hidden ? openSearch() : closeSearch();
				return;
			}
			if (overlay.hidden) return;
			if (e.key === "Escape") {
				e.preventDefault();
				closeSearch();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				if (list.length) setCursor((cursor + 1) % list.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				if (list.length) setCursor((cursor - 1 + list.length) % list.length);
			} else if (e.key === "Enter") {
				if (cursor >= 0 && list[cursor]) location.href = list[cursor].url;
			}
		});
	}

	/* ---------- back-top ---------- */
	var backTop = doc.getElementById("backTop");
	if (backTop) {
		var onScroll = () => {
			backTop.hidden = (window.scrollY || doc.documentElement.scrollTop) <= 480;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		backTop.addEventListener("click", () => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	/* ---------- reveal ---------- */
	var reveals = doc.querySelectorAll(".reveal");
	if (reveals.length) {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			for (var r = 0; r < reveals.length; r++)
				reveals[r].classList.add("is-in");
		} else {
			reveals[0].classList.add("is-in");
			var ri = 0;
			var timer = setInterval(() => {
				ri++;
				if (ri >= reveals.length) {
					clearInterval(timer);
					return;
				}
				reveals[ri].classList.add("is-in");
			}, 70);
		}
	}

	/* ---------- 通用灯箱 ---------- */
	var lb = doc.createElement("div");
	lb.className = "lightbox";
	lb.setAttribute("role", "dialog");
	lb.setAttribute("aria-modal", "true");
	lb.setAttribute("aria-label", "图片查看");
	lb.innerHTML =
		'<span class="lb-counter"></span>' +
		'<button class="lb-btn lb-close" type="button" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
		'<button class="lb-btn lb-prev" type="button" aria-label="上一张"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>' +
		'<img class="lb-img" alt=""/>' +
		'<button class="lb-btn lb-next" type="button" aria-label="下一张"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>' +
		'<div class="lb-cap"></div>';
	doc.body.appendChild(lb);

	var lbItems = [];
	var lbIdx = 0;
	var lbImg = lb.querySelector(".lb-img");
	var lbCap = lb.querySelector(".lb-cap");
	var lbCounter = lb.querySelector(".lb-counter");

	function lbShow(i) {
		if (!lbItems.length) return;
		lbIdx = (i + lbItems.length) % lbItems.length;
		lbImg.src = lbItems[lbIdx].src;
		lbImg.alt = lbItems[lbIdx].cap || "";
		lbCap.textContent = lbItems[lbIdx].cap || "";
		lbCounter.textContent = lbIdx + 1 + " / " + lbItems.length;
	}
	function openLb(items, start) {
		lbItems = items || [];
		if (!lbItems.length) return;
		lb.classList.add("open");
		doc.body.style.overflow = "hidden";
		lbShow(start || 0);
	}
	function closeLb() {
		lb.classList.remove("open");
		doc.body.style.overflow = "";
		lbItems = [];
	}
	lb.querySelector(".lb-close").addEventListener("click", closeLb);
	lb.querySelector(".lb-prev").addEventListener("click", (e) => {
		e.stopPropagation();
		lbShow(lbIdx - 1);
	});
	lb.querySelector(".lb-next").addEventListener("click", (e) => {
		e.stopPropagation();
		lbShow(lbIdx + 1);
	});
	lb.addEventListener("click", (e) => {
		if (e.target === lb) closeLb();
	});
	doc.addEventListener("keydown", (e) => {
		if (!lb.classList.contains("open")) return;
		if (e.key === "Escape") closeLb();
		else if (e.key === "ArrowLeft") lbShow(lbIdx - 1);
		else if (e.key === "ArrowRight") lbShow(lbIdx + 1);
	});
	window.QyLightbox = { open: openLb };

	/* 单图绑定：figure[data-lightbox] / [data-lightbox] */
	var singles = doc.querySelectorAll("[data-lightbox]");
	for (var s = 0; s < singles.length; s++) {
		((el) => {
			var img = el.tagName === "IMG" ? el : el.querySelector("img");
			if (!img) return;
			el.addEventListener("click", () => {
				openLb([{ src: img.src, cap: img.getAttribute("alt") || "" }], 0);
			});
		})(singles[s]);
	}
})();
