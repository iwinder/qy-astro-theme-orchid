import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 站点统计（§4.58 全量展示，§4.60 冷门字段展开为真实样板）：四家按需填 ID，
// 留空即不注入对应脚本（零副作用）。下方所有字段均为完整默认值，
// 与参考项目细粒度一一对应，不需要的键可整段删除（主题 schema 自动兜底）。
export const analyticsConfig: ThemeConfig["analytics"] = {
	// Google Analytics 衡量 ID（G-XXXX）
	googleAnalyticsId: "",
	// Microsoft Clarity 项目 ID
	microsoftClarityId: "",
	umami: {
		// Umami Website ID
		websiteId: "",
		// Umami JS 地址，自建时替换（默认官方云）
		scriptUrl: "https://cloud.umami.is/script.js",
		// Umami 会话回放脚本地址，自建时替换
		replaysScriptUrl: "https://cloud.umami.is/script.replays.js",
		// 是否追踪出站链接（自动标记 data-umami-event 上报）
		trackOutboundLinks: true,
		// 是否收集浏览器性能指标 Web Vitals（自建 umami 需 v2.9+）
		collectWebVitals: false,
		// 会话回放（Live）配置
		replays: {
			// 是否启用会话回放
			enabled: false,
			// 录制会话采样率 0-1，例如 0.15 表示记录 15% 的会话
			sampleRate: 0.15,
			// 隐私遮罩级别："moderate" 遮罩所有输入框；"strict" 额外遮罩页面全部文本
			maskLevel: "moderate",
			// 单次录制最大时长（毫秒）
			maxDuration: 300000,
			// 需要排除录制的元素 CSS 选择器，例如 ".sensitive-widget"
			blockSelector: "",
		},
	},
	la51: {
		// 51.la 站点 ID（CK 编码）
		id: "",
		// 自定义 SDK JS 地址，防止 DNS 污染，留空使用默认地址
		sdkUrl: "",
		// 多个统计 ID 的数据分离标识，留空则使用 id
		ck: "",
		// 是否开启事件分析功能
		autoTrack: true,
		// Hash 路由模式（本项目 History API 路由，保持 false）
		hashMode: false,
		// 是否开启网站录屏功能
		screenRecord: true,
	},
};
