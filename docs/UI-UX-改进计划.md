# UI / UX 改进计划：以 iOS 原生应用为目标

制定日期：2026-10-14 · 基线提交：`7a30db6` · 目标机型：iPhone 17 Pro（402 × 874 pt），浅色 + 深色

参照对象：**Apple 地图**（地图 + 多档面板）、**查找**（底栏 + 地图）、**钱包 / Flighty**（行程卡片）、**健身 / 健康**（统计摘要）、**设置**（分组表单）。

---

## 执行记录 · 2026-10-18

本轮保持 React + Capacitor，社区已并入主应用。当前完成本地生产/原生 Web 资源构建、152 项自动测试和 33 项 Chrome 交互验收（浅色、深色、小屏）；详见 [网页验收记录与拼版](runtime-ui-ux-web/VISUAL_NOTES.md)。

**未生成安装包、未触发 iOS 截图工作流。** 原生截图、全量 Dynamic Type / VoiceOver、历史 CSS / 调色板收敛及既有 lint 问题仍未全部完成。下方勾选仅表示已实现的项目，不等同于方案整体或 iOS 验收完成。

## 一、现状诊断

### 1. 量化证据（来自源码）

| 指标 | 现状 | iOS 原生标准 |
| --- | --- | --- |
| 字号种类 | **30+ 种**（6–34px 几乎每个整数都有） | 11 级文字样式（Large Title 34 → Caption 2 11） |
| 小于 11px 的字号声明 | **约 240 处**（6/7/8/9/10px） | HIG 最小 11pt |
| 硬编码十六进制颜色 | **458 种** | 约 15 个语义色（label / secondaryLabel / systemBackground / separator / systemBlue…） |
| CSS 变量 | 约 100 个，分散在 4 个文件，命名不统一 | 一套令牌、一个来源 |
| 样式文件 | 7 个 CSS 共 2692 行，互相覆盖（`journey-refinement.css` 862 行即为补丁层） | 一份基础 + 组件样式 |
| 关闭按钮样式 | 至少 3 种（描边圆、黑色实心圆、无底 ×） | 统一的 30pt 圆形 `xmark` 按钮 |
| 社区页 | 独立路由 `app/community` + `JourneyExperience27`，另一套视觉语言 | 与主应用同一设计系统 |

### 2. 截图中的体验问题（32 张模拟器截图逐张核对）

**层级与遮挡**
- 地图浮动控件（图层 / 天气 / 定位）侵入面板，与头像、分享、标题重叠（02、04、17、22）。
- 底栏覆盖滚动内容，玻璃下文字重影（02、26）。
- 旅迹统计页关闭按钮压在“全部”筛选上（27）。
- 弹层叠弹层，底层行程文字透出来（05、06、18–21、23、24）。编辑旅程弹层大面积空白。

**信息密度与层级**
- 每一行都标“模拟预览”，详情页嵌套 3 层提示框，信息噪音多（02、04）。
- 大量 8–10px 小字，层级靠字号硬拉，没有用字重和颜色层次。
- 交通图标下方再写一行小字“模拟”，图标偏小，识别度低。

**流程**
- 两套添加入口并存：“添加行程”（中文，按交通方式）和“Add Flight”（英文，仿 Flighty），用户不知道该用哪个（07 与 11–13）。
- 删除确认是行内文字链接，不是原生的操作表单（06）。
- 主按钮禁用态是浅蓝色，看起来像能点（07、08）；“添加同行人”禁用态是黑底低对比（23）。

**语言与品牌**
- 中英混用：My Flights / Add Flight / Your Profile / Save Avatar / Continue / Find by Route…
- **残留 Flighty 商标文案**：“Flighty Friends”“ALL-TIME FLIGHTY PASSPORT”“Try fly everything for free”。上架和品牌都有风险，必须移除。

**视觉一致性**
- 浅色模式下“按路线添加”出现深色输入框（13）。
- 旅迹用红 / 蓝 / 紫大渐变卡片，社区标题直接压在卫星图上，对比度不稳定（26、28、30），和主应用风格割裂。
- 深色模式从未完成验收。

---

## 二、方向与原则

### 路线选择（建议）：**混合架构，原生化做到底**

保留 React + Capacitor，Web 层严格照 iOS 规范重做，同时把系统级交互（操作表单、分享、震动、键盘、日期选择）交给原生。

**不建议用 SwiftUI 全部重写**：开发机是 Windows，iOS 只能靠 GitHub Actions 的 Mac runner 编译，每次改动都要走 CI，迭代慢、用量高；Mapbox 地图、3D 载具和 Android / Web 三端共享也会全部推倒。现在的交互问题几乎都出在设计系统和信息架构上，换框架解决不了。

### 设计原则

1. **内容优先，控件让路**：地图是主角；面板升到大档位时浮动控件隐藏（与 Apple 地图一致）。
2. **一次只有一层**：同一时间只显示一个面板，二级内容在面板内推入，带返回按钮；不叠弹层。
3. **少即是多**：模式（模拟 / 真实）在行程层面标一次，不在每一行重复。
4. **系统组件优先**：能用系统控件的不手搓（日期选择、开关、分段控件、操作表单、分享）。
5. **全中文**：界面统一简体中文；专有名词（航班号、IATA 代码）保留原样。
6. **规则可测试**：设计约束写成自动化测试，防止回退。

---

## 三、分阶段执行

每阶段控制在**一个会话**内完成，结束时更新本文件的勾选框。先用本地 Web（iPhone 尺寸视口）验证，iOS 模拟器截图只在阶段 2、3、5 结束时跑一次 GitHub Actions。

### 阶段 0 · 设计基座（地基，必须先做）

- [ ] 新建 `app/ios-tokens.css`，作为唯一令牌来源：
  - **文字样式**：Large Title 34/41、Title 1 28/34、Title 2 22/28、Title 3 20/25、Headline 17 semibold、Body 17/22、Callout 16、Subheadline 15、Footnote 13、Caption 1 12、Caption 2 11。iOS 上优先使用 `font: -apple-system-body` 等系统字体关键字，**自动支持动态字体（Dynamic Type）**。
  - **语义色**（浅 / 深两套）：`label`、`secondaryLabel`、`tertiaryLabel`、`systemBackground`、`secondarySystemBackground`、`systemGroupedBackground`、`separator`、`systemBlue / Red / Green / Orange`、`fill` 系列。
  - **间距**：4 / 8 / 12 / 16 / 20；**圆角**：按钮 10、卡片 16、面板 32（用连续曲率近似）。
  - **材质**：`thin / regular / thick` 三档模糊背景，统一 `backdrop-filter`。
  - **数字**：时间、里程统一 `font-variant-numeric: tabular-nums`。
- [x] 把约 240 处小于 11px 的字号提升到 11px 下限，或删除对应文字；核心页面采用文字样式令牌。旧组件向完整 11 档的收敛仍待完成。
- [ ] 把 458 种硬编码颜色收敛到语义色（先改高频的前 50 种，可覆盖大部分画面）。
- [x] 新增 `tests/design-tokens.test.mjs`：发现 `font-size` 小于 11px，或令牌文件以外出现裸十六进制颜色时，测试失败。
- [x] 确认 `JourneyExperience`、`DesktopJourney`、`JourneyPanel`、`DebugPanel` 是否已无引用；确认后删除，减少维护面。

**验收**：现有 141 个测试 + 新令牌测试通过；首页浅色、深色截图无明显回退。

### 阶段 1 · 信息架构与文案

- [x] 主要运行界面中文化（附录及已知英文残留已扫描），并**清除用户可见 Flighty 文案**：
  - My Flights → 行程；Flighty Friends → 同行；ALL-TIME FLIGHTY PASSPORT → 我的旅迹
- [x] **合并添加入口及草稿流程**：只保留一个“添加”入口 → 选交通方式 → 飞机走“航班号 / 航线”搜索，其他方式走起终点搜索 → 确认页。删除独立的 Add Flight 面板。
- [x] “模拟预览 / 真实行程”在行程标题处显示；去掉行内额外模式徽标，保留业务状态胶囊及详情中的模式切换控件。
- [x] 底栏定为 **行程 · 同行 · 旅迹 · 社区 + 独立搜索键**（iOS 26 搜索标签样式）；社区并入主应用，不再是另一套页面。（待确认，见第五节）
- [x] 个人资料改为从右上角头像进入（与 App Store、健康一致），不占用底栏。

### 阶段 2 · 地图与面板系统（Apple 地图模式）

- [ ] 统一面板组件，固定三档：**小**（标题 + 一行）、**中**（约 50%）、**大**（安全区以下全部）。复用 `useSheetDetents`，删除各页面自定义高度。
- [x] 浮动控件组跟随面板顶部移动，面板超过中档时淡出；面板顶边和控件之间保持 ≥ 8pt 间距。**解决 02 / 04 / 17 / 22 的重叠问题。**
- [x] 次级页面标准面板头：拖动条 → 标题（Title 2 粗体）→ 右侧 30pt 圆形玻璃 `xmark`；推入页左侧为 `chevron.left`。所有页面共用一个 `<SheetHeader>`。
- [x] 滚动区底部留白 = 底栏高度 + 安全区；面板在大档时底栏下沉隐藏。**解决 02 / 26 的重影。**
- [ ] 二级页面（编辑旅程、资料、添加同行人）改为面板内推入，配合滑动返回手势，不再叠弹层。
- [ ] 遮罩统一：只有模态表单使用 `rgba(0,0,0,.2)` 遮罩，面板推入不加遮罩。

**验收**：触发一次 iOS 截图工作流，重点核对 02、04、17、22、26、27。

### 阶段 3 · 关键页面重做

| 页面 | 新设计（参照） |
| --- | --- |
| 行程列表 | 钱包 / Flighty 式行：左侧 36pt 彩色圆底 SF Symbol（`airplane`、`tram.fill`、`car.fill`、`ferry.fill`）；标题 Headline；副标题“HKG 08:45 → HND 14:00”（Subheadline、等宽数字）；右侧状态胶囊。 |
| 行程详情 | 顶部大号出发 / 到达时间（Large Title、等宽数字）+ 进度条；下方用分组列表（航班信息、站台与车厢、数据来源）。删除 3 层嵌套提示框。 |
| 添加 / 编辑 | 设置式分组表单：导航栏“取消 · 标题 · 添加”，未填完时“添加”为系统灰色禁用态；日期和时间用原生紧凑型选择器；交换起终点用图标按钮。 |
| 删除 | 原生操作表单（红色“删除旅程”+“取消”），附带撤销提示。 |
| 旅迹 | 健身 / 健康式摘要：分组背景上的白色卡片 + 大号数字 + 柱状图 + 世界地图缩略图。去掉红、紫大渐变；修复关闭按钮重叠。 |
| 同行 | 系统空状态样式（SF Symbol + 标题 + 说明 + 按钮），替换英文引导插画；邀请码输入的禁用态用系统灰。 |
| 个人资料 | 分组列表：头像、名字、外观（系统分段控件）；“清除本地数据”放在最底部的红色行，点击后二次确认。 |
| 天气 / 图层 | 参照地图的“地图模式”面板：2 列大缩略图 + 系统开关。 |
| 机场 | 搜索框置顶（地图样式）；移除压在列表上的悬浮放大镜。 |
| 社区 | 纳入同一令牌体系：标题不再直接压在卫星图上；信息流卡片统一字号；发布改为模态表单。 |

**验收**：触发 iOS 截图工作流，浅色 32 页逐页对照第一节问题清单。

### 阶段 4 · 原生质感

- [x] 接入 Capacitor 官方插件：`@capacitor/action-sheet`、`@capacitor/dialog`、`@capacitor/share`、`@capacitor/keyboard`（新增依赖，需同步 iOS 工程）。
- [x] 震动反馈：面板吸附档位、开关切换、保存成功、删除时触发（扩展现有 `nativeHaptics.ts`）。
- [x] 去掉网页痕迹：`-webkit-tap-highlight-color: transparent`；界面控件禁止文字选择；禁止页面整体回弹；按下态统一为透明度 0.6 或缩放 0.97。
- [x] 动效：面板、推入、弹出采用统一弹簧曲线（CSS `linear()` 近似 iOS 弹簧）；尊重“减弱动态效果”设置。
- [ ] 无障碍：所有图标按钮补 `aria-label`；点击区域 ≥ 44 × 44pt；文字对比度 ≥ 4.5:1；VoiceOver 读出行程状态。
- [ ] 原生层（`SceneDelegate.swift`）：浮动控件使用 `UIGlassEffect` 并与 Web 面板高度联动（已有桥接，扩展即可）。

### 阶段 5 · 深色模式与验收

- [ ] 深色模式全量走查：完成采集流程中未完成的深色会话。
- [ ] iOS 截图工作流跑浅色 + 深色两套，生成拼版对照。
- [ ] 更新 `docs/runtime-*/VISUAL_NOTES.md`，逐条关闭第一节的问题。

---

## 四、用量控制约定

- 每阶段一个会话；开始时只读本文件和相关文件，**不重新做全量调研**。
- 大文件（`FlightyApp.tsx` 2209 行、`globals.css` 991 行）按需定向检索，不整读。
- 截图审查用 8 张一页的拼版（`scratchpad/sheet.py` 的做法），不逐张读原图。
- 本地 Web 验证优先；iOS 工作流只在阶段 2、3、5 结束时各跑一次。
- 不使用子代理。

## 五、待确认的决策

1. **路线**：混合架构深度原生化（建议）还是 SwiftUI 重写？
2. **社区**：是否并入主应用底栏（建议并入），还是保留独立页面？
3. **语言**：界面全中文（建议），还是做中英双语切换（会增加阶段 1 的工作量）？
4. **Android**：本轮是否只保证不坏、暂不做 Material 化？（建议如此）

## 附录：待替换的英文界面串

Aircraft Types · Choose departure and arrival airports · Class and Seat · Find by Flight Number · Find by Route · Flighty Friends · Lost to Delays · Most Frequent Tails · Most flown aircraft · My flights delayed · Past Flights · Random Flight · Search any airline flight code · Set Up Your Profile · Sync from Calendar · Tap Search to add your next flight · Travel Footprint · Try fly everything for free · Worst Delay · My Flights · Add Flight · Your Profile · Save Profile · Save Avatar · Continue · Customize Avatar · Add Route · Back to suggestions
