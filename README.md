# 漫游 · Travel Globe

一套 Apple 风格的旅行社群与地球仪行程 Demo。地图使用 Mapbox GL JS，交通工具预览使用 Three.js，地点搜索使用 Mapbox Search Box API。

## 已完成

- Mapbox 真实地球仪、卫星/地图切换、星空与大气效果
- 香港—东京—京都—直岛多段示例行程
- 机场、车站、港口和景点的真实坐标与站点卡片
- 飞机、汽车、新干线、轮船四套轻量 Three.js 3D 模型
- 交通工具沿路线播放、暂停和拖动进度
- Mapbox 真实地点搜索，添加出发时间和交通方式
- 行程照片、天气、打卡信息和旅行社群界面
- 桌面、平板和手机响应式布局

## 本地运行

需要 Node.js 22 或以上版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址。生产构建：

```bash
npm run lint
npm run build
```

可在 `.env.local` 中设置 Mapbox 公共 Token：

```env
NEXT_PUBLIC_MAPBOX_TOKEN=你的_Mapbox_公共_Token
```

## 主要文件

- `app/page.tsx`：行程、地图、地点搜索及主要 UI
- `app/Vehicle3D.tsx`：四套程序化 Three.js 交通工具模型
- `app/globals.css`：Apple 风格视觉与响应式布局
- `app/layout.tsx`：页面与社交分享元数据
- `.github/workflows/ci.yml`：GitHub Actions 自动检查
- `HANDOFF.md`：完整交接、GitHub 与 Codemagic 操作文档

## 当前边界

Mapbox Search Box 返回真实地点；跨国飞机、铁路和轮渡轨迹目前是演示路线，并非实时航班、列车或船班数据。正式版本需要接入航班、铁路/公交和轮渡时刻服务。3D 载具为项目内程序化模型，不依赖外部模型文件与额外授权。
