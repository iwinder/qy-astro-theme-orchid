import type { ThemeConfig } from "@windcoder/astro-theme-orchid";

/**
 * 显示设置面板（§4.103，对齐 Firefly）：导航栏齿轮入口的三 Tab 浮层
 * （外观/壁纸/特效），集中管理主题色、壁纸模式、全屏布局、壁纸设置、
 * 透明设置与樱花特效的访客级开关。
 *
 * enable：总开关。false（默认）不渲染齿轮与面板，维持现有独立调色板/壁纸切换按钮。
 * 各 switchable 控制面板内对应项是否对访客可见；无可见项的 Tab 自动隐藏。
 * overlaySwitchable 为 true 时三项滑块全部可见（等效对象 {opacity:true,blur:true,cardOpacity:true}）。
 */
export const displaySettings: ThemeConfig["displaySettings"] = {
	enable: true,
	themeColorSwitchable: true,
	wallpaperModeSwitchable: true,
	fullscreenLayoutSwitchable: true,
	bannerTitleSwitchable: true,
	bannerCarouselSwitchable: true,
	wavesSwitchable: true,
	gradientSwitchable: true,
	overlaySwitchable: true,
	sakuraSwitchable: true,
};
