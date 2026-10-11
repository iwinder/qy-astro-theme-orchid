/*
 * 图表 pan-zoom / 全屏交互脚本（共享，构建期由 rehype 插件以纯文本注入）
 *
 * 为 .diagram-container 提供：
 *   - 拖拽平移（触摸设备主区域禁用拖拽，避免干扰滚动）
 *   - 缩放控制栏（+、−、重置、全屏）
 *   - 双击放大/重置、全屏滚轮缩放、双指捏合
 *   - 全屏 overlay（独立缩放、Escape/背景点击关闭）
 *   - 响应 astro:page-load 页面切换
 *
 * identical inline 脚本 VT 换页不重跑，故以 window._diagramPanZoomInit
 * 防重入 + astro:page-load 监听实现跨页初始化。
 */
(function () {
  if (window._diagramPanZoomInit) return;
  window._diagramPanZoomInit = true;

  var MIN_SCALE = 0.5;
  var MAX_SCALE = 5;
  var SCALE_STEP = 1.2;
  var overlays = new Set();

  /** 深浅模式各有一套 SVG（Mermaid）时选当前可见目标 */
  function selectTarget(container) {
    var isDark = document.documentElement.classList.contains('dark');
    var lightEl = container.querySelector('.mermaid-svg-light svg');
    var darkEl = container.querySelector('.mermaid-svg-dark svg');
    if (lightEl && darkEl) return isDark ? darkEl : lightEl;
    return container.querySelector('svg, img, .diagram-panzoom-target');
  }

  function initInteraction(container) {
    if (container.dataset.pzInit === 'true') return;
    container.dataset.pzInit = 'true';

    var targets = Array.from(
      container.querySelectorAll('.mermaid-svg-light svg, .mermaid-svg-dark svg'),
    );
    if (targets.length === 0) {
      var single = container.querySelector('svg, img, .diagram-panzoom-target');
      if (single) targets = [single];
    }
    if (targets.length === 0) return;

    var getActiveTarget = function () {
      return selectTarget(container) || targets[0];
    };

    var state = { scale: 1, tx: 0, ty: 0 };
    var apply = function () {
      targets.forEach(function (t) {
        t.style.transformOrigin = 'center center';
        t.style.transform =
          'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.scale + ')';
      });
    };
    var clamp = function (s) {
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
    };
    var reset = function () {
      state.scale = 1;
      state.tx = 0;
      state.ty = 0;
      apply();
    };
    var zoomBy = function (f, ox, oy) {
      var prev = state.scale;
      var next = clamp(prev * f);
      if (next === prev) return;
      if (typeof ox === 'number' && typeof oy === 'number') {
        var r = getActiveTarget().getBoundingClientRect();
        var dx = ox - (r.left + r.width / 2);
        var dy = oy - (r.top + r.height / 2);
        var ratio = next / prev;
        state.tx -= dx * (ratio - 1);
        state.ty -= dy * (ratio - 1);
      }
      state.scale = next;
      apply();
    };

    // 控制栏：放大 / 缩小 / 重置 / 全屏
    var controls = document.createElement('div');
    controls.className = 'diagram-controls';
    [
      ['+', '放大', function () { zoomBy(SCALE_STEP); }],
      ['−', '缩小', function () { zoomBy(1 / SCALE_STEP); }],
      ['↺', '重置', reset],
      ['⛶', '全屏', function () { openFullscreen(container); }],
    ].forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'diagram-ctrl-btn';
      el.textContent = b[0];
      el.title = b[1];
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        b[2]();
      });
      controls.appendChild(el);
    });
    container.appendChild(controls);

    // 拖拽平移（鼠标；触摸交给原生滚动/捏合）
    var dragging = false;
    var sx = 0;
    var sy = 0;
    var stx = 0;
    var sty = 0;
    container.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      if (e.target.closest('.diagram-controls')) return;
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      stx = state.tx;
      sty = state.ty;
      if (container.setPointerCapture) container.setPointerCapture(e.pointerId);
      container.style.cursor = 'grabbing';
    });
    container.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      state.tx = stx + (e.clientX - sx);
      state.ty = sty + (e.clientY - sy);
      apply();
    });
    var endDrag = function (e) {
      if (!dragging) return;
      dragging = false;
      if (container.releasePointerCapture) container.releasePointerCapture(e.pointerId);
      container.style.cursor = '';
    };
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);

    // 双击：已放大则复位，否则以点击处为中心放大
    container.addEventListener('dblclick', function (e) {
      if (e.target.closest('.diagram-controls')) return;
      if (state.scale !== 1) reset();
      else zoomBy(SCALE_STEP * SCALE_STEP, e.clientX, e.clientY);
    });

    apply();
  }

  function openFullscreen(container) {
    var currentTarget = selectTarget(container);
    if (!currentTarget) return;

    var overlay = document.createElement('div');
    overlay.className = 'diagram-fullscreen-overlay';
    var content = document.createElement('div');
    content.className = 'diagram-fs-content';
    var clone = currentTarget.cloneNode(true);
    clone.style.transform = '';
    content.appendChild(clone);

    var fsControls = document.createElement('div');
    fsControls.className = 'diagram-fs-controls';
    var st = { scale: 1, tx: 0, ty: 0 };
    var apply = function () {
      clone.style.transformOrigin = 'center center';
      clone.style.transform =
        'translate(' + st.tx + 'px,' + st.ty + 'px) scale(' + st.scale + ')';
    };
    var zoom = function (f, ox, oy) {
      var prev = st.scale;
      var next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * f));
      if (next === prev) return;
      if (typeof ox === 'number' && typeof oy === 'number') {
        var r = clone.getBoundingClientRect();
        var dx = ox - (r.left + r.width / 2);
        var dy = oy - (r.top + r.height / 2);
        var ratio = next / prev;
        st.tx -= dx * (ratio - 1);
        st.ty -= dy * (ratio - 1);
      }
      st.scale = next;
      apply();
    };
    var rst = function () {
      st.scale = 1;
      st.tx = 0;
      st.ty = 0;
      apply();
    };
    var close = function () {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      overlays.delete(overlay);
    };
    var onKey = function (e) {
      if (e.key === 'Escape') close();
    };

    [
      ['+', '放大', function () { zoom(SCALE_STEP); }],
      ['−', '缩小', function () { zoom(1 / SCALE_STEP); }],
      ['↺', '重置', rst],
      ['✕', '关闭', close],
    ].forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'diagram-ctrl-btn';
      el.textContent = b[0];
      el.title = b[1];
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        b[2]();
      });
      fsControls.appendChild(el);
    });

    // 全屏滚轮缩放
    content.addEventListener(
      'wheel',
      function (e) {
        e.preventDefault();
        zoom(e.deltaY < 0 ? SCALE_STEP : 1 / SCALE_STEP, e.clientX, e.clientY);
      },
      { passive: false },
    );

    // 全屏拖拽平移
    var fdrag = false;
    var fsx = 0;
    var fsy = 0;
    var fstx = 0;
    var fsty = 0;
    content.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.diagram-fs-controls')) return;
      if (e.pointerType === 'touch' && e.isPrimary === false) return;
      fdrag = true;
      fsx = e.clientX;
      fsy = e.clientY;
      fstx = st.tx;
      fsty = st.ty;
      if (content.setPointerCapture) content.setPointerCapture(e.pointerId);
    });
    content.addEventListener('pointermove', function (e) {
      if (!fdrag) return;
      st.tx = fstx + (e.clientX - fsx);
      st.ty = fsty + (e.clientY - fsy);
      apply();
    });
    var fEnd = function (e) {
      if (!fdrag) return;
      fdrag = false;
      if (content.releasePointerCapture) content.releasePointerCapture(e.pointerId);
    };
    content.addEventListener('pointerup', fEnd);
    content.addEventListener('pointercancel', fEnd);

    // 双指捏合缩放（以手势初始状态为基准，避免闪烁）
    var pinchDist = 0;
    var pinchScale = 1;
    var pinchTx = 0;
    var pinchTy = 0;
    var pinchCx = 0;
    var pinchCy = 0;
    content.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length === 2) {
          e.preventDefault();
          var t0 = e.touches[0];
          var t1 = e.touches[1];
          pinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
          pinchScale = st.scale;
          pinchTx = st.tx;
          pinchTy = st.ty;
          pinchCx = (t0.clientX + t1.clientX) / 2;
          pinchCy = (t0.clientY + t1.clientY) / 2;
        }
      },
      { passive: false },
    );
    content.addEventListener(
      'touchmove',
      function (e) {
        if (e.touches.length === 2) {
          e.preventDefault();
          var t0 = e.touches[0];
          var t1 = e.touches[1];
          var newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
          var newScale = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, pinchScale * (newDist / pinchDist)),
          );
          var ratio = newScale / pinchScale;
          st.scale = newScale;
          st.tx = pinchCx - ratio * (pinchCx - pinchTx);
          st.ty = pinchCy - ratio * (pinchCy - pinchTy);
          apply();
        }
      },
      { passive: false },
    );

    // 背景点击关闭
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    overlay.appendChild(content);
    overlay.appendChild(fsControls);
    document.body.appendChild(overlay);
    overlays.add(overlay);
    document.addEventListener('keydown', onKey);
  }

  function closeAll() {
    overlays.forEach(function (o) {
      o.remove();
    });
    overlays.clear();
  }

  function initAll() {
    document.querySelectorAll('.diagram-container').forEach(function (c) {
      initInteraction(c);
    });
  }

  // 暴露重建入口，供 PlantUML 图片加载完成后清理旧控制栏再初始化
  window._diagramPanZoomReinit = function (container) {
    var oldControls = container.querySelector('.diagram-controls');
    if (oldControls) oldControls.remove();
    container.dataset.pzInit = 'false';
    initInteraction(container);
  };

  document.addEventListener('astro:before-preparation', closeAll);
  document.addEventListener('astro:page-load', function () {
    closeAll();
    initAll();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();
