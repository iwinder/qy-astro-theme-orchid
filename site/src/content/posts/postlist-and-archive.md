---
title: 文章列表与归档：postList / categoryBar / archive 配置
description: 文章列表按列表形态、封面策略、布局切换三组配置（含 cardStyle 按篇混排、随机封面），分类横条与归档按年折叠。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 9
---

首页与归档是博客的"货架"。`postListConfig.ts` 管文章列表，
`siteConfig.ts` 管顶部分类横条，`archiveConfig.ts` 管归档折叠——本文讲全这三块。

**配置文件**：

- `site/src/config/postListConfig.ts` → `postList`（文章列表）
- `site/src/config/archiveConfig.ts` → `archive`（归档页）
- `site/src/config/siteConfig.ts` → `categoryBar`（分类横条）

## 列表形态

文章列表的默认形态与分页：`style` 选图卡或紧凑行，`showCover` 控制封面渲染，`pageSize` 定每页文章数。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `style` | `"cover" \| "compact"` | `"cover"` | `cover` 图卡形态 / `compact` 紧凑行形态 |
| `showCover` | `boolean` | `true` | `false` 时列表卡不渲染封面，整体降级纯文字形态 |
| `pageSize` | `number` | `10` | 每页文章数（分页） |

```ts
// site/src/config/postListConfig.ts（节选）
export const postList: ThemeConfig["postList"] = {
	style: "cover",
	pageSize: 10,
};
```

### cardStyle 按篇混排

frontmatter 的 `cardStyle` 可以**按篇覆盖**全局 `style`，三种取值：

```yaml
---
title: 有封面的文章
cardStyle: cover    # 图卡
---
```

- `cover` — 大图卡（有图时）
- `compact` — 紧凑行
- `text` — 纯文字卡

同一列表里图卡、紧凑行、纯文字卡自然混排，无图的老文章标 `text` 也不难看。

## 封面策略

无图文章的封面来源策略：`fallbackCover` 兜底封面，`randomCover.apis` 随机封面 API 模板（配合 frontmatter `image: "api"`）。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `fallbackCover` | `string` | `""` | 无图文章的兜底封面（public 路径或外链）；不配置则该卡降级纯文字卡 |
| `randomCover.apis` | `string[]` | `[]` | 随机封面 API 模板，配合 frontmatter `image: "api"`（见下） |

```ts
// site/src/config/postListConfig.ts（节选）
randomCover: { apis: ["https://picsum.photos/seed/{slug}/540/304"] },
```

### 随机封面（randomCover）

frontmatter 写 `image: "api"` 的文章，构建期按 slug **确定性取图**——
`{slug}` 占位符替换为文章 slug，末尾自动追加 `?v=<hash>`。
确定性意味着同一篇文章每次构建拿到同一张图，不会闪变：

```yaml
---
title: 我没有配图
image: "api"
---
```

## 布局切换

列表/网格双形态切换：`allowSwitch` 控制导航栏切换按钮，`defaultLayout` 定初始形态，`gridColumnWidth` 控网格最小列宽。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultLayout` | `"list" \| "grid"` | `"list"` | 列表初始形态（需 `allowSwitch`） |
| `allowSwitch` | `boolean` | `true` | 导航栏出现列表/网格切换按钮 |
| `gridColumnWidth` | `number` | `320` | 网格模式最小列宽（px），实际列数由容器宽自适应 |

## 分类横条（categoryBar）

首页文章列表与文章页正文**顶部**出现一条横向分类导航（与正文同列宽、不全宽），
点击跳到对应分类的筛选列表；写作分类多的站点能显著降低导航成本。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | `false` 时不渲染横条 |

```ts
// site/src/config/siteConfig.ts（节选）
categoryBar: { enabled: true },
```

## 归档页（archive）

`/archive/` 按年份分组展示全部文章；`fold: true` 时只有最新年份展开，
点击年份标题展开/收起该组——文章量大的老博客不必一路滚到底。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `fold` | `boolean` | `true` | 按年折叠：最新一年默认展开，其余年份折叠 |

```ts
// site/src/config/archiveConfig.ts
export const archive: ThemeConfig["archive"] = { fold: true };
```

## 分类/标签分页

分类页（`/categories/<分类>/`）与标签页（`/tags/<标签>/`）与首页共用 `postList.pageSize`：
超出单页自动分页，第二页起为 `/categories/<分类>/2/` 形式，
第一页不带 `/1/`——旧链接（原本不分页的单页 URL）天然兼容。
底部复用与首页相同的分页条，无需任何额外配置。

## 使用效果

- 默认 `cover` 图卡：左图右文（或上下结构），无图文章自动降级纯文字卡
- 导航栏出现列表/网格切换按钮（`allowSwitch`），网格形态按 `gridColumnWidth` 自适应列数，偏好存 localStorage
- 分页条在列表底部；`pageSize: 10` 一页十篇

## 相关配置

- 列表里各卡的封面来源优先级：frontmatter `image` → `randomCover`（`image: "api"` 时）→ `fallbackCover` → 纯文字卡
- 文章 frontmatter `pinned: true` 的文章置顶在列表最前（见[写作指南](/posts/writing/)）
- 分类/标签页数据来自文章 frontmatter 的 `category` / `tags`
