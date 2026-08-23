# 三端设计系统

## Web

- 目标：旅行社交内容优先，信息流大图、较高容量，操作不覆盖正文。
- 结构：固定左侧导航、大图瀑布流、右侧推荐与热门；移动端使用底栏并保留内容安全区。
- 材质：实体白色卡片和低阴影，不使用系统级毛玻璃。

## iOS

- Apple HIG Materials：Liquid Glass 只用于浮在内容上方的导航、工具栏和控制层。
- Apple HIG Tab Bars：底栏用于切换主要目的地，不放发布等动作；当前保持 4 个目的地。
- 图标：SF Symbols；字体：系统 SF / PingFang SC；安全区使用 `env(safe-area-inset-bottom)`。
- 参考：<https://developer.apple.com/design/human-interface-guidelines/materials>
- 参考：<https://developer.apple.com/design/human-interface-guidelines/tab-bars>
- 参考：<https://developer.apple.com/design/human-interface-guidelines/layout>

## Android

- Material 3 tonal surface、圆角容器、清晰的 active indicator。
- 所有主要间距遵循 8dp 网格，小图标内部可用 4dp。
- Compact 屏幕用 4 项 bottom navigation，桌面/大屏切换为 navigation rail。
- 图标来源：Material Design Icons，Apache-2.0。
- 参考：<https://developer.android.com/develop/ui/compose/designsystems/material3>
- 参考：<https://developer.android.com/design/ui/mobile/guides/layout-and-content/grids-and-units>
- 参考：<https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns>
- 参考：<https://developer.android.com/develop/adaptive-apps/guides/adaptive-dos-and-donts>
