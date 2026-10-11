import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import config from 'virtual:theme/config';
import { collectCategories, collectTags, getSortedPosts } from '../utils.js';

const now = () => new Date().toISOString();

/** W3C datetime（sitemap lastmod），无时间部分也可，保留完整 ISO 即可 */
const w3c = (d: Date) => d.toISOString();

/** URL 构造（new URL 自动把中文百分号编码，符合 sitemap 规范） */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://blog.example.com');
  const url = (path: string) => new URL(path, base).href;

  const all = await getCollection('posts', ({ data }) => !data.draft);
  const sorted = getSortedPosts(all);
  const total = Math.max(1, Math.ceil(
    sorted.filter((p) => !p.data.pinned).length / config.postList.pageSize,
  ));

  const entries: string[] = [];
  const add = (path: string, lastmod?: string) => {
    entries.push(
      ['  <url>', `    <loc>${url(path)}</loc>`, lastmod ? `    <lastmod>${lastmod}</lastmod>` : null, '  </url>']
        .filter(Boolean)
        .join('\n'),
    );
  };

  // 静态路由
  add('/', now());
  add('/archive/', now());
  add('/tags/', now());
  add('/categories/', now());
  // 文章分页（第 1 页即 /，已包含）
  for (let p = 2; p <= total; p++) add(`/page/${p}/`, now());
  // 标签 / 分类
  for (const tag of collectTags(sorted).keys()) add(`/tags/${encodeURIComponent(tag)}/`, now());
  for (const cat of collectCategories(sorted).keys()) add(`/categories/${encodeURIComponent(cat)}/`, now());
  // 文章（lastmod = updated || published）
  for (const post of sorted) {
    add(`/posts/${post.id}/`, w3c(post.data.updated ?? post.data.published));
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
