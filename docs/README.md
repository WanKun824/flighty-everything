# 当前源码文档

最新版位于公开仓库的 `main`。旧发布说明、截图/GIF 图册和生成包已删除，不再链接历史下载资产。

## 使用与维护

- [开发、配置、验证与按需构建](开发与打包说明.md)
- [源码保留范围与已知限制](交付清单与已知限制.md)
- [UI/UX 方案与待办](UI-UX-改进计划.md)
- [原生 QA 源代码说明](../ios/qa/README.md)
- [素材许可](../MODEL_LICENSES.md)

## 代码导航

| 路径 | 作用 |
| --- | --- |
| `app/FlightyApp.tsx`、`MobileJourney.tsx` | 主应用导航、行程和详情 |
| `app/JourneyComposer.tsx` | 添加、地点选择及草稿 |
| `app/journeyStorage.ts`、`journeyUndo.ts` | 本机持久化、删除和撤销 |
| `app/demoJourneys.ts` | 新存储首次启动的虚构演示数据 |
| `app/JourneyPassportTarget.tsx` | 旅迹及统计 |
| `app/CommunityPanel.tsx` | 主应用社区 |
| `app/FlightGlobe.tsx`、`Vehicle3D.tsx` | 地图、路线和模型 |
| `app/ios-tokens.css`、`ios-ui.css`、`SheetHeader.tsx` | 设计令牌与共享组件 |
| `native/`、`ios/`、`android/` | 平台工程与桥接源码，不含生成包 |
| `db/`、`drizzle/`、`app/api/` | 数据库迁移、Web 社区和交通查询 |
| `tests/` | 数据、布局、交互和数据保护回归 |
| `.github/workflows/` | 普通代码检查与仅手动触发的打包流程 |

## 实现说明

1. [系统总览](01-系统总览.md)
2. [探索界面](02-探索界面.md)
3. [行程几何与时钟](03-行程几何与时钟.md)
4. [3D 载具与着色](04-3D载具与着色.md)
5. [面板与手势](05-面板与手势.md)
6. [地点搜索](06-地点搜索.md)
7. [样式与三端](07-样式与三端.md)
8. [测试与量测](08-测试与量测方法学.md)
9. [原生构建说明](09-构建发布与原生.md)

部分实现说明保留设计过程，组件名与行号以当前源码为准，不应当作当前功能或视觉验收结果。
