import type { APIRoute } from "astro";

/**
 * PWA Service Worker（§4.95）：构建期生成 /sw.js 文本，手写、零客户端运行时依赖。
 * - 缓存名带构建号（DEV 固定 "dev"）：新构建上线后旧缓存整体作废，activate 全清；
 * - 三条策略：① 导航请求 network-first，成功回填缓存，离线回落自身缓存、再兜底
 *   预缓存的首页；② /_astro/ 产物带内容哈希，cache-first；③ 其余同源 GET 走
 *   stale-while-revalidate，缓存桶超 60 条删最早一条防膨胀；
 * - 非 GET、跨域、/api/（随机数据端点）、/og/（分享图 PNG 较大）一律直连不缓存；
 * - install 预缓存首页作离线兜底（不另造 offline 页），skipWaiting 即刻接管；
 *   activate 清全部旧缓存并 clients.claim()。
 * SW 文本内不使用模板字符串（避免与本文件 TS 模板嵌套转义），常量经 JSON.stringify 注入。
 */
export const GET: APIRoute = ({ site }) => {
	const base = new URL("/", site ?? new URL("https://blog.example.com"))
		.pathname;
	const cacheName =
		"orchid-pwa-" + (import.meta.env.DEV ? "dev" : Date.now().toString(36));
	const sw = `// 由 astro-theme-orchid 构建期生成（§4.95），请勿手改
const CACHE = ${JSON.stringify(cacheName)};
const BASE = ${JSON.stringify(base)};
const SCOPE_MAX = 60;

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.add(new Request(BASE, { cache: "reload" }));
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var path = url.pathname;
  if (path.indexOf(BASE + "api/") === 0 || path.indexOf(BASE + "og/") === 0) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(req, copy);
          });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match(BASE);
          });
        })
    );
    return;
  }

  if (path.indexOf(BASE + "_astro/") === 0) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(req, copy).then(function () {
                caches.open(CACHE).then(function (bucket) {
                  bucket.keys().then(function (keys) {
                    if (keys.length > SCOPE_MAX) bucket.delete(keys[0]);
                  });
                });
              });
            });
          }
          return res;
        })
        .catch(function () {
          return hit;
        });
      if (hit) {
        event.waitUntil(network);
        return hit;
      }
      return network;
    })
  );
});
`;
	return new Response(sw, {
		headers: { "Content-Type": "text/javascript; charset=utf-8" },
	});
};
