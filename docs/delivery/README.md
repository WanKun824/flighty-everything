# 交付清单与已知限制

日期：2026-09-21。沿用 `wkun475-star/flighty-everything` 私有仓库，不改变权限。

后续补充：2026-09-23 的 Mac/Xcode 模拟器编译与新截图见 [逐页运行图册](../runtime-20260923/README.md)。本页仍记录原有 Release 的文件与 IPA，不代表新截图的构建版本。

## 文件内容

1. 项目源码、开发说明、逐图文档、品牌资源及现有构建配置。
2. 最新源码 ZIP，包含文档和 `SOURCE-MANIFEST.json`，不含依赖、Git 历史、私密环境文件或签名材料。
3. 8 个现有可读取 IPA 原样上传，最新版为 `fly-everything-20260920-51173f1-unsigned.ipa`。
4. 历史损坏文件单独保存为 `historical-invalid-ipa-DO-NOT-INSTALL.zip`，仅供归档，不能安装。
5. 4 张已有截图、每张独立说明、3 份原始布局记录，另提供文档与截图 ZIP。
6. `SHA256SUMS.txt`，用于核对下载完整性，不是签名或运行测试报告。

## 最新 IPA

| 字段 | 内容 |
| --- | --- |
| 名称 | fly everything |
| 应用提交 | `51173f1d5efa2037354d2dd056cdc3d343f50c10` |
| 版本 / build | 0.3.2 / 5 |
| Bundle ID | com.wankun824.flightyeverything |
| 构建时间（UTC） | 2026-09-20T14:48:05.789Z |
| 大小 | 8,713,333 字节 |
| SHA-256 | `ca13b4447daf4f5bb39ffefed91d7d3cfa81add9af445881cdae79a0a9db9c48` |
| 签名 | 未签名，需要自行签名 |
| 出处 | [Actions 35517541715](https://github.com/wkun475-star/flighty-everything/actions/runs/35517541715) |

应用未重新编译或签名。交付文档提交不是新的应用 build，IPA 没有改名冒充新构建。

## 历史版本

[existing-ipas.json](existing-ipas.json) 列出全部现有文件的名称、大小、哈希和可读取的内嵌版本。带内嵌源码信息的包包括 `4c41267`、`f739989`、`76c63fd` 和 `51173f1`。早期包缺少提交元数据，不能仅靠文件名断言源码版本。

`release/v0.3.0/flighty-everything-v0.3.0-ios-arm64-unsigned.ipa` 不是可读取的 ZIP/IPA，仅单独归档为损坏历史数据，未删除原文件。曾生成但当前本地不存在的其他包不列作本次交付，也不重新生成。

## 证据与未执行内容

截图是旧版模拟器画面，含地图接缝、黑条、地图空白及误截系统桌面等异常，详见 [逐图目录](../screenshots/README.md)。最新版当时跳过了截图流程，没有最新版运行截图。

本次未运行应用、自动测试、模拟器、截图采集、iOS/Android 编译或 Web 部署；仅读取文件元数据、整理文档、压缩及计算哈希。

## 使用边界

- GitHub 只托管和提供下载，不能直接在仓库页面运行 IPA。
- 真实定位需要主动授权且仅前台有效，计划时间推算不等于实际到达。
- 航班、铁路和天气服务各有覆盖边界，机场目录不是实时运营通告。
- UIKit 控件与 Web 内容并存，并非所有页面都是纯原生 Liquid Glass。
- 不保证跨设备同步，清理数据可能丢失本地记录。
- 模型、图标等素材许可需另核对，本次保持私有仓库，不改变项目授权。
