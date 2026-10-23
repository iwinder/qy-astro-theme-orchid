---
title: 组件覆盖（override）是怎么工作的
image: api
description: 演示站点如何用 src/overrides 同名文件替换主题组件，同时保留包装默认实现的能力。
published: 2026-10-09
tags:
  - Astro
  - 主题机制
category: 技术
series: 主题使用指南
seriesGroup: 进阶
seriesOrder: 26
---

主题内所有可覆盖组件都通过 `virtual:theme/...` 引用。
解析时优先找 `site/src/overrides/` 下的同名文件，找不到才回退到包内默认实现。

## 包装默认实现

本站的 [PostCard 覆盖](/posts/) 就是一个例子：它 import 了同一个虚拟路径，
主题解析器检测到调用来自 overrides 目录，会强制返回包内默认实现——
所以覆盖文件可以「先复用再加工」，不会产生自引用死循环。

```astro
---
import DefaultCard from 'virtual:theme/components/PostCard.astro';
---
<div>
  <DefaultCard {post} />
  <!-- 站点自己的附加元素 -->
</div>
```

升级主题后，默认实现随版本更新，这层薄薄的包装继续生效。
