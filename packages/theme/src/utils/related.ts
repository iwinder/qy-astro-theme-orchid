import type { PostLike } from '../utils.js';

/**
 * 标题分词：Intl.Segmenter 对中文按词切分，英文/数字按词切分；
 * 过滤标点与空白，英文统一小写。每次调用新建 segmenter 成本可接受（构建期）。
 */
function tokenizeTitle(title: string): Set<string> {
  const tokens = new Set<string>();
  const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
  for (const { segment, isWordLike } of segmenter.segment(title)) {
    if (!isWordLike) continue;
    tokens.add(segment.toLowerCase());
  }
  return tokens;
}

/** Jaccard 相似度：交集 / 并集（空集对空集记 0） */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 相关文章推荐（P1-12，移植自 orchid-blog getRelatedPosts）。
 * 评分：totalScore = tagMatchScore(0-100) + titleSimilarityScore(0-100)
 *                    + timeFreshnessScore(0-30) + categoryBonus(0|10)
 * - 标签/标题均为 Jaccard 相似度 × 100
 * - 时间新鲜度按 6 个月半衰期指数衰减
 * - 同分类加 10 分
 * 候选排除：自身与加密文章（加密内容不可预览，标题亦不进推荐位）。
 * 排序：先取有标签匹配者（按总分降序），不足 maxCount 时
 * 用无标签匹配者按「新鲜度 + 同分类」降序补充。
 */
export function getRelatedPosts<T extends PostLike>(all: T[], current: T, maxCount = 5): T[] {
  if (maxCount <= 0) return [];
  const candidates = all.filter((p) => p.id !== current.id && !p.data.password);

  const currentTags = new Set(current.data.tags || []);
  const currentTokens = tokenizeTitle(current.data.title);
  const currentCategory = current.data.category || '';
  const now = Date.now();

  const scored = candidates.map((post) => {
    const tagMatchScore = jaccardSimilarity(currentTags, new Set(post.data.tags || [])) * 100;
    const titleSimilarityScore = jaccardSimilarity(currentTokens, tokenizeTitle(post.data.title)) * 100;
    const daysSincePublished = (now - post.data.published.getTime()) / (1000 * 60 * 60 * 24);
    const timeFreshnessScore = 30 * Math.exp((-Math.LN2 * daysSincePublished) / 180);
    const postCategory = post.data.category || '';
    const categoryBonus = currentCategory && postCategory && currentCategory === postCategory ? 10 : 0;
    return { post, totalScore: tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus, tagMatchScore, timeFreshnessScore, categoryBonus };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);

  const result: T[] = [];
  for (const s of scored) {
    if (result.length >= maxCount) break;
    if (s.tagMatchScore > 0) result.push(s.post);
  }
  if (result.length < maxCount) {
    const rest = scored
      .filter((s) => s.tagMatchScore === 0)
      .sort((a, b) => b.timeFreshnessScore + b.categoryBonus - (a.timeFreshnessScore + a.categoryBonus));
    for (const s of rest) {
      if (result.length >= maxCount) break;
      result.push(s.post);
    }
  }
  return result;
}
