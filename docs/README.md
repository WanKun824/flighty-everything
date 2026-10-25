# 漫游 · 分系统交接文档

更新时间：2026-08-14。行号以这一天的代码为准，改动后请以符号名（函数名 / 常量名）定位。

顶层交接文档仍是根目录的 [HANDOFF-20260814.md](../HANDOFF-20260814.md)（做什么、怎么发布、怎么打包）。
这一组文档回答的是另一个问题：**每个系统是怎么实现的、为什么是这样、改它会碰坏什么**。

## 阅读顺序

新接手的人按 1 → 2 读，就能改动这个项目九成的内容。其余按需。

| # | 文档 | 覆盖的代码 | 什么时候读 |
| --- | --- | --- | --- |
| 1 | [系统总览](./01-系统总览.md) | 技术栈、进程模型、`worker/`、`vite.config.ts`、目录职责 | 第一次进项目 |
| 2 | [**探索界面**](./02-探索界面.md) | `app/page.tsx`（地图那一屏的全部） | 改地图、标记、载具、播放器、快捷键 |
| 3 | [行程几何与时钟](./03-行程几何与时钟.md) | `app/routeGeometry.ts`、`routeRules.ts`、`timeSync.ts` | 改路线形状、里程、速度、时间轴 |
| 4 | [3D 载具与着色](./04-3D载具与着色.md) | `app/Vehicle3D.tsx`、`vehicleShading.ts`、`public/models/` | 换模型、改颜色、改运动手感 |
| 5 | [面板与手势](./05-面板与手势.md) | `app/JourneyPanel.tsx`、`panelGeometry.ts` | 改面板拖拽、缩放、窄屏停位 |
| 6 | [地点搜索](./06-地点搜索.md) | `app/placeSearch.ts` | 搜索结果不对、要加语言或地区 |
| 7 | [样式与三端设计系统](./07-样式与三端.md) | `app/globals.css`、`platform.ts`、`DESIGN_SYSTEM.md` | 改视觉、加断点、动平台分支 |
| 8 | [测试与量测方法学](./08-测试与量测方法学.md) | `tests/*.test.mjs`、Playwright 实拍量测 | 加测试、验证「手感」类改动 |
| 9 | [构建发布与原生打包](./09-构建发布与原生.md) | `.github/workflows/`、`codemagic.yaml`、`capacitor.config.ts` | 发版、出 APK/IPA |

## 三条一开始就要知道的事

1. **这不是 Next.js。** 是 [vinext](https://www.npmjs.com/package/vinext) 1.0.0-beta.2 —— 在 Vite 8 + RSC
   上实现 Next.js App Router 语义，跑在 Cloudflare Workers 运行时上。`next.config.ts` 是空的、
   `.next/` 是残留目录，都不参与构建。详见[系统总览](./01-系统总览.md)。
2. **没有后端数据层。** `db/schema.ts` 的内容是 `export {}`，D1 + drizzle 是模板脚手架，
   一行也没被用。全部状态活在浏览器里，刷新即丢。
3. **`app/page.tsx` 里那个 Mapbox token 是公开的浏览器端 token**（`MAPBOX_TOKEN`，约 69–70 行），
   不是服务器私钥，但上线前必须换成自己的并在 Mapbox 后台配 URL 白名单。

## 名词对照

| 文档里的说法 | 代码里的东西 |
| --- | --- |
| 探索屏 / 地图那一屏 | `ExploreScreen`（`app/page.tsx`） |
| 唯一面板 | `JourneyPanel` + `.journey-panel` |
| 站点 | `TripStop`，一条行程 6 个初始站 |
| 段 / leg | 相邻两站之间，`LegPath` + `timeline.legs[i]` |
| 载具 | 地图上跟着播放头跑的那个 3D 模型（`.map-rider` marker） |
| 播放头 | `progressRef.current`，全程 0..1 |
| 缩放折算 | `zoomRate(zoom)`，地图越大比例尺、世界速度越慢 |
</content>
</invoke>
