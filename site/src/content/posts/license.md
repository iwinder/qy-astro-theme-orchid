---
title: 版权声明（license）
description: 文章版权声明配置——许可证名称与链接、自定义前后缀文案、按篇覆盖（license / licenseName / licenseUrl）与文末渲染效果。
published: 2026-10-18
tags:
  - 主题机制
  - 配置
category: 技术
series: 主题使用指南
seriesGroup: 基础配置
seriesOrder: 8
---

版权声明（license）不是侧栏 widget，而是渲染在**每篇文章末尾**的组件；侧栏 widgets 的挂载与布局见[侧边栏与小组件](/posts/sidebar/)。本文讲它的内容配置与按篇覆盖。

**配置文件**：`site/src/config/licenseConfig.ts`

## 版权声明

配置总开关、许可证名称与全文链接，以及声明的前后缀自定义文案；前后缀留空时用语言包默认文案。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | `false` 全站关闭版权声明 |
| `name` | `string` | `"CC BY-NC-SA 4.0"` | 许可证名称 |
| `url` | `string` | CC 官方链接 | 许可证全文链接 |
| `prefix` | `string` | `""` | 自定义前缀文案，留空用语言包默认 |
| `suffix` | `string` | `""` | 自定义后缀文案 |

```ts
// site/src/config/licenseConfig.ts
export const licenseConfig: ThemeConfig["license"] = {
	enabled: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
	prefix: "", // 自定义声明前缀文案
	suffix: "", // 自定义声明后缀文案
};
```

### 按篇覆盖

文章 frontmatter 可覆盖全局设置（见[写作指南](/posts/writing/)）：

- `license: false` — 该篇不显示版权声明
- `licenseName` / `licenseUrl` — 该篇使用不同许可证

## 使用效果

每篇文章末尾渲染一行声明：「本文采用 CC BY-NC-SA 4.0 许可，转载请注明出处与作者。」，许可证名带超链接指向 `url`。
