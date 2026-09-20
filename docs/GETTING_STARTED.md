# 开发、运行与 GitHub 打包

应用源码：`51173f1`；文档更新于 2026-09-21。本次没有执行以下运行、编译和测试命令。

## 获取和启动

```sh
git clone https://github.com/wkun475-star/flighty-everything.git
cd flighty-everything
npm ci
npm run dev
```

仓库保持私有，需要访问权限。使用 Node.js >= 22.13.0、npm；Windows 可使用 `npm.cmd` / `npx.cmd`。地址以终端输出为准。

源码 ZIP 不含 Git 历史、依赖、私密环境配置、签名材料和用户数据。自定义源码 ZIP 的 `SOURCE-MANIFEST.json` 记录文件哈希与源码提交。

## 配置与数据

参考根目录 `.env.example` 创建 `.env.local`，Web 使用 `NEXT_PUBLIC_MAPBOX_TOKEN`，只能填写公开、受域名限制的地图 token，不能填写服务器秘密 token。

原生 `vite.native.config.ts` 将该变量置为空字符串，当前回退到 `app/mapboxConfig.ts` 的公开 token；仅修改 `.env.local` 不会替换原生地图 token。迁移时需要自己的地图服务配置。

地图和天气需联网。机场目录位于 `public/data/airports.json`；ADSBDB、adsb.lol、Transitous 等服务有各自覆盖边界，不保证全球实时状态。Web 社区需要 D1 的 `DB` 绑定；原生本地社区不等于与 Web 自动同步的完整服务。

## 目录导航

| 位置 | 职责 |
| --- | --- |
| `app/FlightyApp.tsx` | 主界面、地图和面板入口 |
| `app/JourneyComposer.tsx` | 添加行程与所属旅程 |
| `app/journeyData.ts`、`journeyStorage.ts` | 旅程/路段数据与持久化 |
| `app/realJourney.ts`、`useRealJourney.ts` | 真实时刻计划、前台定位和到达判断 |
| `app/FlightGlobe.tsx`、`Vehicle3D.tsx` | 地图、路线和载具 |
| `app/useSheetDetents.ts`、`native-layout.css` | 面板档位和移动布局 |
| `native/` | 内嵌前端入口与数据桥接 |
| `ios/App/App/SceneDelegate.swift` | UIKit 控件、手势及 Core Location |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | FLY 桌面图标 |
| `android/` | Android 工程，本次未生成 APK |
| `db/`、`drizzle/`、`worker/` | 数据库、迁移与后端 |
| `build/sites-vite-plugin.ts` | 构建所需源码，不是缓存 |
| `docs/screenshots/` | 已有运行截图、逐图说明与历史记录 |

## Mac 上构建 iOS

```sh
npm ci
npm run ios:sync
npx cap open ios
```

显示名称为 `fly everything`；Bundle ID 保留 `com.wankun824.flightyeverything`。Xcode 工程 scheme 为 `App`。现有工作流使用 Apple Silicon、iOS 27 SDK 和 `xcode-27` runner；普通账号不一定拥有该 runner。

源码 ZIP 没有 `.git`，而原生构建读取 Git 提交号。ZIP 使用者应在独立解压目录建立本地 Git 仓库并提交快照后构建；原始出处以 `SOURCE-MANIFEST.json` 为准。

## GitHub Actions 只导出 IPA

Actions → `Package iOS Client` → Run workflow，选择目标分支：

- `source_sha`：目标提交完整 SHA。
- `unsigned_only=true`：不使用签名材料。
- `skip_tests=true`：跳过模拟器构建与截图检查。

流程生成内嵌前端、同步 Capacitor、编译 iPhone archive，再导出 IPA。不要用旧 `native-shell` 替代新源码构建。

以后如需新运行截图，可另行以 `skip_tests=false` 运行；这不是本次操作，可能消耗构建额度并失败。

## 安装现有 IPA

Release 中的 `fly-everything-20260920-51173f1-unsigned.ipa` 是未签名包，需要合法 Apple 签名及适用的安装方式，不能直接点击 GitHub 下载链接安装。

来源：[Actions 35517541715](https://github.com/wkun475-star/flighty-everything/actions/runs/35517541715)。内嵌 `Payload/App.app/public/build-info.json` 记录 `51173f1`、`0.3.2`、build `5`。

## 本次发布方式

GitHub 源码推送不等于在线网站更新。此次仅归档源码、已有 IPA、截图、说明和哈希；不部署、不编译、不测试。应用提交与文档提交分开追踪，IPA 仍为 2026-09-20 的已有构建。

交付提交使用 `[skip ci]`，Release 标签不以 `v` 开头，避免触发原有自动构建。资料整理脚本只读取、归档和计算文件哈希。
