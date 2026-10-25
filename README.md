# flighty Everything

## 最新动态演示（浏览器 GIF）

**[四段 GIF、演示行程与录制说明](docs/demos/README.md)** · [录制来源与校验](docs/demos/manifest.json)

| 飞机飞行 | 全球机场 |
| --- | --- |
| <img src="docs/demos/flight.gif" width="260" alt="飞机飞行：浏览器 GIF，非 iOS 录屏" /> | <img src="docs/demos/airports.gif" width="260" alt="全球机场搜索与定位：浏览器 GIF" /> |
| 行程统计 | 四种交通方式切换 |
| <img src="docs/demos/statistics.gif" width="260" alt="行程统计：浏览器 GIF" /> | <img src="docs/demos/journeys.gif" width="260" alt="飞机火车汽车轮船：浏览器 GIF" /> |

新增 **3 组、8 段**虚构演示记录，覆盖 4 种交通、10 个地点、7,160 km、25 小时及 2025/2026 年份统计。只在新存储首次启动显示，不覆盖已有行程。

本默认分支仅同步图册和 Markdown；体验最新界面/样例请使用 **[build/ios-ui-20261018 演示分支](https://github.com/WanKun824/flighty-everything/tree/build/ios-ui-20261018)**。录制为实际 Chrome 画面，不是 iOS 录屏；旧 IPA 不包含本次新样例。以下功能和安装包说明保留此默认分支的原版本含义。

一套以 Flighty 视觉语言重新设计的多交通旅行产品：保留 iOS 移动端，同时提供完整的中文网页工作台，并把飞机、火车、汽车与轮船连接成同一条可操作旅程。

## Product features

- Three-column desktop journey workbench with live routes, date/mode filters, companions and travel statistics
- Unified airplane, train, car and ferry data model with persistent add, complete and delete flows
- iOS-style mobile journey timeline, multi-transport passport and interactive 3D vehicle details
- Flight number/route search, calendar import, airports, favorites and Flighty-style friend invites
- Interactive Mapbox globe with animated multi-transport vehicles, satellite/street/Mapbox Traffic layers, and RainViewer weather radar
- Apple SF Symbols throughout the interface
- Three-detent, haptic mobile sheets with iOS material effects and reduced-motion support
- Responsive web UI plus Capacitor iOS and Android shells

## Run locally

Node.js 22.13 or newer is required.

```bash
npm ci
npm run dev
```

Open the local URL printed by the development server.

## Validate

```bash
npm run build
npm test
npm run lint
npx tsc --noEmit
```

## Native shells

```bash
npm run native:sync
npm run android:debug
npm run ios:sync
```

The Capacitor display name is `flighty Everything` on both platforms.

## GitHub packages

The Actions page exposes two downloadable build pipelines:

- **Package Web Build** validates the app and uploads a deployable `flighty-everything-web-*.tar.gz` artifact.
- **Package iOS Client** always uploads an iOS Simulator `.app.zip`. When Apple signing secrets are configured, it additionally archives and exports an installable signed IPA with Xcode's current `release-testing`, `app-store-connect`, or `debugging` export method.

To enable signed IPA export, add these repository Actions secrets:

| Secret | Value |
| --- | --- |
| `IOS_CERTIFICATE_BASE64` | Base64-encoded Apple distribution or development `.p12` |
| `IOS_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile for `com.wankun824.flightyeverything` |
| `IOS_TEAM_ID` | Apple Developer Team ID |
| `IOS_KEYCHAIN_PASSWORD` | Optional temporary CI keychain password |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional restricted public Mapbox token |

## Main files

| File                      | Responsibility                                                  |
| ------------------------- | --------------------------------------------------------------- |
| `app/page.tsx`            | Responsive web/iOS routing and mobile interaction flows         |
| `app/DesktopJourney.tsx`  | Desktop journey workbench, companions and statistics            |
| `app/MobileJourney.tsx`   | iOS journey timeline, passport and detail screens               |
| `app/JourneyComposer.tsx` | Shared four-mode journey creation flow                          |
| `app/FlightGlobe.tsx`     | Mapbox globe, journey routes, airport markers, and radar layers |
| `app/flightyData.ts`      | Airport, airline, flight, and statistics models                 |
| `app/flightyStorage.ts`   | Versioned local persistence and mutations                       |
| `app/journeyData.ts`      | Unified multi-transport journey model                           |
| `app/journeyStorage.ts`   | Versioned journey persistence and mutations                     |
| `app/globals.css`         | Calibrated desktop and iOS visual system                        |
| `tests/`                  | Data, geometry, rendering, and behavior coverage                |

## External data

The project uses Mapbox for the globe and RainViewer for radar tiles. Configure `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` when replacing the bundled public demo token with your own restricted public token.
