# 当前版本：iOS 模拟器逐页运行截图

采集日期：2026-10-18 UTC。截图由 GitHub Mac/Xcode 编译后的应用在 iPhone 模拟器中实际运行产生。不是网页截图、不是设计稿，也不是真机拍摄。

- 初始源码提交：`db626c81118473c8233c026bbe6503ccba3c92d9`。
- [初次 GitHub 构建与采集记录](https://github.com/wkun475-star/flighty-everything/actions/runs/39134486762)。
- 批次提交：`50f4eef397034f66359e6e80365415b6ca6667b0`、`db626c81118473c8233c026bbe6503ccba3c92d9`。
- 批次运行：[Actions 39134486762](https://github.com/wkun475-star/flighty-everything/actions/runs/39134486762)、[Actions 39136635178](https://github.com/wkun475-star/flighty-everything/actions/runs/39136635178)。
- 若存在补采，只替换失败项，并校验清单中全部 applicationTrees 相同；每张图仍单独标明真实提交和运行，不冒称同一批次。
- [原始采集清单](manifest.json)、[Xcode 版本](xcode-version.txt)、[macOS 版本](macos-version.txt)。
- 使用仅限模拟器且需显式开启的页面导航助手进入已有 React 页面，再由 `simctl` 截取真实画面。没有拼接或生成应用截图，没有伪造网络数据。
- 截图前检查目标元素，截图前后读取前台应用的新响应；这能排除失去响应/退回桌面，不能代替人工视觉检查或触摸手势测试。
- 使用全新模拟器和应用自带演示行程，不申请定位、不发送邀请、不发布社区内容；数据不能代表真实行程。

## 页面目录

清单目标状态：64；已取得原图：62；未完成：2。未完成项不使用旧图或另一主题替代。

| 页面 | 浅色 | 深色 |
| --- | --- | --- |
| [行程：最小面板](01-flights-compact.md) | failed | captured |
| [行程：展开列表](02-flights-expanded.md) | captured | captured |
| [路段详情：最小档](03-detail-compact.md) | captured | captured |
| [路段详情：展开](04-detail-expanded.md) | captured | captured |
| [路段详情：真实时刻编辑](04b-real-time-editor.md) | captured | captured |
| [旅程：编辑名称](05-trip-edit.md) | captured | captured |
| [路段详情：数据来源与删除入口](06-detail-source.md) | captured | captured |
| [添加行程：模拟模式](07-compose.md) | captured | captured |
| [添加行程：真实模式](08-compose-real.md) | captured | captured |
| [添加行程：选择起点](09-origin-search.md) | captured | captured |
| [添加行程：选择终点](10-destination-search.md) | captured | captured |
| [航班工具：推荐与入口](11-flight-search.md) | captured | captured |
| [航班工具：按航班号查询](12-flight-number.md) | captured | captured |
| [航班工具：按航线查询](13-flight-route.md) | captured | captured |
| [机场：目录与收藏](14-airports.md) | captured | captured |
| [机场：搜索 HKG](15-airport-search.md) | captured | captured |
| [机场：香港机场资料](16-airport-detail.md) | captured | captured |
| [地图：天气与地球图层](17-weather.md) | captured | captured |
| [同行：介绍](18-friends-intro.md) | captured | captured |
| [同行：填写姓名](19-profile-name.md) | captured | captured |
| [同行：选择头像](20-profile-avatar.md) | captured | captured |
| [同行：完成引导](21-friends-ready.md) | captured | captured |
| [同行：列表与空状态](22-friends-list.md) | captured | captured |
| [同行：邀请码表单](23-add-friend.md) | captured | captured |
| [个人资料：姓名与外观](24-profile.md) | captured | captured |
| [旅迹：最小面板](25-passport-compact.md) | captured | captured |
| [旅迹：概览](26-passport-expanded.md) | captured | captured |
| [旅迹：详细统计](27-passport-stats.md) | captured | captured |
| [社区：主应用信息流](28-community.md) | failed | captured |
| [社区：发布表单](29-community-publish.md) | captured | captured |
| [社区：展开信息流](30-community-expanded.md) | captured | captured |
| [社区：行程详情](31-community-detail.md) | captured | captured |

## 覆盖边界

- 上表逐项列出实际采集结果；`captured` 只表示取得前台画面，不代表页面完全无缺陷。
- 系统分享、文件选择、系统权限弹窗及第三方网页不在应用页面截图范围；没有执行会向外发送信息的操作。
- 旧版不可达的 flight-detail、flight-stats、delay-stats、aircraft-stats 组件没有当前导航入口，未冒充可用页面截图。
- 历史图仍在 [旧截图档案](../screenshots/README.md)，不得混作本次截图。

## 人工查看备注

参见 [视觉检查说明](VISUAL_NOTES.md)。
