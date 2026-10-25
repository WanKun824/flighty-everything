# fly everything

飞机、火车、汽车与轮船的多交通旅行规划应用。React 19 / TypeScript / Vite（vinext）+ Capacitor 8，保留 iOS、Android 和 Web 的最新源码。

## 仓库状态

- 公开仓库：**[WanKun824/flighty-everything](https://github.com/WanKun824/flighty-everything)**。
- 最新业务代码已统一到 **`main`**，不需要再切换旧演示/打包分支。
- 仓库不保留旧发布、版本标签、截图、GIF、录屏或生成的安装包/压缩包。
- 当前**没有可下载的 IPA、APK、AAB、Web 包或源码交付 ZIP**。iOS/Android 目录是工程源码，不是安装包。
- 打包工作流仅允许手动触发，普通 push/tag 不再自动生成包。浏览器回归测试默认不保存截图或 trace。
- 应用必需的品牌图标、3D 模型、纹理和 Gradle wrapper 属于源码依赖，继续保留。
- 没有强制重写 Git 历史；旧提交不作为当前版本或下载资产维护。

## 功能

- 多交通方式旅程、地点/机场搜索、地图及 3D 载具模拟预览。
- 四项主导航：行程、同行、旅迹、社区。
- 行程添加、草稿保存、删除确认与撤销、本机持久化。
- 旅迹年份筛选、里程、时长、频率和载具统计。
- 新环境包含三组、八段明确标为虚构的演示记录，覆盖四种交通方式；已有用户数据不自动插入样例或被覆盖。
- UIKit 控件、安全区、返回手势、触觉及前台定位桥接。不是全量 SwiftUI 应用。

## 本地运行

需要 Node.js **22.13+**、npm、Git。Windows 可使用 `npm.cmd`。

```sh
git clone https://github.com/WanKun824/flighty-everything.git
cd flighty-everything
npm ci
npm run dev
```

## 检查

```sh
npm test
npx tsc --noEmit -p tsconfig.json
npx playwright test
npm run lint
```

浏览器测试使用本机 Chrome、隔离存储及部分离线策略，不等于真机验收。Lint 尚有既有错误和警告；没有关闭规则或宣称全部 UI/质量门槛通过。

## 文档

- [开发、配置与按需构建](docs/开发与打包说明.md)
- [当前保留内容与已知限制](docs/交付清单与已知限制.md)
- [代码与文档导航](docs/README.md)
- [UI/UX 方案及未完成项](docs/UI-UX-改进计划.md)
- [素材许可](MODEL_LICENSES.md)

本次清理仅针对本公开仓库及本地项目生成产物；私有镜像未修改。GitHub 自动提供的源码下载功能不等同于本项目发布了构建包。
