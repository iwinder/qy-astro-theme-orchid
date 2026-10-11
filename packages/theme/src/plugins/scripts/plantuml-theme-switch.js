/*
 * PlantUML 客户端脚本（构建期由 rehype 插件以纯文本注入 <script>）
 *
 * 职责：
 *   - 跟随 html.dark 切换 img 的 light/dark 源（构建期已编码双主题 URL）
 *   - 图片加载失败降级为错误提示 + 重试按钮
 *   - 响应 astro:page-load（ClientRouter 换页）重新应用主题
 *
 * identical inline 脚本在 VT 换页时按内容去重不重跑，故以
 * window.plantumlThemeInit 防重入 + 事件监听实现跨页生效。
 */
(function () {
  if (window.plantumlThemeInit) return;
  window.plantumlThemeInit = true;

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function applyTheme() {
    var dark = isDark();
    document.querySelectorAll('.plantuml-wrapper img.plantuml-image').forEach(function (img) {
      var next = dark ? img.getAttribute('data-dark-src') : img.getAttribute('data-light-src');
      if (next && img.src !== next) img.src = next;
    });
  }

  function showFallback(img, message) {
    var wrapper = img.closest('.plantuml-wrapper');
    var container = img.closest('.plantuml-diagram-container');
    if (!wrapper || !container || wrapper.querySelector('.plantuml-error')) return;
    var box = document.createElement('div');
    box.className = 'plantuml-error';
    var p = document.createElement('p');
    p.textContent = message || 'PlantUML 图表加载失败，请检查网络或 PlantUML 服务可用性';
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重试';
    retry.addEventListener('click', function () {
      box.remove();
      img.style.display = '';
      var light = img.getAttribute('data-light-src');
      img.src = light + (light.indexOf('?') > -1 ? '&' : '?') + 'retry=' + Date.now();
    });
    box.appendChild(p);
    box.appendChild(retry);
    img.style.display = 'none';
    wrapper.appendChild(box);
  }

  function initAll() {
    document.querySelectorAll('.plantuml-wrapper img.plantuml-image').forEach(function (img) {
      if (img.dataset.plantumlInit === 'true') return;
      img.dataset.plantumlInit = 'true';
      img.addEventListener('error', function () {
        showFallback(img);
      });
      // 加载完成后通知 pan-zoom 重建控制栏（若有共享脚本）
      img.addEventListener('load', function () {
        var container = img.closest('.diagram-container');
        if (container && typeof window._diagramPanZoomReinit === 'function') {
          window._diagramPanZoomReinit(container);
        }
      });
    });
    applyTheme();
  }

  // 深浅切换（侧栏按钮直接改 html.dark，无自定义事件可听，用 Observer 兜底）
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  document.addEventListener('astro:page-load', initAll);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();
