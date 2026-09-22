# 当前版本：iOS 模拟器逐页运行截图

文档整理于 2026-09-23。实际收录 **32 个页面/状态、32 张浅色原图**。编译成功；深色会话连接失败，工作流未整体通过。按用户要求不再补拍，使用现有截图更新说明。下表的“未采集”如实保留。

采集日期：2026-09-22（香港时间；UTC 为 2026-09-21）。截图由 GitHub Mac/Xcode 编译后的应用在 iPhone 模拟器中实际运行产生。不是网页截图、不是设计稿，也不是真机拍摄。

- 源码提交：`1d988b8fe3cda4d30a357b97e128f489afadf930`。
- [GitHub 构建与采集记录](https://github.com/wkun475-star/flighty-everything/actions/runs/35631024628)。
- [原始采集清单](manifest.json)、[Xcode 版本](xcode-version.txt)、[macOS 版本](macos-version.txt)。
- 使用仅限模拟器且需显式开启的页面导航助手进入已有 React 页面，再由 `simctl` 截取真实画面。没有拼接或生成应用截图，没有伪造网络数据。
- 每张截图前后均读取前台应用的新响应并检查目标页面；这能排除失去响应/退回桌面，不能代替人工视觉检查或触摸手势测试。
- 使用全新模拟器和应用自带演示行程，不申请定位、不发送邀请、不发布社区内容；数据不能代表真实行程。

## 页面目录

| 页面 | 浅色 | 深色 |
| --- | --- | --- |
| [行程：最小面板](01-flights-compact.md) | captured | 未采集 |
| [行程：展开列表](02-flights-expanded.md) | captured | 未采集 |
| [路段详情：最小档](03-detail-compact.md) | captured | 未采集 |
| [路段详情：展开](04-detail-expanded.md) | captured | 未采集 |
| [路段详情：真实时刻编辑](04b-real-time-editor.md) | captured | 未采集 |
| [旅程编辑](05-trip-edit.md) | captured | 未采集 |
| [删除旅程确认](06-trip-delete-confirm.md) | captured | 未采集 |
| [添加行程：模拟模式](07-compose.md) | captured | 未采集 |
| [添加行程：真实模式](08-compose-real.md) | captured | 未采集 |
| [搜索与选择起点](09-origin-search.md) | captured | 未采集 |
| [搜索与选择终点](10-destination-search.md) | captured | 未采集 |
| [航班添加工具](11-flight-search.md) | captured | 未采集 |
| [按航班号查询](12-flight-number.md) | captured | 未采集 |
| [按航线查询](13-flight-route.md) | captured | 未采集 |
| [机场目录与收藏](14-airports.md) | captured | 未采集 |
| [机场搜索](15-airport-search.md) | captured | 未采集 |
| [香港机场资料](16-airport-detail.md) | captured | 未采集 |
| [天气与地球图层](17-weather.md) | captured | 未采集 |
| [同行：介绍](18-friends-intro.md) | captured | 未采集 |
| [同行：填写姓名](19-profile-name.md) | captured | 未采集 |
| [同行：选择头像](20-profile-avatar.md) | captured | 未采集 |
| [同行：完成引导](21-friends-ready.md) | captured | 未采集 |
| [同行列表](22-friends-list.md) | captured | 未采集 |
| [添加同行者](23-add-friend.md) | captured | 未采集 |
| [个人资料与外观](24-profile.md) | captured | 未采集 |
| [旅记：最小面板](25-passport-compact.md) | captured | 未采集 |
| [旅记：概览](26-passport-expanded.md) | captured | 未采集 |
| [旅记：详细统计](27-passport-stats.md) | captured | 未采集 |
| [旅行社区](28-community.md) | captured | 未采集 |
| [社区：发布行程](29-community-publish.md) | captured | 未采集 |
| [社区：发现](30-community-discover.md) | captured | 未采集 |
| [社区：行程详情](31-community-detail.md) | captured | 未采集 |

## 覆盖边界

- 上表逐项列出实际采集结果；`captured` 只表示取得前台画面，不代表页面完全无缺陷。
- 系统分享、文件选择、系统权限弹窗及第三方网页不在应用页面截图范围；没有执行会向外发送信息的操作。
- 旧版不可达的 flight-detail、flight-stats、delay-stats、aircraft-stats 组件没有当前导航入口，未冒充可用页面截图。
- 历史图仍在 [旧截图档案](../screenshots/README.md)，不得混作本次截图。

## 人工查看备注

参见 [视觉检查说明](VISUAL_NOTES.md)。
