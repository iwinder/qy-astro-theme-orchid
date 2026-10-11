/**
 * 邮箱防爬（M3b-b4，移植自 orchid-blog）
 *
 * 构建期把 mailto: 链接的地址编码进 data-encoded-email，href 置为 '#'，
 * 并内联一段 onclick 解码脚本：点击时还原地址 → 回写 href → 延时补一次点击。
 * 爬虫不执行点击，拿不到明文邮箱；解码逻辑随属性内联，无需额外客户端资源。
 *
 * 偏差说明：orchid 会向 head 注入占位样式，本主题统一并入 global.css
 * （a[data-encoded-email] 光标提示），插件保持纯 DOM 变换。
 */

type Transformer = (tree: any, file: any) => void;

/** 深度遍历辅助（与 rehype.ts 内 visit 同风格），fn 返回 'skip' 跳过子树 */
function visit(node: any, fn: (n: any) => void | 'skip') {
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (fn(child) !== 'skip') visit(child, fn);
  }
}

export interface EmailProtectionOptions {
  /** base64：兼容性最好（btoa 仅支持 Latin1，超集地址跳过保护保持原样）；rot13：零 API 依赖 */
  method: 'base64' | 'rot13';
}

const encodeBase64 = (value: string): string | null => {
  try {
    // Buffer 在 Node 构建期可用；btoa 遇非 Latin1 会抛错，统一 try/catch 兜底
    return typeof Buffer !== 'undefined'
      ? Buffer.from(value, 'utf8').toString('base64')
      : btoa(value);
  } catch {
    return null;
  }
};

const encodeRot13 = (value: string): string =>
  value.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

/** 点击时还原地址并补一次点击（压缩成单行内联，this 为链接元素自身） */
const ONCLICK_TEMPLATE = (method: 'base64' | 'rot13') => {
  const decode =
    method === 'base64'
      ? 'function(e){return decodeURIComponent(escape(atob(e)))}'
      : 'function(e){return e.replace(/[a-zA-Z]/g,function(c){var b=c.charCodeAt(0),s=c<="Z"?65:97;return String.fromCharCode((b-s+13)%26+s)})}';
  return `(function(){var e=this.getAttribute('data-encoded-email');if(!e)return;this.removeAttribute('data-encoded-email');this.setAttribute('href','mailto:'+(${decode})(e));var a=this;setTimeout(function(){a.click()},0)}).call(this);return false`
    .replace(/\s+/g, ' ')
    .trim();
};

export function rehypeEmailProtection(options: EmailProtectionOptions): Transformer {
  const encode = options.method === 'base64' ? encodeBase64 : encodeRot13;
  const onclick = ONCLICK_TEMPLATE(options.method);
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'a') return;
      const href = String(node.properties?.href ?? '');
      if (!href.toLowerCase().startsWith('mailto:')) return;
      const address = href.slice('mailto:'.length);
      const encoded = encode(address);
      // 编码失败（非 Latin1 的 base64 场景）保持原链接，不做半吊子保护
      if (!encoded) return;
      node.properties['data-encoded-email'] = encoded;
      node.properties.href = '#';
      node.properties.onclick = onclick;
    });
  };
}
