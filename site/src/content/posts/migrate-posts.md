---
title: 文章迁移工具：把 Hexo / Hugo 旧文搬进来
description: 用主题自带的 migrate-posts.mjs 批量迁移旧博客文章——dry-run 预览、三平台 frontmatter 映射、标题与发布时间兜底、报告解读与迁移后检查清单。
published: 2026-10-20
tags:
  - 主题机制
  - 迁移
category: 技术
series: 主题使用指南
seriesGroup: 进阶
seriesOrder: 30
---

从 Hexo、Hugo 或其他 Markdown 博客搬过来，最繁琐的往往不是搭站，而是几十上百篇旧文的 frontmatter——各家字段名五花八门（`date` / `lastmod` / `categories` / `photos`……），而主题的 `definePostSchema` 只认自己那套（`title`、`published` 必需，其余见[写作指南](/posts/writing/)）。手动逐篇改不现实。

主题自带一个迁移脚本 `migrate-posts.mjs`：递归扫描源文章目录，按平台映射 frontmatter，**默认 dry-run 只出报告，确认无误后 `--write` 落盘**。正文一字不动。

## 快速上手

站点根目录（依赖已安装）：

```bash
# 第一步：dry-run 预览，不写任何文件
node node_modules/@windcoder/astro-theme-orchid/scripts/migrate-posts.mjs \
	--src ~/old-blog/source/_posts --platform hexo

# 第二步：翻看报告，确认后加 --write 落盘
node node_modules/@windcoder/astro-theme-orchid/scripts/migrate-posts.mjs \
	--src ~/old-blog/source/_posts --platform hexo --write
```

典型输出：

```
[migrate-posts] 平台 hexo，输出 /path/site/migrated-posts（dry-run 预览，不会写盘）

  _posts/hello world.md  →  _posts/hello-world.md
      ⚠ 未映射字段：abbrlink（未写入目标）
      ⚠ 正文含相对路径图片：img/pic.jpg（目录调整后需人工核对）

[migrate-posts] 完成：1 篇，1 篇有提示。确认无误后加 --write 落盘
```

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--src` | （必填） | 源文章目录，递归扫描其中的 `.md` / `.markdown` |
| `--platform` | `generic` | 源平台：`hexo` / `hugo` / `generic`（通用 Markdown） |
| `--out` | `migrated-posts` | 输出目录 |
| `--write` | — | 实际写盘；缺省为 dry-run 只出报告 |
| `--flat` | — | 拍平子目录，全部输出到输出根目录 |

## 三平台字段映射

目标字段固定为八项，斜杠表示多个候选源字段**按序取第一个有值的**：

| 目标字段 | hexo | hugo | generic |
|---|---|---|---|
| `title` | title | title | title |
| `description` | description / summary / excerpt | 同左 | 同左 |
| `published` | date / publishDate | date / publishDate | published / date / created |
| `updated` | updated / modified / lastmod | lastmod / updated | updated / modified / lastmod |
| `draft` | `published: false` | `draft: true` | `draft: true` |
| `image` | cover / image / photos[0] | image / cover / images[0] | cover / image / banner / thumbnail |
| `tags` | tags | tags | tags |
| `category` | category / categories（取首个，Hexo 嵌套分类自动拍平） | 同左 | 同左 |

平台差异只在这些字段：Hexo 的草稿语义是 `published: false`（其余平台是 `draft: true`）；Hugo 的 `slug` 字段不用来写 frontmatter，而是决定输出文件名。

## 日期归一化

`published` / `updated` 统一转成主题友好的日期字符串，重点防**时区漂移**：

- `2024-01-05` 这类纯日期**原样保留**，不经过任何时区转换——否则东八区的文章可能漂回前一天；
- Hexo 常见的斜杠格式 `2023/07/01 12:34:56` 转成 `2023-07-01T12:34:56`，不带时区后缀，Astro 按本地时间解析，墙钟不变；
- 其余能被 `new Date` 识别的格式兜底转换；完全非法的日期丢弃（缺失时走下面的修改时间兜底）。

## 兜底规则

旧文章残缺是常态，脚本按可预期的方式补齐，并在报告中提示：

- **标题三级回退**：frontmatter `title` → 正文第一个 `# 一级标题`（剥掉行内 `#`、`*`、`` ` ``、`_` 符号）→ 文件名；
- **发布时间兜底**：缺失时用文件的修改时间（mtime）。

## 报告怎么读

每篇一行 `源文件 → 输出文件`，下方 `⚠` 为提示，常见的三类：

| 提示 | 含义 | 处理 |
|---|---|---|
| `未映射字段：abbrlink、……（未写入目标）` | 白名单外的源字段（abbrlink、permalink 等）不写入产物，避免死配置 | 一般可忽略；确需保留的字段迁完后手工补 |
| `正文含相对路径图片：img/pic.jpg（……）` | 图片引用是相对路径，目录结构变了可能失效 | 把图片目录一并拷贝，核对引用路径 |
| `frontmatter 解析失败，已按无元数据处理` | YAML 损坏或不是键值结构 | 事后手工修补该篇 |

## 输出文件与目录结构

- 文件名取自源文件名（Hugo 优先 `slug` 字段），净化为 slug：空白转 `-`，剔除文件系统不安全字符，**中文名保留**；重名自动加 `-2`、`-3` 序号；
- 默认**保留源目录的子目录结构**（`tech/foo.md` → `out/tech/foo.md`）；不想要层级就加 `--flat` 拍平。

frontmatter 产物形如：

```yaml
---
title: 从零搭建
description: 一篇旧文
published: 2023-07-01T12:34:56
tags:
  - Java
category: 技术
image: cover/pic.jpg
---
```

正文紧跟空行之后，与源文件逐字一致——主题没有 `<!-- more -->` 摘要分隔符机制，列表摘要自动取正文首段，无需转换。

## 迁移后检查清单

1. 把输出目录内容拷入站点的 `src/content/posts/`；
2. 相对路径图片：图片一并拷入 `public/` 并核对引用，或换成外链图床（外链图片的防盗链处理见[内容渲染](/posts/content-rendering/)）；
3. 全局搜一遍 `draft: true`，确认草稿范围符合预期（草稿不发布）；
4. 旧站 URL 已被搜索引擎收录的，参照[URL 迁移与重定向](/posts/url-migration/)配置 301；
5. `pnpm build` 跑一遍——frontmatter 过不了 schema 校验会在构建期报出来，逐条修即可。
