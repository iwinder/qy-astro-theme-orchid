import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 分享：OG 分享图 + 分享海报（同一「分享」功能的两个形态）
// og —— 构建期为每篇文章生成 1200x630 分享图（/og/<slug>.png）；
// Google Fonts 拉取失败时降级纯形状占位图，构建不中断
export const og: ThemeConfig["og"] = { enabled: true };

// sharePoster —— 文章页「生成分享海报」按钮，纯浏览器 canvas + qrcode（点开才加载），构建零开销
export const sharePoster: ThemeConfig["sharePoster"] = { enabled: true };
