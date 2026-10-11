/* 清言集 · Theme Orchid — 全局交互脚本
   移植自 design/prototype/app.js（冻结），改造为 View Transitions 兼容版：
   - document/window 级一次性委托监听（VT 换页不失联）
   - astro:page-load 时重初始化页面级状态（nav active / reveal / TOC spy / 灯箱 DOM / 调色面板）
   - astro:after-swap 时重应用暗色 class 与持久化 hue（VT swap 会替换 <html> 属性）
   - 搜索浮层（M3b-b6）：Pagefind 构建期索引，运行时惰性加载
   - 加密文章（M3b-b7）：Web Crypto 解密 + sessionStorage 密码缓存 */

'use strict';

import { openSharePoster } from './share-poster.js';

const doc = document;
const root = doc.documentElement;

/* ---------- 深浅模式 ---------- */
function applyPreferredDark() {
  let mode: string | null = null;
  try {
    mode = localStorage.getItem('qy-mode');
  } catch {
    /* ignore */
  }
  const dark = mode
    ? mode === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', dark);
}
applyPreferredDark();
doc.addEventListener('astro:after-swap', applyPreferredDark);

/* ---------- 客户端动态文案（构建期经 BaseLayout #qy-ui-labels 注入，读一次缓存） ---------- */
const UI_FALLBACK: Record<string, string> = {
  lightbox: '图片查看',
  close: '关闭',
  prevImage: '上一张',
  nextImage: '下一张',
  copy: '复制',
  copied: '已复制',
};
let uiLabels: Record<string, string> | null = null;
function ui(key: string): string {
  if (!uiLabels) {
    try {
      const el = doc.getElementById('qy-ui-labels');
      uiLabels = el ? (JSON.parse(el.textContent || '{}') as Record<string, string>) : {};
    } catch {
      uiLabels = {};
    }
  }
  return uiLabels[key] || UI_FALLBACK[key] || key;
}

/* ---------- hue 调色面板（运行时覆写 --accent-h，s/l 保持配置值） ---------- */
const HUE_KEY = 'qy-hue';

/* 构建期 hue（BaseLayout 由 accentColor 计算并写入 data-accent-h） */
function buildHue(): number {
  const v = parseFloat(root.dataset.accentH || '');
  return Number.isFinite(v) ? v : 0;
}

/* 当前生效 hue：运行时覆写优先，否则构建期值 */
function currentHue(): number {
  const cur = parseFloat(root.style.getPropertyValue('--accent-h'));
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
    const v = parseFloat(localStorage.getItem(HUE_KEY) || '');
    if (Number.isFinite(v)) return ((v % 360) + 360) % 360;
  } catch {
    /* ignore */
  }
  return null;
}

/* VT swap 替换 <html> style 属性后，重应用持久化 hue（与 applyPreferredDark 并列） */
function applySavedHue() {
  const h = savedHue();
  if (h !== null) root.style.setProperty('--accent-h', String(h));
}
applySavedHue();
doc.addEventListener('astro:after-swap', applySavedHue);

/* 同步面板 UI：滑杆 / 徽章 / swatch 激活态（差值 <1° 判定，含 0/360 环绕） */
function syncPaletteUI(h: number) {
  const pop = doc.getElementById('palettePop');
  if (!pop) return;
  const rounded = Math.round(((h % 360) + 360) % 360) % 360;
  const slider = doc.getElementById('hueSlider') as HTMLInputElement | null;
  if (slider) slider.value = String(rounded);
  const badge = doc.getElementById('hueBadge');
  if (badge) badge.textContent = String(rounded);
  pop.querySelectorAll<HTMLElement>('.swatch').forEach((sw) => {
    const dh = Math.abs(parseFloat(sw.dataset.hue || '0') - rounded);
    sw.classList.toggle('is-active', dh < 1 || dh > 359);
  });
}

function applyHue(h: number) {
  const v = Math.round(((h % 360) + 360) % 360);
  root.style.setProperty('--accent-h', String(v));
  syncPaletteUI(v);
  persistHue(v);
}

function closePalette() {
  const pop = doc.getElementById('palettePop');
  const toggle = doc.getElementById('paletteToggle');
  if (pop) pop.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

/* 每次导航后同步面板状态并复位收起（面板 DOM 会随 swap 重建） */
function initPalette() {
  const pop = doc.getElementById('palettePop');
  if (!pop) return;
  closePalette();
  syncPaletteUI(currentHue());
}

/* ---------- 通用灯箱（QyLightbox，DOM 动态创建，VT 换页后惰性重建） ---------- */
interface LbItem {
  src: string;
  cap: string;
}

let lb: HTMLElement | null = null;
let lbItems: LbItem[] = [];
let lbIdx = 0;

const LB_SVGS = {
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  prev:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
};

function ensureLightbox(): HTMLElement | null {
  const existing = doc.querySelector<HTMLElement>('.lightbox');
  if (existing) {
    lb = existing;
    return existing;
  }
  if (!doc.body) return null;
  const el = doc.createElement('div');
  el.className = 'lightbox';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', ui('lightbox'));
  el.innerHTML =
    '<span class="lb-counter"></span>' +
    '<button class="lb-btn lb-close" type="button" aria-label="' + ui('close') + '">' +
    LB_SVGS.close +
    '</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="' + ui('prevImage') + '">' +
    LB_SVGS.prev +
    '</button>' +
    '<img class="lb-img" alt=""/>' +
    '<button class="lb-btn lb-next" type="button" aria-label="' + ui('nextImage') + '">' +
    LB_SVGS.next +
    '</button>' +
    '<div class="lb-cap"></div>';
  doc.body.appendChild(el);
  lb = el;
  return el;
}

function lbShow(i: number) {
  if (!lb || !lbItems.length) return;
  lbIdx = (i + lbItems.length) % lbItems.length;
  const img = lb.querySelector('.lb-img') as HTMLImageElement | null;
  const cap = lb.querySelector('.lb-cap');
  const counter = lb.querySelector('.lb-counter');
  if (img) {
    img.src = lbItems[lbIdx].src;
    img.alt = lbItems[lbIdx].cap || '';
  }
  if (cap) cap.textContent = lbItems[lbIdx].cap || '';
  if (counter) counter.textContent = lbIdx + 1 + ' / ' + lbItems.length;
}

function openLb(items: LbItem[], start?: number) {
  lbItems = items || [];
  if (!lbItems.length || !ensureLightbox()) return;
  lb!.classList.add('open');
  doc.body.style.overflow = 'hidden';
  lbShow(start || 0);
}

function closeLb() {
  if (!lb) return;
  lb.classList.remove('open');
  doc.body.style.overflow = '';
  lbItems = [];
}

(window as unknown as { QyLightbox: { open: typeof openLb } }).QyLightbox = {
  open: openLb,
};

/* ---------- 页面级初始化（每次导航执行） ---------- */
function initNavActive() {
  const page = doc.body.getAttribute('data-page');
  if (!page) return;
  doc.querySelectorAll<HTMLElement>('.nav-link[data-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.getAttribute('data-nav') === page);
  });
}

function closeMobileNav() {
  const nav = doc.getElementById('siteNav');
  const burger = doc.getElementById('navToggle');
  if (nav) nav.classList.remove('open');
  if (burger) burger.setAttribute('aria-expanded', 'false');
}

/* reveal：首个立即入场，其余 70ms 逐个；reduced-motion 时直接全部显示 */
let revealTimer: ReturnType<typeof setInterval> | null = null;
function initReveal() {
  if (revealTimer) {
    clearInterval(revealTimer);
    revealTimer = null;
  }
  const reveals = doc.querySelectorAll('.reveal');
  if (!reveals.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach((el) => el.classList.add('is-in'));
    return;
  }
  let ri = 0;
  reveals[0].classList.add('is-in');
  revealTimer = setInterval(() => {
    ri++;
    if (ri >= reveals.length) {
      if (revealTimer) clearInterval(revealTimer);
      revealTimer = null;
      return;
    }
    reveals[ri].classList.add('is-in');
  }, 70);
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
    '.prose h2[id], .prose h3[id], .prose h4[id]'
  );
  if (!tocLinks.length || !headings.length || !('IntersectionObserver' in window))
    return;
  const map = new Map<string, Element>();
  tocLinks.forEach((a) => {
    const href = a.getAttribute('href');
    if (href) map.set(href.slice(1), a);
  });
  spy = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        tocLinks.forEach((a) => a.classList.remove('is-active'));
        const link = map.get(en.target.id);
        if (link) link.classList.add('is-active');
      }
    },
    { rootMargin: '-30% 0px -60% 0px' }
  );
  headings.forEach((h) => spy!.observe(h));
}

/* back-top 显隐（window 级监听只挂一次，元素每次现查，VT 安全） */
function updateBackTop() {
  const backTop = doc.getElementById('backTop');
  if (!backTop) return;
  backTop.hidden = (window.scrollY || root.scrollTop) <= 480;
}
window.addEventListener('scroll', updateBackTop, { passive: true });

/* ---------- 代码块复制（原型 post.html 同款：clipboard 优先 + execCommand 兜底） ---------- */
function handleCopy(btn: Element) {
  const block = btn.closest('.code-block');
  const code = block ? block.querySelector('pre code') : null;
  if (!code) return;
  const text = (code as HTMLElement).innerText;
  const done = () => {
    btn.textContent = ui('copied');
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = ui('copy');
      btn.classList.remove('copied');
    }, 1200);
  };
  const fallback = () => {
    const ta = doc.createElement('textarea');
    ta.value = text;
    doc.body.appendChild(ta);
    ta.select();
    try {
      doc.execCommand('copy');
    } catch {
      /* ignore */
    }
    doc.body.removeChild(ta);
    done();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fallback);
  } else {
    fallback();
  }
}

/* ---------- 搜索浮层（M3b-b6）：Pagefind 构建期索引，运行时惰性加载 ---------- */
type PagefindResultData = {
  url: string;
  excerpt: string;
  meta?: { title?: string };
};
type Pagefind = {
  search: (
    q: string
  ) => Promise<{ results: Array<{ data: () => Promise<PagefindResultData> }> }>;
  options?: (o: Record<string, unknown>) => Promise<void>;
};

/* undefined=未加载 null=不可用（dev 无索引/加载失败）；模块级缓存，VT 换页不重复加载 */
let pagefind: Pagefind | null | undefined;
let searchSeq = 0;

async function loadPagefind(): Promise<Pagefind | null> {
  if (pagefind !== undefined) return pagefind;
  try {
    const src = '/pagefind/pagefind.js';
    const res = await fetch(src, { method: 'HEAD' });
    if (!res.ok) throw new Error('no index');
    // 变量形式 + @vite-ignore：构建产物不存在时（dev/无索引）不做静态解析，运行时才加载
    const pf = (await import(/* @vite-ignore */ src)) as unknown as Pagefind;
    if (pf.options) await pf.options({ excerptLength: 20 });
    pagefind = pf;
  } catch {
    pagefind = null;
  }
  return pagefind;
}

function setSearchHint(text: string) {
  const box = doc.getElementById('searchResults');
  if (!box) return;
  box.replaceChildren();
  const p = doc.createElement('div');
  p.className = 'search-hint';
  p.textContent = text;
  box.appendChild(p);
  box.hidden = false;
}

function renderSearchResults(items: PagefindResultData[]) {
  const box = doc.getElementById('searchResults');
  if (!box) return;
  box.replaceChildren();
  for (const item of items) {
    const a = doc.createElement('a');
    a.className = 'search-item';
    a.href = item.url;
    const title = doc.createElement('div');
    title.className = 'search-item-title';
    title.textContent = item.meta?.title || item.url;
    const excerpt = doc.createElement('div');
    excerpt.className = 'search-item-excerpt';
    /* pagefind 产出的受限高亮片段（<mark>/<strong>），非用户输入 */
    excerpt.innerHTML = item.excerpt;
    a.append(title, excerpt);
    box.appendChild(a);
  }
  box.hidden = false;
}

function closeSearch() {
  const pop = doc.getElementById('searchPop');
  if (pop && !pop.hidden) {
    pop.hidden = true;
    doc
      .getElementById('searchToggle')
      ?.setAttribute('aria-expanded', 'false');
  }
  const input = doc.getElementById('searchInput') as HTMLInputElement | null;
  if (input) input.value = '';
  const box = doc.getElementById('searchResults');
  if (box) {
    box.hidden = true;
    box.replaceChildren();
  }
}

/* 输入 → 300ms 防抖查询；searchSeq 丢弃过期响应 */
function runSearch(keyword: string) {
  const seq = ++searchSeq;
  const box = doc.getElementById('searchResults');
  if (!box) return;
  if (!keyword) {
    box.hidden = true;
    box.replaceChildren();
    return;
  }
  setSearchHint(ui('searchLoading'));
  window.setTimeout(async () => {
    if (seq !== searchSeq) return;
    const pf = await loadPagefind();
    if (seq !== searchSeq) return;
    if (!pf) {
      setSearchHint(ui('searchUnavailable'));
      return;
    }
    try {
      const res = await pf.search(keyword);
      const items = await Promise.all(
        res.results.slice(0, 8).map((r) => r.data())
      );
      if (seq !== searchSeq) return;
      if (items.length) renderSearchResults(items);
      else setSearchHint(ui('searchNoResults'));
    } catch {
      if (seq === searchSeq) setSearchHint(ui('searchNoResults'));
    }
  }, 300);
}

/* ---------- 加密文章（M3b-b7）：Web Crypto 解密（与 utils/crypto.ts 构建期参数对齐） ---------- */
const PW_KEY_PREFIX = 'qy-pw:';
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
  const tag = raw.slice(ENC_SALT_LEN + ENC_IV_LEN, ENC_SALT_LEN + ENC_IV_LEN + ENC_TAG_LEN);
  const ct = raw.slice(ENC_SALT_LEN + ENC_IV_LEN + ENC_TAG_LEN);
  // Web Crypto 的 GCM 密文格式为 ciphertext+tag 连续排列，与 node:crypto 的分离输出拼接
  const combined = new Uint8Array(ct.length + ENC_TAG_LEN);
  combined.set(ct);
  combined.set(tag, ct.length);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pwd),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return new TextDecoder().decode(plain);
}

/** 解密成功：注入 HTML → 隐藏锁 UI → 重跑 reveal 动画（灯箱/复制为委托，自动生效） */
function showDecrypted(container: HTMLElement, contentEl: HTMLElement, html: string) {
  contentEl.innerHTML = html;
  contentEl.hidden = false;
  container.hidden = true;
  initReveal();
}

function initEncrypted() {
  const container = doc.getElementById('encryptedContainer');
  const contentEl = doc.getElementById('decryptedContent');
  if (!container || !contentEl || container.hidden) return;
  const data = container.getAttribute('data-encrypted') || '';
  if (!data) return;
  const slug = container.getAttribute('data-slug') || '';
  const cacheKey = PW_KEY_PREFIX + slug;
  const form = doc.getElementById('encForm') as HTMLFormElement | null;
  const input = doc.getElementById('encInput') as HTMLInputElement | null;
  const errorEl = doc.getElementById('encError');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = input?.value.trim() ?? '';
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
doc.addEventListener('click', (e) => {
  const target = e.target as Element;
  if (!target || typeof target.closest !== 'function') return;

  /* 点击调色面板/搜索浮层外部时先收起（不拦截后续点击行为） */
  if (!target.closest('.palette-wrap')) {
    const pop = doc.getElementById('palettePop');
    if (pop && !pop.hidden) closePalette();
  }
  if (!target.closest('.search-wrap')) {
    const pop = doc.getElementById('searchPop');
    if (pop && !pop.hidden) closeSearch();
  }

  /* 搜索浮层开关 */
  if (target.closest('#searchToggle')) {
    const pop = doc.getElementById('searchPop');
    if (pop) {
      pop.hidden = !pop.hidden;
      doc
        .getElementById('searchToggle')
        ?.setAttribute('aria-expanded', pop.hidden ? 'false' : 'true');
      if (!pop.hidden) {
        (doc.getElementById('searchInput') as HTMLInputElement | null)?.focus();
      }
    }
    return;
  }

  /* 搜索结果点击：收起浮层后放行默认导航（VT 接管换页） */
  if (target.closest('.search-item')) {
    closeSearch();
  }

  /* 调色面板开关 */
  const paletteToggle = target.closest('#paletteToggle');
  if (paletteToggle) {
    const pop = doc.getElementById('palettePop');
    if (pop) {
      pop.hidden = !pop.hidden;
      paletteToggle.setAttribute('aria-expanded', pop.hidden ? 'false' : 'true');
    }
    return;
  }

  /* 预设色板 */
  const swatch = target.closest<HTMLElement>('.palette-pop .swatch');
  if (swatch) {
    const h = parseFloat(swatch.dataset.hue || '');
    if (Number.isFinite(h)) applyHue(h);
    return;
  }

  /* hue 重置：移除运行时覆写，回落到构建期 accentColor */
  if (target.closest('#hueReset')) {
    root.style.removeProperty('--accent-h');
    persistHue(null);
    syncPaletteUI(buildHue());
    return;
  }

  /* 模式切换 */
  if (target.closest('#modeToggle')) {
    const dark = root.classList.toggle('dark');
    try {
      localStorage.setItem('qy-mode', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    return;
  }

  /* burger 导航 */
  if (target.closest('#navToggle')) {
    const nav = doc.getElementById('siteNav');
    if (nav) {
      const open = nav.classList.toggle('open');
      target
        .closest('#navToggle')!
        .setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    return;
  }

  /* back-top */
  if (target.closest('#backTop')) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  /* 灯箱控制按钮 */
  if (target.closest('.lb-close')) {
    closeLb();
    return;
  }
  if (target.closest('.lb-prev')) {
    e.stopPropagation();
    lbShow(lbIdx - 1);
    return;
  }
  if (target.closest('.lb-next')) {
    e.stopPropagation();
    lbShow(lbIdx + 1);
    return;
  }
  if (lb && lb.classList.contains('open') && target === lb) {
    closeLb();
    return;
  }

  /* 相册组绑定（b8）：data-lightbox-group 容器内点 data-lightbox-item，整组浏览 */
  const group = target.closest('[data-lightbox-group]');
  if (group) {
    const cards = Array.from(group.querySelectorAll('[data-lightbox-item]'));
    const card = target.closest('[data-lightbox-item]');
    if (card) {
      const items = cards
        .map((c) => c.querySelector('img'))
        .filter((img): img is HTMLImageElement => !!img)
        .map((img) => ({ src: img.src, cap: img.getAttribute('alt') || '' }));
      openLb(items, Math.max(0, cards.indexOf(card)));
    }
    return;
  }

  /* 单图绑定：figure[data-lightbox] / [data-lightbox]（含 rehypeFigure 产物） */
  const holder = target.closest('[data-lightbox]');
  if (holder) {
    const img =
      holder.tagName === 'IMG'
        ? (holder as HTMLImageElement)
        : holder.querySelector('img');
    if (img) {
      e.preventDefault();
      openLb([{ src: img.src, cap: img.getAttribute('alt') || '' }], 0);
    }
    return;
  }

  /* 代码块复制 */
  const copyBtn = target.closest('.copy-btn');
  if (copyBtn) {
    handleCopy(copyBtn);
    return;
  }

  /* 分享海报（b9.6）：文章页「生成分享海报」按钮 */
  const shareBtn = target.closest('#qy-share-btn');
  if (shareBtn) {
    openSharePoster(shareBtn as HTMLElement);
    return;
  }
});

/* input 委托（VT 安全）：hue 滑杆 + 搜索输入 */
doc.addEventListener('input', (e) => {
  const el = e.target as Element | null;
  if (el && el.id === 'hueSlider') {
    const h = parseFloat((el as HTMLInputElement).value);
    if (Number.isFinite(h)) applyHue(h);
  }
  if (el && el.id === 'searchInput') {
    runSearch((el as HTMLInputElement).value.trim());
  }
});

doc.addEventListener('keydown', (e) => {
  /* 搜索浮层：Esc 关闭 */
  if (e.key === 'Escape') {
    const pop = doc.getElementById('searchPop');
    if (pop && !pop.hidden) {
      closeSearch();
      return;
    }
  }
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
  else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
  else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
});

/* ---------- LQIP（b9.5）：图片加载完成后淡出占位渐变 ---------- */
function initLqip() {
  doc.querySelectorAll<HTMLImageElement>('img[data-lqip]').forEach((img) => {
    const box = img.parentElement;
    if (!box) return;
    const done = () => box.classList.add('qy-img-in');
    // 缓存命中立即淡出；load/error 均淡出（失败也不能永久盖住图位）
    if (img.complete && img.naturalWidth > 0) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
}

/* ---------- 生命周期 ---------- */
function initPage() {
  ensureLightbox();
  initNavActive();
  closeMobileNav();
  initReveal();
  initTocSpy();
  updateBackTop();
  initPalette();
  initEncrypted();
  initLqip();
}
initPage();
doc.addEventListener('astro:page-load', initPage);
