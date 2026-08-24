# flighty Everything

A video-calibrated, mobile-first flight companion with a live globe, practical trip tools, airport operations, weather radar, friends, and a derived travel passport.

## Product features

- Interactive Mapbox globe with airport markers and camera controls
- Flight search by flight number or route, calendar import, and random-flight demo
- Persistent saved flights with detail and removal flows
- Flighty Friends onboarding, profile avatar, invite codes, and live friend cards
- Passport totals plus flight, delay, and aircraft statistics
- Airport issue lists, favorites, detail reports, and map focus
- Global and US RainViewer weather-radar layers
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

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Product screens and interaction flows |
| `app/FlightGlobe.tsx` | Mapbox globe, airport markers, and radar layers |
| `app/flightyData.ts` | Airport, airline, flight, and statistics models |
| `app/flightyStorage.ts` | Versioned local persistence and mutations |
| `app/globals.css` | Video-calibrated mobile visual system |
| `tests/` | Data, geometry, rendering, and behavior coverage |

## External data

The project uses Mapbox for the globe and RainViewer for radar tiles. Configure `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` when replacing the bundled public demo token with your own restricted public token.
