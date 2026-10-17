import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 站点统计（P1-16，§4.58 全量展示）：四家按需填 ID，留空即不注入对应脚本（零副作用）。
// 冷门细节字段均有主题默认值，见 schema.ts analytics 段，按需覆盖：
// - umami.replays（Live 录制）：enabled/sampleRate/maskLevel/maxDuration/blockSelector
// - umami.trackOutboundLinks（外链自动上报）/ collectWebVitals（Web Vitals 采集）
// - la51.sdkUrl（私有部署 SDK）/ ck / autoTrack / hashMode / screenRecord
export const analyticsConfig: ThemeConfig["analytics"] = {
	// Google Analytics 衡量 ID（G-XXXX）
	googleAnalyticsId: "",
	// Microsoft Clarity 项目 ID
	microsoftClarityId: "",
	umami: {
		websiteId: "",
		// scriptUrl: 自建 umami 时替换（默认 https://cloud.umami.is/script.js）
	},
	la51: {
		// 51.la 站点 ID（CK 编码）
		id: "",
	},
};
