import type { JourneyMode, JourneyPlace, JourneySegment } from "./journeyData.ts";
import type { JourneyTrip } from "./journeyStorage.ts";

// Fictional records for first-run exploration. Never merged into an existing store.
// Times/distances are illustrative, not tickets, live schedules or actual user travel.
const place = (code: string, city: string, name: string, coordinate: [number, number], kind: JourneyPlace["kind"]): JourneyPlace =>
  ({ code, city, name, coordinate, kind });
const p = {
  HKG: place("HKG", "香港", "香港国际机场", [113.9185, 22.308], "airport"),
  SIN: place("SIN", "新加坡", "樟宜机场", [103.9915, 1.3644], "airport"),
  BKK: place("BKK", "曼谷", "素万那普机场", [100.7501, 13.69], "airport"),
  TYO: place("TYO", "东京", "东京站", [139.7671, 35.6812], "station"),
  KYO: place("KYO", "京都", "京都站", [135.7588, 34.9858], "station"),
  KOB: place("KOB", "神户", "神户港", [135.1956, 34.6806], "port"),
  TAK: place("TAK-PORT", "高松", "高松港", [134.049, 34.352], "port"),
  LON: place("LON-STP", "伦敦", "圣潘克拉斯车站", [-0.1261, 51.5319], "station"),
  PAR: place("PAR-NORD", "巴黎", "巴黎北站", [2.3553, 48.8809], "station"),
  LYO: place("LYO", "里昂", "里昂市区", [4.8357, 45.764], "place"),
};

function leg(id: string, mode: JourneyMode, from: JourneyPlace, to: JourneyPlace, date: string,
  durationMinutes: number, distanceKm: number): JourneySegment {
  return {
    id: `demo-${id}`, mode, service: `DEMO-${id.toUpperCase()}`,
    title: `${from.city}到${to.city} · 演示`, origin: from, destination: to, date,
    departure: "09:00", arrival: `${String(9 + Math.floor(durationMinutes / 60)).padStart(2, "0")}:${String(durationMinutes % 60).padStart(2, "0")}`,
    durationMinutes, distanceKm, status: "complete", progress: 1,
    note: "虚构的已完成演示记录；时间和距离仅为展示，不代表真实出行、班次或道路/铁路线路。",
    operational: { source: "manual", sourceLabel: "演示样例 · 手工记录（非真实出行）", quality: "manual", realtime: false },
  };
}

export const DEMO_JOURNEY_TRIPS: JourneyTrip[] = [
  {
    id: "demo-asia-hops", name: "【演示】亚洲城市跳跃", color: "#0a84ff", motif: "skyline",
    createdAt: "2026-06-01T00:00:00Z", savedToPassportAt: "2026-06-05T00:00:00Z",
    segments: [
      leg("asia-1", "flight", p.HKG, p.SIN, "2026-06-01", 235, 2565),
      leg("asia-2", "flight", p.SIN, p.BKK, "2026-06-03", 150, 1415),
      leg("asia-3", "flight", p.BKK, p.HKG, "2026-06-05", 170, 1690),
    ],
  },
  {
    id: "demo-japan-coast", name: "【演示】日本山海联程", color: "#30b77a", motif: "torii",
    createdAt: "2026-04-08T00:00:00Z", savedToPassportAt: "2026-04-11T00:00:00Z",
    segments: [
      leg("japan-1", "train", p.TYO, p.KYO, "2026-04-08", 135, 476),
      leg("japan-2", "car", p.KYO, p.KOB, "2026-04-09", 100, 85),
      leg("japan-3", "ferry", p.KOB, p.TAK, "2026-04-11", 270, 120),
    ],
  },
  {
    id: "demo-europe-2025", name: "【演示】2025 欧洲城际", color: "#ff9f0a", motif: "mountain",
    createdAt: "2025-10-03T00:00:00Z", savedToPassportAt: "2025-10-05T00:00:00Z",
    segments: [
      leg("europe-1", "train", p.LON, p.PAR, "2025-10-03", 140, 344),
      leg("europe-2", "car", p.PAR, p.LYO, "2025-10-05", 300, 465),
    ],
  },
];
