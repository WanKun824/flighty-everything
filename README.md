# flighty Everything

一套以 Flighty 视觉语言重新设计的多交通旅行产品：保留 iOS 移动端，同时提供完整的中文网页工作台，并把飞机、火车、汽车与轮船连接成同一条可操作旅程。

## Product features

- Three-column desktop journey workbench with live routes, date/mode filters, companions and travel statistics
- Unified airplane, train, car and ferry data model with persistent add, complete and delete flows
- iOS-style mobile journey timeline, multi-transport passport and interactive 3D vehicle details
- Flight number/route search, calendar import, airports, favorites and Flighty-style friend invites
- Interactive Mapbox globe with multi-color journey lines and RainViewer weather radar
- Apple SF Symbols throughout the interface
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
