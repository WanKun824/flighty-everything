# fly everything — 源码、文档与已有 IPA 归档

交付日期：2026-09-21。本次使用已有源文件和安装包，不重新构建、不运行应用测试、不更新在线网站。

## 推荐下载

- `fly-everything-20260920-51173f1-unsigned.ipa`：最新黑底 FLY 图标，显示名 fly everything，0.3.2 / build 5，**未签名，需要自行签名安装**。
- `fly-everything-source-*.zip`：本次源码与完整文档，含文件清单和哈希；不包含依赖与私密配置。
- `fly-everything-docs-and-existing-screenshots.zip`：开发文档、4 张已有截图、逐图说明与布局记录。
- `SHA256SUMS.txt`：上述下载文件及历史 IPA 的完整性校验值。

其余 7 个可读取 IPA 是历史版本，不要当作最新版。`historical-invalid-ipa-DO-NOT-INSTALL.zip` 包含一个原始损坏文件，仅用于完整归档，不能安装。

## 真实运行证据

截图来自历史 iOS 模拟器运行，不是效果图、不是真机、不是最新 51173f1。每张均附来源、界面说明和异常说明；其中有地图空白与误截系统桌面的失败记录，未隐藏或作为成功证据使用。

最新版曾以 `skip_tests=true` 成功打包，见 [构建记录](https://github.com/wkun475-star/flighty-everything/actions/runs/35517541715)。本次不产生新运行截图。

## 查看文档

- [项目主页](https://github.com/wkun475-star/flighty-everything)
- [逐图说明](https://github.com/wkun475-star/flighty-everything/tree/delivery-2026-09-21/docs/screenshots)
- [开发与运行](https://github.com/wkun475-star/flighty-everything/blob/delivery-2026-09-21/docs/GETTING_STARTED.md)
- [交付边界与 IPA 清单](https://github.com/wkun475-star/flighty-everything/tree/delivery-2026-09-21/docs/delivery)

GitHub 不会在页面内运行 IPA。仓库沿用私有权限；下载和访问需要相应授权。文档提交与应用提交分别追踪，新增文档不表示 IPA 重新构建。
