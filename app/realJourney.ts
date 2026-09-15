import type { JourneySegment } from "./journeyData.ts";

export type LocationFix = { longitude: number; latitude: number; accuracy: number; timestamp: number; speed: number | null };

/** Resolve an explicitly chosen IANA time zone, rejecting DST gaps/ambiguity. */
export function zonedPlanTime(date: string, time: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const target = `${date}T${time}`;
  const wall = Date.parse(`${target}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== target) return null;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const local = (stamp: number) => {
      const p = Object.fromEntries(fmt.formatToParts(stamp).map(part => [part.type, part.value]));
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    };
    // Offsets sampled across the transition cover both repeated local times.
    const candidates = new Set<number>();
    for (const delta of [-36, 0, 36]) {
      const sample = wall + delta * 3_600_000;
      const offset = Date.parse(`${local(sample)}:00Z`) - sample;
      const candidate = wall - offset;
      if (local(candidate) === target) candidates.add(candidate);
    }
    return candidates.size === 1 ? new Date([...candidates][0]).toISOString() : null;
  } catch { return null; }
}

export function realScheduleProblem(date: string, departure: string, arrivalDate: string, arrival: string, zone: string) {
  const start = zonedPlanTime(date, departure, zone), end = zonedPlanTime(arrivalDate, arrival, zone);
  if (!start || !end) return "请填写有效的出发、到达日期时间和时区；避开夏令时重复或不存在的时刻。";
  if (Date.parse(end) <= Date.parse(start)) return "到达时间必须晚于出发时间，跨日行程请调整到达日期。";
  return null;
}

export function journeyPhase(segment: JourneySegment, now: number) {
  const plan = segment.travelPlan;
  if (segment.status === "complete" || plan?.arrivedAt) return { label: "已到达", tone: "complete" };
  if (plan?.mode !== "real") return { label: "模拟预览", tone: "upcoming" };
  if (now < Date.parse(plan.departureAt)) return { label: "待出发", tone: "upcoming" };
  if (now >= Date.parse(plan.arrivalAt)) return { label: "计划已到时 · 待确认到达", tone: "upcoming" };
  return { label: "计划行程中", tone: "active" };
}

export function distanceMeters(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function freshLocation(fix: LocationFix | null, now: number): fix is LocationFix {
  return Boolean(fix && Number.isFinite(fix.longitude) && Math.abs(fix.longitude) <= 180 && Number.isFinite(fix.latitude) && Math.abs(fix.latitude) <= 90 && Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 100 && now - fix.timestamp >= -5000 && now - fix.timestamp <= 30_000);
}

/** Evidence is transient and resets on route change, stale fixes, or leaving the radius. */
export function arrivalEvidence(segment: JourneySegment, fix: LocationFix, now: number, previous: { since: number; last: number } | null) {
  const plan = segment.travelPlan;
  const radius = segment.destination.kind === "airport" ? 800 : 150;
  if (plan?.mode !== "real" || segment.status === "complete" || now < Date.parse(plan.departureAt) || !freshLocation(fix, now) ||
    (fix.speed !== null && fix.speed > 3) || distanceMeters([fix.longitude, fix.latitude], segment.destination.coordinate) + fix.accuracy > radius) return null;
  if (!previous || fix.timestamp - previous.last > 30_000) return { since: fix.timestamp, last: fix.timestamp, arrived: false };
  return { since: previous.since, last: fix.timestamp, arrived: fix.timestamp - previous.since >= 45_000 };
}
