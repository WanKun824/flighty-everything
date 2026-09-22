# iOS 逐页截图采集

本目录用于在 GitHub 的 Mac/Xcode runner 上编译原生应用、进入现有页面并保存 iPhone 模拟器原始截图。不是网页截图工具，也不是完整的交互测试套件。

## 从 GitHub 运行

1. 推送目标源码提交，保留完整提交号。
2. 打开 Actions → **Capture iOS Pages on Xcode** → Run workflow。
3. 选择包含该提交的分支，`source_sha` 填写该分支当前完整 SHA。工作流会核对检出的版本，不接受版本不一致的构建。
4. 工作流使用 `xcode-27` 编译 Release 模拟器 App；分别新建浅色、深色 iPhone 17 Pro 模拟器，避免应用重启后的采集会话残留。
5. 下载 `fly-everything-ios-page-captures` artifact。失败时也会上传已有截图、清单和编译日志。

需要可用的 GitHub Actions Mac runner 和构建额度。不使用签名材料、不导出新 IPA、不修改已有 Release。

## 采集机制

- `SceneDelegate.swift` 的文件命令桥只编译进模拟器目标，还必须显式设置 `FLY_SCREENSHOT_SESSION=1` 才启动。
- `capture-pages.py` 通过该桥触发现有 React 页面状态和真实页面控件，不绘制替代界面。
- 每张图检查目标页面和前台应用的截图前后响应，再用 `xcrun simctl io … screenshot` 保存屏幕像素。
- 页面顺序包括主行程、路段详情、真实时刻编辑、旅程编辑/删除确认、添加流程、航班搜索、机场、天气图层、同行/个人资料、旅记和社区，共 32 个页面或状态，每种外观各一张。
- 使用全新应用演示数据；不确认删除、不发送邀请、不发布社区、不授权定位。
- 模拟预览持续运行，采集过程中地图和所选载具可能随当前应用逻辑变化。截图不是冻结数据的视觉回归基线。

## 文件与解释

`manifest.json` 保存源码、运行编号、页面标题、目标元素、截图 SHA-256、应用视口及主题等证据。`captured` 仅表示取得前台页面像素，并不证明布局没有重叠、玻璃效果达到设计目标或业务数据真实。

清单与 PNG 必须一起保留。不要把设计参考图、历史版本图或系统桌面图当成当前页面截图。系统权限、分享、文件选择及无当前导航入口的旧组件不在本次覆盖内。

## 整理到仓库文档

在项目根目录下载 artifact 后执行：

```sh
node ios/qa/contact-sheets.mjs release/<本次截图目录>
python ios/qa/document-captures.py release/<本次截图目录> --destination docs/runtime-YYYYMMDD --capture-date "本次实际采集日期与时区"
```

第一条生成仅供检查的缩略图拼版；第二条核对 SHA-256 后复制原图，按页面生成浅色/深色说明。原始 PNG 不压缩重绘、不裁剪，也不添加装饰。

发布前必须查看每张原图或可判读缩略图，必要时放大，并撰写目标目录中的 `VISUAL_NOTES.md`。同时确认页面覆盖数量、外观是否一致、链接是否有效，再更新根 README。缺少深色、退出到桌面或页面未出现时，应明确记录失败并补采，不能只依据 artifact 上传成功判断任务完成。

此流程没有验证触摸拖动、键盘避让、GPS 到达判断、后台行为、真实航班查询或社区提交。
