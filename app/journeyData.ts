import { airportByCode, type Flight } from "./flightyData.ts";
import type { RouteTransport } from "./routeRules";

export type JourneyMode = RouteTransport;
export type JourneyStatus = "upcoming" | "active" | "complete";

export type JourneyDataQuality =
  | "realtime"
  | "verified-schedule"
  | "verified-route"
  | "planned"
  | "manual";

export type JourneyOperationalData = {
  source: "adsbdb" | "adsb.lol" | "transitous" | "calendar" | "manual";
  sourceLabel: string;
  quality: JourneyDataQuality;
  fetchedAt?: string;
  realtime: boolean;
  statusText?: string;
  provider?: string;
  equipment?: string;
  scheduledDepartureAt?: string;
  scheduledArrivalAt?: string;
  estimatedDepartureAt?: string;
  estimatedArrivalAt?: string;
  actualDepartureAt?: string;
  actualArrivalAt?: string;
  delayMinutes?: number;
  originTerminal?: string;
  destinationTerminal?: string;
  originGate?: string;
  destinationGate?: string;
  originPlatform?: string;
  destinationPlatform?: string;
  position?: {
    longitude: number;
    latitude: number;
    altitudeMeters?: number;
    speedKmh?: number;
    heading?: number;
    observedAt: string;
  };
};

export type JourneyPlace = {
  code: string;
  name: string;
  city: string;
  coordinate: [number, number];
  kind: "airport" | "station" | "port" | "place";
};

export type JourneySegment = {
  id: string;
  mode: JourneyMode;
  service: string;
  title: string;
  origin: JourneyPlace;
  destination: JourneyPlace;
  date: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  distanceKm: number;
  status: JourneyStatus;
  note: string;
  progress: number;
  operational?: JourneyOperationalData;
};

export const MODE_META: Record<
  JourneyMode,
  { label: string; shortLabel: string; color: string; surface: string }
> = {
  flight: {
    label: "飞机",
    shortLabel: "飞行",
    color: "#0a84ff",
    surface: "#102b51",
  },
  train: {
    label: "火车",
    shortLabel: "铁路",
    color: "#bf5af2",
    surface: "#351d47",
  },
  car: {
    label: "汽车",
    shortLabel: "公路",
    color: "#ff453a",
    surface: "#4b201d",
  },
  ferry: {
    label: "轮船",
    shortLabel: "水路",
    color: "#32ade6",
    surface: "#143747",
  },
};

export const JOURNEY_PLACES: JourneyPlace[] = [
  {
    code: "ASK",
    name: "浅草寺",
    city: "东京",
    coordinate: [139.7967, 35.7148],
    kind: "place",
  },
  {
    code: "TWR",
    name: "东京铁塔",
    city: "东京",
    coordinate: [139.7454, 35.6586],
    kind: "place",
  },
  {
    code: "FSI",
    name: "伏见稻荷大社",
    city: "京都",
    coordinate: [135.7727, 34.9671],
    kind: "place",
  },
  {
    code: "CHU",
    name: "地中美术馆",
    city: "直岛",
    coordinate: [133.9951, 34.4493],
    kind: "place",
  },
  {
    code: "HKG",
    name: "香港国际机场 · T1",
    city: "香港",
    coordinate: [113.9185, 22.308],
    kind: "airport",
  },
  {
    code: "HND",
    name: "羽田机场 · T3",
    city: "东京",
    coordinate: [139.7798, 35.5494],
    kind: "airport",
  },
  {
    code: "TYO",
    name: "东京站 · 丸之内口",
    city: "东京",
    coordinate: [139.7671, 35.6812],
    kind: "station",
  },
  {
    code: "KYO",
    name: "京都站 · 八条口",
    city: "京都",
    coordinate: [135.7588, 34.9858],
    kind: "station",
  },
  {
    code: "UNO",
    name: "宇野港 · 1号码头",
    city: "宇野",
    coordinate: [133.9538, 34.491],
    kind: "port",
  },
  {
    code: "NAO",
    name: "宫浦港 · 直岛",
    city: "直岛",
    coordinate: [133.972, 34.4563],
    kind: "port",
  },
];

const place = (code: string): JourneyPlace => {
  const journeyPlace = JOURNEY_PLACES.find((item) => item.code === code);
  if (journeyPlace) return journeyPlace;
  const airport = airportByCode(code);
  if (airport) {
    return {
      code: airport.code,
      name: airport.name,
      city: airport.city,
      coordinate: airport.coordinate,
      kind: "airport",
    };
  }
  return { code, name: code, city: code, coordinate: [0, 0], kind: "place" };
};

export const INITIAL_JOURNEY_SEGMENTS: JourneySegment[] = [
  {
    id: "journey-hkg-hnd",
    mode: "flight",
    service: "CX548",
    title: "飞往东京",
    origin: place("HKG"),
    destination: place("HND"),
    date: "9月18日 · 周五",
    departure: "08:45",
    arrival: "14:00",
    durationMinutes: 255,
    distanceKm: 2888,
    status: "upcoming",
    note: "登机口 24 · 经济舱 32A",
    progress: 0,
    operational: {
      source: "calendar",
      sourceLabel: "已保存的行程计划",
      quality: "planned",
      realtime: false,
      statusText: "计划中",
      provider: "Cathay Pacific",
      equipment: "Airbus A350",
      scheduledDepartureAt: "2026-09-18T08:45:00+08:00",
      scheduledArrivalAt: "2026-09-18T14:00:00+09:00",
      originTerminal: "T1",
      originGate: "24",
      destinationTerminal: "T3",
    },
  },
  {
    id: "journey-hnd-tyo",
    mode: "car",
    service: "专车",
    title: "前往东京站",
    origin: place("HND"),
    destination: place("TYO"),
    date: "9月18日 · 周五",
    departure: "14:25",
    arrival: "15:10",
    durationMinutes: 45,
    distanceKm: 21,
    status: "upcoming",
    note: "司机将在 T3 到达层等候",
    progress: 0,
  },
  {
    id: "journey-tyo-kyo",
    mode: "train",
    service: "NOZOMI 215",
    title: "东海道新干线",
    origin: place("TYO"),
    destination: place("KYO"),
    date: "9月20日 · 周日",
    departure: "09:10",
    arrival: "11:22",
    durationMinutes: 132,
    distanceKm: 476,
    status: "upcoming",
    note: "14号站台 · 7号车厢 12A",
    progress: 0,
    operational: {
      source: "transitous",
      sourceLabel: "Transitous / JR 时刻表",
      quality: "verified-schedule",
      realtime: false,
      statusText: "计划时刻",
      provider: "JR",
      scheduledDepartureAt: "2026-09-20T09:10:00+09:00",
      scheduledArrivalAt: "2026-09-20T11:22:00+09:00",
      originPlatform: "14",
      destinationPlatform: "12",
    },
  },
  {
    id: "journey-kyo-uno",
    mode: "train",
    service: "JR 快速",
    title: "京都到宇野港",
    origin: place("KYO"),
    destination: place("UNO"),
    date: "9月23日 · 周三",
    departure: "07:12",
    arrival: "10:20",
    durationMinutes: 188,
    distanceKm: 228,
    status: "upcoming",
    note: "冈山站换乘一次",
    progress: 0,
  },
  {
    id: "journey-uno-nao",
    mode: "ferry",
    service: "四国汽船",
    title: "濑户内海航线",
    origin: place("UNO"),
    destination: place("NAO"),
    date: "9月23日 · 周三",
    departure: "10:40",
    arrival: "11:00",
    durationMinutes: 20,
    distanceKm: 6,
    status: "upcoming",
    note: "1号码头 · 建议提前 15 分钟登船",
    progress: 0,
  },
];

export function journeyStats(segments: JourneySegment[]) {
  const modes = new Set(segments.map((segment) => segment.mode));
  const places = new Set(
    segments.flatMap((segment) => [
      segment.origin.code,
      segment.destination.code,
    ]),
  );
  const cities = new Set(
    segments.flatMap((segment) => [
      segment.origin.city,
      segment.destination.city,
    ]),
  );
  return {
    segments: segments.length,
    modes: modes.size,
    places: places.size,
    cities: cities.size,
    distanceKm: segments.reduce((sum, segment) => sum + segment.distanceKm, 0),
    durationMinutes: segments.reduce(
      (sum, segment) => sum + segment.durationMinutes,
      0,
    ),
    completed: segments.filter((segment) => segment.status === "complete")
      .length,
  };
}

export function formatJourneyDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}小时${rest ? `${rest}分` : ""}` : `${rest}分钟`;
}

export function createJourneySegment(input: {
  mode: JourneyMode;
  from: string;
  to: string;
  date: string;
  departure?: string;
  note?: string;
}) {
  return createJourneySegmentBetween({
    ...input,
    origin: place(input.from),
    destination: place(input.to),
  });
}

export function createJourneySegmentBetween(input: {
  mode: JourneyMode;
  origin: JourneyPlace;
  destination: JourneyPlace;
  date: string;
  departure?: string;
  note?: string;
  title?: string;
}) {
  const { origin, destination } = input;
  const distanceKm = Math.max(
    3,
    Math.round(haversineKm(origin.coordinate, destination.coordinate)),
  );
  const speed = { flight: 780, train: 235, car: 72, ferry: 32 }[input.mode];
  const transfer = { flight: 45, train: 8, car: 4, ferry: 8 }[input.mode];
  const durationMinutes = Math.max(
    12,
    Math.round((distanceKm / speed) * 60 + transfer),
  );
  const departure = input.departure || "09:00";
  return {
    id: `journey-${input.mode}-${Date.now()}`,
    mode: input.mode,
    service: defaultService(input.mode, distanceKm),
    title: input.title?.trim() || `${origin.city} → ${destination.city}`,
    origin,
    destination,
    date: dateLabel(input.date),
    departure,
    arrival: addMinutes(departure, durationMinutes),
    durationMinutes,
    distanceKm,
    status: "upcoming" as JourneyStatus,
    note:
      input.note?.trim() || `${MODE_META[input.mode].label}行程 · 已加入计划`,
    progress: 0,
    operational: {
      source: "manual",
      sourceLabel: "手动计划",
      quality: "manual",
      realtime: false,
      statusText: "计划时刻",
      scheduledDepartureAt: toLocalIso(input.date, departure),
      scheduledArrivalAt: toLocalIso(input.date, addMinutes(departure, durationMinutes)),
    },
  } satisfies JourneySegment;
}

export function segmentFromFlight(flight: Flight): JourneySegment {
  return {
    id: `journey-${flight.id}`,
    mode: "flight",
    service: flight.number,
    title: `${flight.from} 飞往 ${flight.to}`,
    origin: place(flight.from),
    destination: place(flight.to),
    date: flight.date,
    departure: flight.departure,
    arrival: flight.arrival,
    durationMinutes: flight.durationMinutes,
    distanceKm: flight.distanceKm,
    status:
      flight.status === "Landed"
        ? "complete"
        : flight.status === "On Time" || flight.status === "En Route"
          ? "active"
          : "upcoming",
    note: `${flight.airline} · ${flight.aircraftFamily} · 座位 ${flight.seat}`,
    progress:
      flight.status === "Landed" ? 1 : flight.status === "On Time" || flight.status === "En Route" ? 0.52 : 0,
    operational: {
      source: "manual",
      sourceLabel: "已保存的航班计划",
      quality: "planned",
      realtime: false,
      statusText: flight.status,
      provider: flight.airline,
      equipment: flight.aircraftFamily,
      delayMinutes: flight.delayMinutes,
    },
  };
}

function toLocalIso(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return undefined;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function defaultService(mode: JourneyMode, distance: number) {
  if (mode === "flight") return `FE${String(100 + (distance % 900))}`;
  if (mode === "train") return `JR ${String(10 + (distance % 80))}`;
  if (mode === "ferry") return "濑户内渡轮";
  return "自驾路线";
}

function dateLabel(value: string) {
  if (!value) return "日期待定";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitude = radians(b[1] - a[1]);
  const longitude = radians(b[0] - a[0]);
  const aLat = radians(a[1]);
  const bLat = radians(b[1]);
  const value =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(aLat) * Math.cos(bLat) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
