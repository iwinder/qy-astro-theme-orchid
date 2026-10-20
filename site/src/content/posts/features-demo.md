---
title: 功能演示：公式、图表与邮箱保护
description: 一篇文章集齐 LaTeX 公式、Mermaid、PlantUML、邮箱防爬、图片网格、仓库卡片与 Callout 等内容特性。
published: 2026-10-11
tags:
  - 主题功能
  - 示例
category: 主题演示
series: 功能演示
seriesOrder: 2
---

本文演示主题内置的各类内容增强特性，全部特性均通过主题注册的 unified processor 在构建期完成处理，无需站点额外配置。

## 行内与块级公式

行内公式：质能方程 $E = mc^2$，以及 $\int_0^\infty e^{-x}\,dx = 1$。

块级公式（Gaussian 积分）：

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

矩阵与对齐：

$$
A = \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{pmatrix},
\quad
\det A = a_{11}a_{22} - a_{12}a_{21}
$$

## 化学方程式（mhchem）

$$
\ce{2H2 + O2 -> 2H2O}
$$

$$
\ce{SO4^2- + Ba^2+ -> BaSO4 v}
$$

## Mermaid 流程图

```mermaid
graph LR
  A[写文章] --> B{包含图表?}
  B -->|Mermaid| C[构建期渲染 SVG]
  B -->|PlantUML| D[外部服务出图]
  C --> E[发布]
  D --> E
```

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as 站点
  U->>S: 打开文章
  S-->>U: 双主题静态图
  U->>S: 切换暗色
  S-->>U: 显隐切换，无需重渲染
```

## PlantUML 时序图

```plantuml
@startuml
actor 用户
participant "浏览器" as B
participant "PlantUML 服务" as P
用户 -> B: 打开文章
B -> P: GET /svg/<编码图形源>
P -->> B: SVG 图片
B -->> 用户: 展示图表
@enduml
```

## 邮箱防爬

联系邮箱：<a href="mailto:hi@example.com">hi@example.com</a>（构建期已编码，查看源码无明文 mailto）。

## 渲染失败的降级形态

下面这段 Mermaid 语法是故意错误的，应降级为错误提示 + 源码展示：

```mermaid
graph LR
  A[缺少闭合括号 --> B]
```

## 图片网格（[grid]）

同段形态——四图一行写完，自动四列：

[grid]![网格图一](https://picsum.photos/seed/grid1/600/400)![网格图二](https://picsum.photos/seed/grid2/600/400)![网格图三](https://picsum.photos/seed/grid3/600/400)![网格图四](https://picsum.photos/seed/grid4/600/400)[/grid]

跨段形态——两图带 title（渲染为 figcaption），自动两列：

[grid]

![跨段图一](https://picsum.photos/seed/grid5/600/400 "跨段图一的标题")

![跨段图二](https://picsum.photos/seed/grid6/600/400 "跨段图二的标题")

[/grid]

## GitHub 仓库卡片

::github{repo="iwinder/qy-astro-theme-orchid"}

::github{repo="withastro/astro"}

## Callout 扩充（26 种）

GitHub 原生六种之外的别名，例如 SUCCESS / QUESTION / QUOTE：

> [!SUCCESS]
> 成功提示，绿色配色 + 对勾图标。

> [!QUESTION]
> 问题提示，帮助图标（问号圆圈）。

> [!QUOTE]
> 引用提示，中性灰配色。

自定义标题——`[!NOTE]` 同一行剩余文字会成为标题：

> [!NOTE] 这是一个自定义标题
> 标题由标记同行的剩余文字提取，正文从这里开始。

容器指令形态（remark-directive）——`:::note` 转为 callout 渲染：

:::note
这是一个 note 容器指令，与 `> [!NOTE]` 等价。
:::

带 label 的容器——`:::tip[容器自定义标题]`：

:::tip[容器自定义标题]
label 会被提取为 callout 标题。
:::
