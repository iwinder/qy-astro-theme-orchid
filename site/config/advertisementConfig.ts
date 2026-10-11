import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

// 侧栏广告位（P2 保留项，默认关闭）。完整形态示例：
// advertisementConfig = {
//   enabled: true,
//   title: "广告",
//   image: "/assets/images/ad/banner.png",   // 或外链
//   imageLink: "https://example.com",
//   imageAlt: "广告",
//   content: "一句话广告文案",
//   link: { text: "查看详情", url: "https://example.com", external: true },
//   closable: true,
//   displayCount: -1,        // >0 时限制总展示次数
//   expireDate: "2027-12-31" // 过期自动下线
// };
export const advertisementConfig: ThemeConfig["advertisement"] = {
	enabled: false,
};
