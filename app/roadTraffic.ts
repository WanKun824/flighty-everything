import type { JourneySegment } from "./journeyData.ts";
import { MAPBOX_ACCESS_TOKEN } from "./mapboxConfig.ts";

export type CongestionLevel = "low" | "moderate" | "heavy" | "severe" | "unknown";

export type RoadTrafficRoute = {
  segmentId: string;
  coordinates: [number, number][];
  congestion: CongestionLevel[];
  durationMinutes: number;
  typicalMinutes: number;
  delayMinutes: number;
  distanceKm: number;
  incidentCount: number;
  updatedAt: string;
  provider: "Mapbox Traffic";
};

type MapboxDirectionsResponse = {
  code?: string;
  routes?: Array<{
    duration?: number;
    duration_typical?: number;
    distance?: number;
    geometry?: { coordinates?: [number, number][] };
    legs?: Array<{
      incidents?: unknown[];
      annotation?: { congestion?: CongestionLevel[] };
    }>;
  }>;
};

export async function fetchRoadTraffic(
  segment: JourneySegment,
  signal?: AbortSignal,
): Promise<RoadTrafficRoute | null> {
  if (segment.mode !== "car") return null;
  const coordinates = [segment.origin.coordinate, segment.destination.coordinate]
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(";");
  const parameters = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    geometries: "geojson",
    overview: "full",
    annotations: "congestion,duration,distance,closure",
    depart_at: "now",
    steps: "false",
  });
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?${parameters}`,
    { signal, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`实时路况请求失败 (${response.status})`);
  const payload = (await response.json()) as MapboxDirectionsResponse;
  const route = payload.routes?.[0];
  const routeCoordinates = route?.geometry?.coordinates;
  if (payload.code !== "Ok" || !route || !routeCoordinates?.length) return null;
  const durationMinutes = Math.max(1, Math.round((route.duration ?? 0) / 60));
  const typicalMinutes = Math.max(
    1,
    Math.round((route.duration_typical ?? route.duration ?? 0) / 60),
  );
  const congestion = route.legs?.flatMap((leg) => leg.annotation?.congestion ?? []) ?? [];
  return {
    segmentId: segment.id,
    coordinates: routeCoordinates,
    congestion,
    durationMinutes,
    typicalMinutes,
    delayMinutes: Math.max(0, durationMinutes - typicalMinutes),
    distanceKm: Math.max(1, Math.round((route.distance ?? 0) / 1000)),
    incidentCount: route.legs?.reduce((sum, leg) => sum + (leg.incidents?.length ?? 0), 0) ?? 0,
    updatedAt: new Date().toISOString(),
    provider: "Mapbox Traffic",
  };
}

export function roadTrafficLabel(route: RoadTrafficRoute) {
  if (route.incidentCount > 0) return `${route.incidentCount} 条道路事件`;
  if (route.delayMinutes >= 10) return `拥堵 · 预计多 ${route.delayMinutes} 分钟`;
  if (route.delayMinutes >= 3) return `车流较慢 · 多 ${route.delayMinutes} 分钟`;
  return "实时路况顺畅";
}
