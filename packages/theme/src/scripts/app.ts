/* 清言集 · Theme Orchid — 全局交互脚本
   移植自 design/prototype/app.js（冻结），改造为 View Transitions 兼容版：
   - document/window 级一次性委托监听（VT 换页不失联）
   - astro:page-load 时重初始化页面级状态（nav active / reveal / TOC spy / 灯箱 DOM）
   - astro:after-swap 时重应用暗色 class（VT swap 会替换 <html> 属性）
   跳过原型中的 palette 调色与搜索浮层（M3b 启用） */

'use strict';

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
  el.setAttribute('aria-label', '图片查看');
  el.innerHTML =
    '<span class="lb-counter"></span>' +
    '<button class="lb-btn lb-close" type="button" aria-label="关闭">' +
    LB_SVGS.close +
    '</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="上一张">' +
    LB_SVGS.prev +
    '</button>' +
    '<img class="lb-img" alt=""/>' +
    '<button class="lb-btn lb-next" type="button" aria-label="下一张">' +
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
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '复制';
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

/* ---------- document 级委托（一次性，VT 换页不失联） ---------- */
doc.addEventListener('click', (e) => {
  const target = e.target as Element;
  if (!target || typeof target.closest !== 'function') return;

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
});

doc.addEventListener('keydown', (e) => {
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
  else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
  else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
});

/* ---------- 生命周期 ---------- */
function initPage() {
  ensureLightbox();
  initNavActive();
  closeMobileNav();
  initReveal();
  initTocSpy();
  updateBackTop();
}
initPage();
doc.addEventListener('astro:page-load', initPage);
