/**
 * rehype 图表插件（M3b-b4，移植自 orchid-blog）
 *
 * - rehypeMermaid：div.mermaid-container → 构建期 beautiful-mermaid 渲染
 *   light/dark 双静态 SVG（div.mermaid-svg-light/-dark 包裹，CSS 按主题显隐），
 *   失败降级 .mermaid-error + pre.mermaid-fallback-code 源码展示，零客户端运行时
 * - rehypePlantuml：div.plantuml-wrapper → img.plantuml-image（data-light-src/-dark-src），
 *   客户端 plantuml-theme-switch.js 按主题切换 src、加载失败展示重试
 * - rehypeDiagramPanZoom：为含图表的文章注入 diagram-panzoom.js（控制栏/拖拽/全屏）
 *
 * 偏差（相对 orchid）：
 * - 客户端脚本改 readFileSync 模块顶层读入，不依赖 Vite ?raw 管线
 * - panzoom 脚本仅对实际含图表的 tree 注入（orchid 无条件注入）
 * - plantuml wrapper 不再生成随机 id（保证构建产物可复现）
 */

import { readFileSync } from 'node:fs';
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid';

type Transformer = (tree: any, file: any) => void;

/** 深度遍历辅助（与 rehype.ts 内 visit 同风格），fn 返回 'skip' 跳过子树 */
function visit(node: any, fn: (n: any) => void | 'skip') {
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (fn(child) !== 'skip') visit(child, fn);
  }
}

const panzoomScript = readFileSync(
  new URL('./scripts/diagram-panzoom.js', import.meta.url),
  'utf8',
);

const plantumlSwitchScript = readFileSync(
  new URL('./scripts/plantuml-theme-switch.js', import.meta.url),
  'utf8',
);

/** 本 rehype tree 已注入过 panzoom 脚本（每篇文档最多一次） */
const panzoomInjected = new WeakSet<object>();

function hasClass(node: any, name: string): boolean {
  const cls = node.properties?.className;
  return Array.isArray(cls) && cls.includes(name);
}

function injectScript(tree: any, code: string) {
  tree.children.push({
    type: 'element',
    tagName: 'script',
    properties: {},
    children: [{ type: 'text', value: code }],
  });
}

function injectPanzoom(tree: any) {
  if (panzoomInjected.has(tree)) return;
  panzoomInjected.add(tree);
  injectScript(tree, panzoomScript);
}

export interface MermaidOptions {
  lightTheme: string;
  darkTheme: string;
}

export function rehypeMermaid(options: MermaidOptions): Transformer {
  return (tree) => {
    let found = false;
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'div') return;
      if (!hasClass(node, 'mermaid-container')) return;
      const code = String(node.properties?.['data-mermaid-code'] ?? '');
      const wrapper: any = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['diagram-wrapper', 'mermaid-wrapper'] },
        children: [],
      };
      try {
        const lightSvg = renderMermaidSVG(code, { ...THEMES[options.lightTheme], padding: 20 });
        const darkSvg = renderMermaidSVG(code, { ...THEMES[options.darkTheme], padding: 20 });
        wrapper.children.push(
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['mermaid-svg-light'] },
            children: [{ type: 'raw', value: lightSvg }],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['mermaid-svg-dark'] },
            children: [{ type: 'raw', value: darkSvg }],
          },
        );
        node.tagName = 'div';
        node.properties = { className: ['diagram-container', 'mermaid-diagram-container'] };
        node.children = [wrapper];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const preview = code.length > 200 ? `${code.slice(0, 200)}…` : code;
        console.error(`[theme] Mermaid 渲染失败（${message}）：\n${preview}`);
        node.properties = { className: ['diagram-container', 'mermaid-diagram-container', 'mermaid-error'] };
        node.children = [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: 'Mermaid 图表渲染失败，已展示源码：' }],
          },
          {
            type: 'element',
            tagName: 'pre',
            properties: { className: ['mermaid-fallback-code'] },
            children: [
              { type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value: code }] },
            ],
          },
        ];
      }
      found = true;
      return 'skip';
    });
    if (found) injectPanzoom(tree);
  };
}

export function rehypePlantuml(): Transformer {
  return (tree) => {
    let found = false;
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'div') return;
      if (!hasClass(node, 'plantuml-wrapper')) return;
      const lightSrc = String(node.properties?.['data-light-src'] ?? '');
      const darkSrc = String(node.properties?.['data-dark-src'] ?? lightSrc);
      const alt = String(node.properties?.['data-plantuml-alt'] || 'PlantUML diagram');
      const img = {
        type: 'element',
        tagName: 'img',
        properties: {
          className: ['plantuml-image'],
          src: lightSrc,
          alt,
          'data-light-src': lightSrc,
          'data-dark-src': darkSrc,
          loading: 'lazy',
          decoding: 'async',
        },
        children: [],
      };
      node.tagName = 'div';
      node.properties = { className: ['diagram-container', 'plantuml-diagram-container'] };
      node.children = [
        { type: 'element', tagName: 'div', properties: { className: ['plantuml-wrapper'] }, children: [img] },
      ];
      found = true;
      return 'skip';
    });
    if (found) {
      injectPanzoom(tree);
      // PlantUML 主题切换/失败重试脚本（与 panzoom 互相独立，各自防重入）
      injectScript(tree, plantumlSwitchScript);
    }
  };
}

/** 单独挂载时的兜底：扫描 tree 中任意图表容器并注入 panzoom 脚本 */
export function rehypeDiagramPanZoom(): Transformer {
  return (tree) => {
    if (panzoomInjected.has(tree)) return;
    let found = false;
    visit(tree, (node) => {
      if (found) return 'skip';
      if (node.type === 'element' && node.tagName === 'div' && hasClass(node, 'diagram-container')) {
        found = true;
        return 'skip';
      }
    });
    if (found) injectPanzoom(tree);
  };
}
