# 漫游项目交接文档

## 1. 当前版本是什么

这是可直接运行和发布的 Web/App UI Demo，核心是“在地球仪上播放完整行程”。用户可以在真实地图中查看机场、车站、港口与景点，选择飞机、汽车、火车或轮船，并看到相应 3D 载具和路线动画。

已接入：

- Mapbox GL JS 地球仪、卫星底图、大气效果、真实坐标
- Mapbox Search Box API 的地点联想与详情检索
- Three.js 程序化低多边形飞机、汽车、新干线、轮船
- 地点、出发时间、交通方式添加界面
- 照片、天气、打卡、分享和社群 UI

尚未接入：

- 实时航班、铁路、公交、轮渡时刻和票价
- 用户账号、云端行程保存、好友协作和评论数据库
- 原生 Apple Maps 3D 城市模型
- Apple 推送、定位、相册权限和 App Store 正式签名

## 2. 技术结构

| 模块 | 技术 | 说明 |
|---|---|---|
| 前端 | React 19 + vinext | 页面和交互 |
| 地图 | Mapbox GL JS | Globe、卫星地图、地点标记、路线 |
| 地点搜索 | Mapbox Search Box API | 机场、车站、港口、景点搜索 |
| 3D 模型 | Three.js | 轻量程序化载具，按需加载 |
| 图标 | SF Symbols React 图标库 | 与 Apple 界面语言保持一致 |
| 发布 | Sites / Cloudflare | 当前在线 Demo |
| 自动检查 | GitHub Actions | 免费额度内完成安装、Lint、Build |

## 3. 自己在电脑运行

```bash
npm install
npm run dev
```

提交前检查：

```bash
npm run lint
npm run build
```

Windows、macOS 和 Linux 使用相同命令。

## 4. Mapbox 设置

在项目根目录新建 `.env.local`：

```env
NEXT_PUBLIC_MAPBOX_TOKEN=你的_Mapbox_公共_Token
```

这个变量会提供给浏览器，所以只能放 Mapbox 的 public token；不要在这里放私钥。上线前在 Mapbox 后台给 Token 增加允许的域名限制。

## 5. GitHub Actions Free 怎么操作

项目已经有 `.github/workflows/ci.yml`，执行逻辑是：

1. 推送到 `main`、发起 Pull Request，或者手动点击运行。
2. GitHub 创建一台临时 Ubuntu 机器。
3. 安装 Node.js 22。
4. 执行 `npm ci`、`npm run lint`、`npm run build`。
5. 绿色对勾代表项目能正常构建；红色叉号可点进去看错误日志。

第一次配置 Token：

1. 打开 GitHub 仓库。
2. 进入 `Settings → Secrets and variables → Actions`。
3. 点击 `New repository secret`。
4. 名称填写 `NEXT_PUBLIC_MAPBOX_TOKEN`，值填写 Mapbox public token。

手动运行：

1. 进入仓库的 `Actions`。
2. 左侧选 `Build travel globe demo`。
3. 点击 `Run workflow`。

剩余用量查看：GitHub 头像 → `Settings` → `Billing and licensing` → `Usage`，然后筛选 Actions。公开仓库的标准 GitHub-hosted runner 通常不计费；私有仓库按账户方案的每月分钟数计算，规则以 GitHub 当期页面为准。

## 6. Codemagic 个人版打 IPA

当前仓库是 Web 项目，不能只把网页文件改名为 IPA。正确流程是先增加 Capacitor iOS 外壳，再让 Codemagic 在 macOS 构建机中使用你的 Apple 证书签名。

正式打包前需要：

- Apple Developer 付费账号
- App Store Connect 中的 App 与 Bundle ID
- iOS Distribution Certificate
- Provisioning Profile
- App Store Connect API Key
- 一台可用于首次生成/检查 iOS 工程的 macOS 环境，或在 Codemagic 中完成生成

推荐流程：

1. Web 版功能稳定后加入 Capacitor iOS 工程。
2. 将 `capacitor.config.ts` 指向已发布站点，或改造成可离线打包的静态前端。
3. 在 Codemagic 连接 GitHub 仓库。
4. 在 Codemagic 的 `Team settings → Integrations → Developer Portal` 添加 App Store Connect API Key。
5. 在 workflow 选择 macOS 构建机、Xcode 版本和自动签名。
6. 运行 `pod install`、`xcodebuild archive`、`xcodebuild -exportArchive`。
7. 从 Artifacts 下载 `.ipa`，或上传 TestFlight。

没有你的 Apple 签名资料时，任何平台都无法产出可安装到普通 iPhone 的正式 IPA。不要把证书密码、私钥或 API 私钥提交到 GitHub；只放在 Codemagic 加密变量中。

## 7. 3D 模型方案

当前 Demo 使用 Three.js 几何体直接构建载具，因此体积小、风格统一、没有外部模型再分发风险。正式版如需更精细模型，可优先评估 CC0 的 Quaternius / Poly Pizza 资源，再转为 Draco 压缩 GLB，并把单个移动端模型控制在约 0.5–2 MB。

建议分级：

- 地球仪远景：当前程序化低多边形模型
- 城市近景：压缩 GLB 模型
- 选中详情：高精度模型与材质

## 8. 下一阶段 API

| 功能 | 建议服务 |
|---|---|
| 驾车/步行路线 | Mapbox Directions API |
| 天气 | Apple WeatherKit 或 OpenWeather |
| 航班 | Aviationstack、FlightAware 或 Amadeus |
| 铁路/公交 | 当地 GTFS / Navitime / Google Routes（按地区评估） |
| 轮渡 | 船公司 API 或官方时刻数据 |
| 照片 | 用户相册上传 + 对象存储 |
| 分享/复制行程 | 数据库中的 trip / stop / segment / share 表 |

## 9. 发布前检查

- 为 Mapbox Token 设置域名白名单
- 替换演示照片，确认商用授权
- 接入真实天气与交通时刻后标明数据更新时间
- 加入隐私政策、位置权限说明、照片权限说明
- 压缩 GLB 和图片，测试低端 iPhone
- 用 TestFlight 完成真机地图、内存、耗电和弱网测试
