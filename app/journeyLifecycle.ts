import type { JourneySegment } from "./journeyData";

export function segmentIdentity(segment: JourneySegment) {
  return [segment.mode, segment.service.trim().toUpperCase(), segment.origin.code.trim().toUpperCase(),
    segment.destination.code.trim().toUpperCase(), segment.date, segment.departure, segment.arrival].join("|");
}
export function appendUniqueSegments(existing: JourneySegment[], incoming: JourneySegment[]) {
  const identities = new Set(existing.map(segmentIdentity));
  const additions = incoming.filter(segment => {
    const key = segmentIdentity(segment);
    if (identities.has(key)) return false;
    identities.add(key); return true;
  });
  return { segments: [...existing, ...additions], additions };
}
export function sameJourneyPlace(left: JourneySegment["destination"], right: JourneySegment["origin"]) {
  if (left.code.trim().toUpperCase() === right.code.trim().toUpperCase()) return true;
  return Math.hypot(left.coordinate[0] - right.coordinate[0], left.coordinate[1] - right.coordinate[1]) < .025;
}
export function travelDate(segment: JourneySegment) {
  const raw = segment.operational?.actualDepartureAt || segment.operational?.scheduledDepartureAt || segment.date;
  // Keep the local travel date; UTC conversion can move it into another year.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = raw.match(/^(\d{4})年(\d{1,2})月(\d{1,2})/);
  return local ? `${local[1]}-${local[2].padStart(2, "0")}-${local[3].padStart(2, "0")}` : null;
}
export function passportTrips<T extends { segments: JourneySegment[] }>(trips: T[], period = "all"): T[] {
  return trips.map(trip => ({ ...trip, segments: trip.segments.filter(segment => {
    if (segment.status !== "complete") return false;
    const year = travelDate(segment)?.slice(0, 4) ?? "unknown";
    return period === "all" || year === period;
  }) })).filter(trip => trip.segments.length > 0).sort((a, b) => {
    const latest = (trip: T) => trip.segments.map(segment => travelDate(segment) ?? "").sort().at(-1) ?? "";
    return latest(b).localeCompare(latest(a));
  });
}
export function passportYears(trips: { segments: JourneySegment[] }[]) {
  return [...new Set(passportTrips(trips).flatMap(trip => trip.segments.map(segment => travelDate(segment)?.slice(0, 4) ?? "unknown")))].sort((a, b) => a === "unknown" ? 1 : b === "unknown" ? -1 : b.localeCompare(a));
}
export function nextPlaybackSelection(segments: JourneySegment[], selectedId: string) {
  const index = segments.findIndex(segment => segment.id === selectedId);
  return index >= 0 ? segments[index + 1]?.id ?? selectedId : selectedId;
}
