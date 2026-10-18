import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 文章页目录（独立悬浮 TOC；sidebar.onPost 开启后由侧栏 toc widget 承担）
export const toc: ThemeConfig["toc"] = { enabled: true };
