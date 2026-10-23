---
title: 加密文章功能演示
image: api
description: 这是一篇受密码保护的文章，用于演示主题的构建期加密与客户端解密能力。
published: 2026-10-11
tags:
  - 主题功能
  - 示例
category: 主题演示
password: 'demo1234'
passwordHint: '示例密码 demo1234'
series: 功能演示
seriesOrder: 3
---

恭喜，你已成功解锁本文！

## 这是怎么工作的

本主题在**构建期**使用 AES-256-GCM（PBKDF2 派生密钥）将文章正文整体加密，页面源码中不含任何明文内容。

浏览器端通过 Web Crypto API 输入密码解密渲染，密码会缓存在 `sessionStorage`，同一会话内刷新或跨构建（内容未变化时）均可自动解锁。

## 支持的 Markdown 特性

加密文章解密后与普通文章完全一致，支持全部内容特性：

- **行内代码**与代码块高亮
- 图片（含灯箱预览）
- 表格、引用、任务列表

```ts
// 解密后的代码块同样支持复制与高亮
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

> 提示：密码提示只作展示用途，不参与解密运算。若遗忘了真实文章的密码，内容将无法找回——密钥不在任何服务端保存。
