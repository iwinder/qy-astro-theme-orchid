/* 分享海报（b9.6，P1-13）：文章页「生成分享海报」按钮 → 浏览器 canvas 绘制
   850px 宽海报（封面 + 日期角标 + 标题/摘要 + 作者/站点 + 二维码）→ 弹窗预览，
   支持复制链接与保存 PNG。移植自原版 misc/SharePoster.svelte，主题中立化改造：
   - 去头像（纯文字作者）、去 weserv.nl 第三方图片代理（封面加载失败降级 accent 色块）
   - 字体改为中文栈（canvas 不走 CSS --font-display）
   - qrcode 动态 import 分包（点开才加载，构建零开销）
   - 自读 #qy-ui-labels，避免与 app.ts 循环依赖 */

const doc = document;

/* ---------- UI 文案：读 BaseLayout 的 #qy-ui-labels JSON（兜底防 JSON 缺失/解析失败） ---------- */
const FALLBACK: Record<string, string> = {
	sharePoster: "生成分享海报",
	generatingPoster: "海报生成中…",
	copyLink: "复制链接",
	savePoster: "保存海报",
	scanToRead: "扫码阅读全文",
	author: "作者",
	close: "关闭",
	copied: "已复制",
};
let cachedLabels: Record<string, string> | null = null;

function label(key: string): string {
	if (!cachedLabels) {
		try {
			const el = doc.getElementById("qy-ui-labels");
			cachedLabels = el
				? (JSON.parse(el.textContent || "{}") as Record<string, string>)
				: {};
		} catch {
			cachedLabels = {};
		}
	}
	return cachedLabels[key] || FALLBACK[key] || "";
}

/* ---------- 读取当前 accent 主题色（原版 temp div 技巧，canvas 不认 CSS 变量） ---------- */
function readAccent(): string {
	const tmp = doc.createElement("div");
	tmp.style.display = "none";
	tmp.style.color = "var(--accent)";
	doc.body.appendChild(tmp);
	const color = getComputedStyle(tmp).color;
	tmp.remove();
	return color || "#8b7ec8";
}

/* ---------- 图片加载：同源相对路径直接加载，失败 resolve(null) 由调用方降级 ---------- */
function loadImage(src: string): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

/* ---------- 逐字符换行（中文无空格分词，原版同款实现） ---------- */
function getLines(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
): string[] {
	const chars = text.split("");
	const lines: string[] = [];
	let current = "";
	for (const char of chars) {
		if (ctx.measureText(current + char).width < maxWidth) {
			current += char;
		} else {
			lines.push(current);
			current = char;
		}
	}
	if (current) lines.push(current);
	return lines;
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.closePath();
}

/* ---------- 海报绘制：布局参数与原版一致（scale=2，宽 425*2） ---------- */
const FONT_STACK =
	"'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

interface PosterData {
	title: string;
	author: string;
	desc: string;
	date: string;
	cover: string;
	url: string;
	site: string;
}

async function drawPoster(data: PosterData): Promise<string> {
	const QRCode = (await import("qrcode")).default;
	const scale = 2;
	const width = 425 * scale;
	const padding = 24 * scale;
	const accent = readAccent();

	/* 1. 资源准备：二维码 data URL + 封面（失败降级 accent 色块） */
	const qrDataUrl = await QRCode.toDataURL(data.url, {
		margin: 1,
		width: 100 * scale,
		color: { dark: "#000000", light: "#ffffff" },
	});
	const [qrImg, coverImg] = await Promise.all([
		loadImage(qrDataUrl),
		data.cover ? loadImage(data.cover) : Promise.resolve(null),
	]);

	/* 2. 测量画布（高度先估后调） */
	const canvas = doc.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas context not available");
	canvas.width = width;
	canvas.height = 1000 * scale;

	/* 3. 布局计算 */
	const contentWidth = width - padding * 2;
	let currentY = 0;

	const coverHeight = (coverImg ? 200 : 120) * scale;
	currentY += coverHeight;
	currentY += padding;

	ctx.font = `700 ${24 * scale}px ${FONT_STACK}`;
	const titleLines = getLines(ctx, data.title, contentWidth).slice(
		0,
		3,
	); /* clamp 3 行 */
	const titleLineHeight = 30 * scale;
	currentY += titleLines.length * titleLineHeight;
	currentY += 16 * scale;

	let descHeight = 0;
	if (data.desc) {
		ctx.font = `${14 * scale}px ${FONT_STACK}`;
		const descLines = getLines(ctx, data.desc, contentWidth - 16 * scale).slice(
			0,
			6,
		);
		descHeight = descLines.length * 25 * scale;
		currentY += descHeight;
	} else {
		currentY += 8 * scale;
	}

	currentY += 24 * scale; /* 分隔线前距 */
	const footerHeight = 64 * scale;
	currentY += footerHeight;
	currentY += padding; /* 底部留白 */
	canvas.height = currentY;

	/* 4. 绘制 */
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	/* 装饰圆（accent 10% 透明度） */
	ctx.save();
	ctx.globalAlpha = 0.1;
	ctx.fillStyle = accent;
	ctx.beginPath();
	ctx.arc(width - 25 * scale, 25 * scale, 75 * scale, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(10 * scale, canvas.height - 10 * scale, 50 * scale, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	/* 日期角标数据 */
	let dateObj: { day: string; month: string; year: string } | null = null;
	const parsed = new Date(data.date);
	if (!Number.isNaN(parsed.getTime())) {
		dateObj = {
			day: parsed.getDate().toString().padStart(2, "0"),
			month: (parsed.getMonth() + 1).toString().padStart(2, "0"),
			year: parsed.getFullYear().toString(),
		};
	}

	/* 封面（object-fit: cover）或降级 accent 色块 */
	if (coverImg) {
		const imgRatio = coverImg.width / coverImg.height;
		const targetRatio = width / coverHeight;
		let sx: number;
		let sy: number;
		let sWidth: number;
		let sHeight: number;
		if (imgRatio > targetRatio) {
			sHeight = coverImg.height;
			sWidth = sHeight * targetRatio;
			sx = (coverImg.width - sWidth) / 2;
			sy = 0;
		} else {
			sWidth = coverImg.width;
			sHeight = sWidth / targetRatio;
			sx = 0;
			sy = (coverImg.height - sHeight) / 2;
		}
		ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, 0, 0, width, coverHeight);
	} else {
		ctx.save();
		ctx.fillStyle = accent;
		ctx.globalAlpha = 0.2;
		ctx.fillRect(0, 0, width, coverHeight);
		ctx.restore();
	}

	/* 日期角标（封面左下角） */
	if (dateObj) {
		const boxW = 60 * scale;
		const boxH = 60 * scale;
		const boxX = padding;
		const boxY = coverHeight - boxH;

		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 4 * scale);
		ctx.fill();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `700 ${30 * scale}px ${FONT_STACK}`;
		ctx.fillText(dateObj.day, boxX + boxW / 2, boxY + 24 * scale);

		ctx.beginPath();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
		ctx.lineWidth = 1 * scale;
		ctx.moveTo(boxX + 10 * scale, boxY + 42 * scale);
		ctx.lineTo(boxX + boxW - 10 * scale, boxY + 42 * scale);
		ctx.stroke();

		ctx.font = `${10 * scale}px ${FONT_STACK}`;
		ctx.fillText(
			`${dateObj.year} ${dateObj.month}`,
			boxX + boxW / 2,
			boxY + 51 * scale,
		);
	}

	/* 标题 */
	let drawY = coverHeight + padding;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	ctx.font = `700 ${24 * scale}px ${FONT_STACK}`;
	ctx.fillStyle = "#111827";
	titleLines.forEach((line) => {
		ctx.fillText(line, padding, drawY);
		drawY += titleLineHeight;
	});
	drawY += 16 * scale - (titleLineHeight - 24 * scale);

	/* 摘要（左侧竖线 + 最多 6 行） */
	if (data.desc) {
		ctx.fillStyle = "#e5e7eb";
		drawRoundedRect(
			ctx,
			padding,
			drawY - 8 * scale,
			4 * scale,
			descHeight + 8 * scale,
			2 * scale,
		);
		ctx.fill();

		ctx.font = `${14 * scale}px ${FONT_STACK}`;
		ctx.fillStyle = "#4b5563";
		getLines(ctx, data.desc, contentWidth - 16 * scale)
			.slice(0, 6)
			.forEach((line) => {
				ctx.fillText(line, padding + 16 * scale, drawY);
				drawY += 25 * scale;
			});
	} else {
		drawY += 8 * scale;
	}

	/* 分隔线 */
	drawY += 24 * scale;
	ctx.beginPath();
	ctx.strokeStyle = "#f3f4f6";
	ctx.lineWidth = 1 * scale;
	ctx.moveTo(padding, drawY);
	ctx.lineTo(width - padding, drawY);
	ctx.stroke();
	drawY += 24 * scale;

	/* 页脚：左作者文字（主题中立化：去头像），右二维码 + 站点信息 */
	const footerY = drawY;
	const textCenterY = footerY + 32 * scale;

	ctx.textAlign = "left";
	ctx.fillStyle = "#9ca3af";
	ctx.font = `${12 * scale}px ${FONT_STACK}`;
	ctx.fillText(label("author"), padding, textCenterY - 20 * scale);

	ctx.fillStyle = "#1f2937";
	ctx.font = `700 ${20 * scale}px ${FONT_STACK}`;
	ctx.fillText(data.author, padding, textCenterY + 4 * scale);

	const qrSize = 64 * scale;
	const qrX = width - padding - qrSize;
	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
	ctx.shadowBlur = 4 * scale;
	ctx.shadowOffsetY = 2 * scale;
	drawRoundedRect(ctx, qrX, footerY, qrSize, qrSize, 4 * scale);
	ctx.fill();
	ctx.shadowColor = "transparent";

	const qrInner = 56 * scale;
	const qrPad = (qrSize - qrInner) / 2;
	if (qrImg) {
		ctx.drawImage(qrImg, qrX + qrPad, footerY + qrPad, qrInner, qrInner);
	}

	const siteInfoX = qrX - 16 * scale;
	ctx.textAlign = "right";
	ctx.fillStyle = "#9ca3af";
	ctx.font = `${12 * scale}px ${FONT_STACK}`;
	ctx.fillText(label("scanToRead"), siteInfoX, textCenterY - 20 * scale);

	ctx.fillStyle = "#1f2937";
	ctx.font = `700 ${20 * scale}px ${FONT_STACK}`;
	ctx.fillText(data.site, siteInfoX, textCenterY + 4 * scale);

	return canvas.toDataURL("image/png");
}

/* ---------- 弹窗：懒建 DOM，生成中 spinner，完成后展示海报 + 操作区 ---------- */
export async function openSharePoster(btn: HTMLElement) {
	if (doc.getElementById("qyPosterModal")) return; /* 防重复打开 */

	const data: PosterData = {
		title: btn.dataset.title || "",
		author: btn.dataset.author || "",
		desc: btn.dataset.desc || "",
		date: btn.dataset.date || "",
		cover: btn.dataset.cover || "",
		url: btn.dataset.url || "",
		site: btn.dataset.site || "",
	};

	const prevOverflow = doc.body.style.overflow;
	doc.body.style.overflow = "hidden";

	const modal = doc.createElement("div");
	modal.id = "qyPosterModal";
	modal.className = "poster-modal";
	modal.setAttribute("role", "dialog");
	modal.setAttribute("aria-modal", "true");
	/* 骨架仅含静态结构，动态文本/alt 随后用 DOM API 填值（文章标题可能含引号等字符） */
	modal.innerHTML = `
    <div class="poster-card">
      <header class="poster-head">
        <strong class="poster-title"></strong>
        <button type="button" class="poster-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </header>
      <div class="poster-stage">
        <div class="poster-loading"><span class="poster-spinner" aria-hidden="true"></span><span class="poster-loading-text"></span></div>
        <img class="poster-img" hidden />
      </div>
      <footer class="poster-foot">
        <button type="button" class="poster-btn poster-copy"></button>
        <button type="button" class="poster-btn poster-save" disabled></button>
      </footer>
    </div>`;
	modal.querySelector<HTMLElement>(".poster-title")!.textContent =
		label("sharePoster");
	modal
		.querySelector(".poster-close")!
		.setAttribute("aria-label", label("close"));
	modal.querySelector<HTMLElement>(".poster-loading-text")!.textContent =
		label("generatingPoster");
	modal.querySelector<HTMLImageElement>(".poster-img")!.alt = data.title;
	modal.querySelector<HTMLButtonElement>(".poster-copy")!.textContent =
		label("copyLink");
	modal.querySelector<HTMLButtonElement>(".poster-save")!.textContent =
		label("savePoster");
	doc.body.appendChild(modal);

	const close = () => {
		doc.removeEventListener("keydown", onKey);
		modal.remove();
		doc.body.style.overflow = prevOverflow;
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") close();
	};

	modal.addEventListener("click", (e) => {
		if (e.target === modal) close();
	});
	modal.querySelector(".poster-close")?.addEventListener("click", close);
	doc.addEventListener("keydown", onKey);

	/* 复制链接（clipboard 优先 + execCommand 兜底），2s 恢复文案 */
	modal.querySelector(".poster-copy")?.addEventListener("click", (e) => {
		const button = e.currentTarget as HTMLButtonElement;
		const done = () => {
			button.textContent = label("copied");
			setTimeout(() => {
				button.textContent = label("copyLink");
			}, 2000);
		};
		if (navigator.clipboard?.writeText) {
			navigator.clipboard
				.writeText(data.url)
				.then(done)
				.catch(() => {});
		} else {
			const ta = doc.createElement("textarea");
			ta.value = data.url;
			doc.body.appendChild(ta);
			ta.select();
			doc.execCommand("copy");
			ta.remove();
			done();
		}
	});

	/* 生成完成：展示海报 + 解锁保存按钮 */
	const img = modal.querySelector<HTMLImageElement>(".poster-img");
	const saveBtn = modal.querySelector<HTMLButtonElement>(".poster-save");
	try {
		const poster = await drawPoster(data);
		if (img) {
			img.src = poster;
			img.hidden = false;
		}
		/* 生成完成：移除 loading（否则转圈常驻在海报上方） */
		modal.querySelector<HTMLElement>(".poster-loading")?.remove();
		if (saveBtn) {
			saveBtn.disabled = false;
			saveBtn.addEventListener("click", () => {
				const a = doc.createElement("a");
				a.href = poster;
				a.download = `poster-${data.title.replace(/\s+/g, "-")}.png`;
				a.click();
			});
		}
	} catch (err) {
		/* 生成失败（qrcode 加载失败/canvas 不可用）：关弹窗 + 控制台留痕，不留空壳 */
		console.error("[share-poster] generate failed:", err);
		close();
	}
}
