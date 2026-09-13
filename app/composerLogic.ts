import type { JourneyPlace, JourneySegment } from "./journeyData.ts";
import { sameJourneyPlace } from "./journeyLifecycle.ts";

export function localInputDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function recentJourneyPlaces(trips: { segments: JourneySegment[] }[], limit = 3) {
  const result: JourneyPlace[] = [];
  const places = trips.flatMap(trip => trip.segments.flatMap(segment => [segment.origin, segment.destination])).reverse();
  for (const place of places) {
    if (!result.some(existing => sameJourneyPlace(existing, place))) result.push(place);
    if (result.length >= limit) break;
  }
  return result;
}

export function routeInputProblem(origin: JourneyPlace | null, destination: JourneyPlace | null, date: string, departure: string) {
  if (!origin) return "请选择起点";
  if (!destination) return "请选择终点";
  if (sameJourneyPlace(origin, destination)) return "起点和终点不能是同一地点";
  const parsed = new Date(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || localInputDate(parsed) !== date) return "请选择有效日期";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departure)) return "请选择出发时间";
  return null;
}

export function suggestedJourneyName(segments: JourneySegment[]) {
  const first = segments[0]?.origin.city;
  const last = segments.at(-1)?.destination.city;
  return first && last ? (first === last ? `${first}之旅` : `${first} → ${last}`) : "新的旅程";
}
