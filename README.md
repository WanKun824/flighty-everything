# fly everything

多交通方式旅行规划与地图应用：飞机、火车、汽车、轮船，以及行程、旅记、机场收藏、模拟预览和前台真实定位。

<img src="public/brand/fly-icon.png" width="144" alt="黑底白色 FLY 品牌图标；不是运行截图" />

**运行资料更新：2026-09-23。** 收录 GitHub Mac/Xcode 从 `1d988b8` 编译后生成的 32 张浅色模拟器截图，每页附说明。深色采集未完成，按要求使用已有图片，不再补拍。已有 IPA 仍对应 `51173f1`，不与截图版本混淆。

## 下载与文档

- [下载源码 ZIP 与现有 IPA](https://github.com/wkun475-star/flighty-everything/releases/tag/delivery-2026-09-21)
- [本次 iOS 逐页运行截图、每张图说明与可见问题](docs/runtime-20260923/README.md)
- [历史截图档案（旧版本）](docs/screenshots/README.md)
- [开发、运行和 GitHub 打包说明](docs/GETTING_STARTED.md)
- [交付清单与已知限制](docs/delivery/README.md)
- [图标设计与提示词](docs/fly-brand.md)

最新版安装包：`fly-everything-20260920-51173f1-unsigned.ipa`，名称 `fly everything`，版本 `0.3.2` / build `5`。**未签名，需要自行签名后安装**；不是可直接安装的 App Store / TestFlight 包。

## 实际运行截图

以下画面来自 [GitHub Mac/Xcode 运行](https://github.com/wkun475-star/flighty-everything/actions/runs/35631024628)，不是设计图、浏览器截图或实体手机拍摄。编译成功并生成 32 张浅色图，工作流因随后深色会话连接失败而未整体通过。

| 行程面板（浅色） | 添加行程（浅色） |
| --- | --- |
| <img src="docs/runtime-20260923/images/01-flights-compact-light.png" width="280" alt="浅色行程最小面板的模拟器原图" /> | <img src="docs/runtime-20260923/images/07-compose-light.png" width="280" alt="添加行程的模拟器原图" /> |
| [页面说明及原图证据](docs/runtime-20260923/01-flights-compact.md) | [页面说明及原图证据](docs/runtime-20260923/07-compose.md) |

完整目录包括行程、详情、添加流程、航班搜索、机场、天气图层、同行、个人资料、旅记与社区页面。每张图附页面用途、源码提交、原图校验信息与覆盖限制，见 [逐页图册](docs/runtime-20260923/README.md)。截图中的控件重叠、配色及中英文混用问题保留并记录在 [视觉问题清单](docs/runtime-20260923/VISUAL_NOTES.md)；截图生成不等于 UI 验收通过。

此次没有执行真实定位、发出邀请、发布社区或确认删除。未采集系统弹窗、旧版不可达组件及所有滚动位置；也不代替真机和触摸手势测试。[旧截图](docs/screenshots/README.md) 保留在独立档案中。

## 本地运行

```sh
npm ci
npm run dev
```

需要 Node.js >= 22.13.0（建议 Node 22）及网络。Windows 可用 `npm.cmd`。地址以终端输出为准；配置见 [运行文档](docs/GETTING_STARTED.md)。

这是 React / TypeScript + Capacitor 混合应用。iOS 内嵌前端资源，并提供 UIKit 玻璃控件、手势和前台 Core Location 桥接；不是全 SwiftUI 应用，也不是只打开在线网址的快捷方式。

## GitHub 上如何使用

仓库用于查看源码、文档和截图，Release 用于下载；**GitHub 页面本身不能运行 iPhone IPA**。现有 Actions 工作流可在适用的 Apple Silicon / Xcode runner 上编译 iOS。

[最新 IPA 成功打包记录](https://github.com/wkun475-star/flighty-everything/actions/runs/35517541715) 对应 `51173f1`，当时 `skip_tests=true`。构建成功不代表真机验收通过。

已有 [在线演示](https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site/) 本次未部署，不能保证与 Release 版本相同。仓库沿用现有私有权限。

## 功能边界

- 地图、天气、航班和列车查询依赖外部服务与地区覆盖；机场目录不等于实时运营状态。
- 真实模式使用用户输入的出发/到达时间、时区和前台授权定位，不保证后台持续定位。
- 行程主要保存在本机，不是跨设备云备份；清除数据可能丢失记录。
- 模型和第三方素材的再分发许可需另行核对，见 `MODEL_LICENSES.md`。
- 旧 `HANDOFF*.md`、旧日期报告只作历史参考。已有下载包以 `docs/delivery/README.md` 为准；新模拟器运行证据以 `docs/runtime-20260923/README.md` 为准。
