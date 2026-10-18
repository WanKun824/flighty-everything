# fly everything 文档索引

更新：2026-10-18。当前入口为 `app/FlightyApp.tsx`；请按函数/组件名查代码，旧文档行号可能已经失效。

## 本轮交付

- [开发、配置、构建与 GitHub 打包](开发与打包说明.md)
- [交付内容、验证边界与已知限制](交付清单与已知限制.md)
- [iOS UI/UX 改进方案及执行进度](UI-UX-改进计划.md)
- [本轮网页验收与浅/深/小屏拼版](runtime-ui-ux-web/VISUAL_NOTES.md)
- [模拟器逐页截图工具与来源规则](../ios/qa/README.md)
- 当前 iOS 图册、下载与构建结果以 [根 README](../README.md) 的本轮链接为准。

## 当前代码导航

| 位置 | 内容 |
| --- | --- |
| `app/FlightyApp.tsx`、`MobileJourney.tsx` | 主应用四项导航、行程列表和路段详情 |
| `app/JourneyComposer.tsx` | 添加流程、真实/模拟计划、地点选择 |
| `app/CommunityPanel.tsx` | 主应用社区列表、详情与模态发布 |
| `app/journeyStorage.ts`、`journeyUndo.ts` | 本机持久化、删除与撤销保护 |
| `app/ios-tokens.css`、`ios-ui.css`、`SheetHeader.tsx` | 设计令牌及共享组件；旧样式尚未完全收敛 |
| `app/useSheetDetents.ts`、`useMapControlLayout.ts` | 统一档位、手势、地图控件避让 |
| `app/FlightGlobe.tsx`、`Vehicle3D.tsx` | 地图、路线和 3D 模型 |
| `app/nativeInteractions.ts`、`useNativeChrome.ts` | 系统插件与 UIKit Chrome 桥接 |
| `native/`、`ios/`、`android/` | 原生前端、平台工程、原生 QA |
| `db/`、`drizzle/`、`app/api/` | 网页社区 D1 与交通查询，不是空模板 |
| `.github/workflows/`、`scripts/package-source.py` | 生产构建、IPA、截图和校验源码包 |

项目使用 vinext/Vite 实现路由与 Workers 运行时，不是完整 Next.js 服务。个人数据主要是本机存储，并不是“刷新即丢”，也不是已实现跨设备云备份。

## 架构与历史资料

以下文档可帮助理解实现思路，但日期、组件名和代码行号可能落后于本轮版本。它们不能替代当前运行截图和验证记录：

1. [系统总览](01-系统总览.md)
2. [探索界面（历史）](02-探索界面.md)
3. [行程几何与时钟](03-行程几何与时钟.md)
4. [3D 载具与着色](04-3D载具与着色.md)
5. [面板与手势（历史）](05-面板与手势.md)
6. [地点搜索](06-地点搜索.md)
7. [样式与三端](07-样式与三端.md)
8. [测试与量测方法学](08-测试与量测方法学.md)
9. [构建发布与原生（历史）](09-构建发布与原生.md)

- [2026-09-23 历史模拟器截图](runtime-20260923/README.md)
- [更早截图档案](screenshots/README.md)
- [2026-09-21 历史 Release 清单](delivery/README.md)
- [品牌说明](fly-brand.md)
- [素材授权待核对项](../MODEL_LICENSES.md)
