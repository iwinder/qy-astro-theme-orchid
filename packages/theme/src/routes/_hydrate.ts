import { render } from 'astro:content';
import type { PostLike } from '../utils.js';

/**
 * 批量「补水」：remark/rehype 插件（阅读时长/自动摘要/首图）把结果写入
 * file.data.astro.frontmatter，组件侧必须经 render(post).remarkPluginFrontmatter 读取。
 * 本函数批量渲染并把这些字段 merge 回 post.data，供 PostCard 等组件直接消费。
 *
 * render() 是完整 Markdown 编译，代价高——只对当前页面用到的文章调用，
 * 不要对全站列表无差别调用。
 */
export async function hydratePosts<T extends PostLike>(posts: T[]): Promise<T[]> {
  return Promise.all(
    posts.map(async (post) => {
      const { remarkPluginFrontmatter } = await render(post as unknown as Parameters<typeof render>[0]);
      const fm = remarkPluginFrontmatter as Record<string, unknown>;
      return {
        ...post,
        data: {
          ...post.data,
          excerpt: (fm.excerpt as string | undefined) ?? post.data.excerpt,
          firstImage: (fm.firstImage as string | undefined) ?? post.data.firstImage,
          words: (fm.words as number | undefined) ?? post.data.words,
          minutes: (fm.minutes as number | undefined) ?? post.data.minutes,
        },
      };
    }),
  );
}
