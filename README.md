# 漫游 · Travel Globe

最新版交接说明见 [HANDOFF-20260814.md](./HANDOFF-20260814.md)，三端规范见 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)，3D 模型许可见 [MODEL_LICENSES.md](./MODEL_LICENSES.md)。

一套 Apple 风格的旅行社群与地球仪行程 Demo。地图用 Mapbox GL JS，载具用 Three.js，
地点搜索用 Mapbox Search Box + Geocoding v6 双引擎。

## 已完成

- Mapbox 真实地球仪，卫星底图、星空与大气效果
- 香港—东京—京都—直岛多段示例行程
- 大圆航线 + Mapbox Directions 真实路网线形，跨 ±180 经线自动展开
- 飞机、汽车、新干线、轮船四套程序化 Three.js 载具，沿航向贴合路线
- 播放、暂停、拖动进度，速度 0.1–2 倍无级调节
- LIVE JOURNEY 面板：桌面可拖动、缩放、贴边收起；移动端下拉分档与关闭（参考 Apple HIG）
- 多语言地点搜索：中文枢纽名能定位到机场／车站本身，不退化成城市
- 行程照片、天气、打卡与旅行社群界面，动物风格头像
- 桌面、平板、手机响应式布局
- 42 个单元测试覆盖球面几何、面板几何、地点搜索打分与服务端渲染

## 本地运行

需要 Node.js 22 或以上。

```bash
npm install
npm run dev
```

打开终端显示的地址。

## 打包

```bash
npm run build     # 产物写入 dist/
npm start         # 以生产模式跑 dist/
```

`dist/` 约 8 MB。首屏 gzip 后约 163 KB；mapbox-gl（485 KB gz）和 Three.js 载具
（128 KB gz）都是独立懒加载块，不进首屏。构建日志里的 500 kB 警告指的就是这两块，
它们已经拆开且按需加载，可以忽略。

提交前的完整检查：

```bash
npm test                 # 先 build，再跑全部 42 个测试
npm run lint             # 0 错误；16 个 <img> 警告是已知的
npx tsc --noEmit         # 见 HANDOFF.md 第 3 节的已知报错
```

## Mapbox Token

在项目根目录建 `.env.local`：

```env
NEXT_PUBLIC_MAPBOX_TOKEN=你的_Mapbox_公共_Token
```

这个变量会下发到浏览器，所以只能放 public token。目前 `app/page.tsx:65` 里有一个
硬编码的 public token 兜底，上线前必须换成自己的，并在 Mapbox 后台加域名白名单。

## 主要文件

| 文件 | 作用 |
|---|---|
| `app/page.tsx` | 行程、地图、搜索与主要 UI |
| `app/placeSearch.ts` | 多语言地点搜索：查询改写、别名桥、命中打分 |
| `app/routeGeometry.ts` | 大圆航线、真实路网、时间轴与播放时钟 |
| `app/JourneyPanel.tsx` | LIVE JOURNEY 面板的拖动、缩放、收起与移动端下拉 |
| `app/panelGeometry.ts` | 面板的边界、贴边吸附与移动端分档，纯函数便于测试 |
| `app/Vehicle3D.tsx` | 四套程序化 Three.js 载具 |
| `app/animalAvatars.ts` | 动物风格头像生成 |
| `app/globals.css` | Apple 风格视觉与响应式布局 |
| `app/layout.tsx` | 页面与社交分享元数据 |
| `tests/` | 4 个测试文件，共 42 个测试 |
| `HANDOFF.md` | 完整交接：搜索原理、精度上限、GitHub 与 Codemagic 操作 |

## 当前边界

**交通数据是演示数据。** 航段线形是真的（大圆 + Mapbox Directions 路网），但不接实时
航班、列车、船班的班次与票价。铁路段按陆路走廊近似——Mapbox Directions 没有 rail profile。

**地点搜索有一处硬上限。** 中国大陆、香港、台湾的枢纽只能定位到城市／区一级，那些 POI
在 Mapbox 索引里就是没有。理由和验证过程见 HANDOFF.md 第 5 节。

**3D 载具是项目内程序化模型**，不依赖外部模型文件，没有额外授权问题。
