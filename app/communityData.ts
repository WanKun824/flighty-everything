import { INITIAL_JOURNEY_SEGMENTS, type JourneyMode, type JourneySegment } from "./journeyData";

export type CommunityJourney = JourneySegment & {
  communityId: string;
  creatorName: string;
  caption: string;
  likes: number;
  createdAt: string;
};

type CommunityRow = {
  id: string;
  creatorName: string;
  title: string;
  caption: string;
  mode: JourneyMode;
  service: string;
  originCode: string;
  originName: string;
  originCity: string;
  originLongitude: number;
  originLatitude: number;
  destinationCode: string;
  destinationName: string;
  destinationCity: string;
  destinationLongitude: number;
  destinationLatitude: number;
  date: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  note: string;
  likes: number;
  createdAt: string | number | Date;
};

export const FALLBACK_COMMUNITY: CommunityJourney[] = INITIAL_JOURNEY_SEGMENTS.slice(0, 4).map((segment, index) => ({
  ...segment,
  id: `fallback-${segment.id}`,
  communityId: `fallback-${index}`,
  creatorName: ["Mina", "Riku", "Noah", "Sora"][index],
  caption: ["第一次从云层上看到富士山。", "把转乘、座位和沿途的小店都放进一条路线。", "适合周末复刻的海岸路线。", "慢一点，才看见瀬户内海的颜色。"][index],
  likes: [284, 196, 143, 118][index],
  createdAt: new Date(Date.UTC(2026, 7, 24 - index)).toISOString(),
}));

export async function fetchCommunityJourneys() {
  const response = await fetch("/api/community/journeys", { cache: "no-store" });
  if (!response.ok) throw new Error("社区行程加载失败");
  const data = (await response.json()) as { journeys?: CommunityRow[] };
  return (data.journeys ?? []).map(rowToCommunityJourney);
}

export async function publishCommunityJourney(segment: JourneySegment, creatorName: string, caption: string) {
  const response = await fetch("/api/community/journeys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...segment, creatorName, caption }),
  });
  const data = (await response.json()) as { journey?: CommunityRow; error?: string };
  if (!response.ok || !data.journey) throw new Error(data.error || "行程发布失败");
  return rowToCommunityJourney(data.journey);
}

export async function likeCommunityJourney(id: string) {
  const response = await fetch("/api/community/journeys", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const data = (await response.json()) as { journey?: CommunityRow; error?: string };
  if (!response.ok || !data.journey) throw new Error(data.error || "点赞失败");
  return rowToCommunityJourney(data.journey);
}

export function cloneCommunityJourney(journey: CommunityJourney): JourneySegment {
  return {
    id: `saved-${journey.communityId}-${Date.now()}`,
    mode: journey.mode,
    service: journey.service,
    title: journey.title,
    origin: journey.origin,
    destination: journey.destination,
    date: journey.date,
    departure: journey.departure,
    arrival: journey.arrival,
    durationMinutes: journey.durationMinutes,
    distanceKm: journey.distanceKm,
    status: "upcoming",
    note: journey.note,
    progress: 0,
  };
}

function rowToCommunityJourney(row: CommunityRow): CommunityJourney {
  const originCoordinate: [number, number] = [row.originLongitude / 1_000_000, row.originLatitude / 1_000_000];
  const destinationCoordinate: [number, number] = [row.destinationLongitude / 1_000_000, row.destinationLatitude / 1_000_000];
  return {
    id: `map-${row.id}`,
    communityId: row.id,
    creatorName: row.creatorName,
    caption: row.caption,
    mode: row.mode,
    service: row.service,
    title: row.title,
    origin: {
      code: row.originCode,
      name: row.originName,
      city: row.originCity,
      coordinate: originCoordinate,
      kind: row.mode === "flight" ? "airport" : row.mode === "train" ? "station" : row.mode === "ferry" ? "port" : "place",
    },
    destination: {
      code: row.destinationCode,
      name: row.destinationName,
      city: row.destinationCity,
      coordinate: destinationCoordinate,
      kind: row.mode === "flight" ? "airport" : row.mode === "train" ? "station" : row.mode === "ferry" ? "port" : "place",
    },
    date: row.date,
    departure: row.departure,
    arrival: row.arrival,
    durationMinutes: row.durationMinutes,
    distanceKm: haversineKm(originCoordinate, destinationCoordinate),
    status: "upcoming",
    note: row.note,
    progress: 0,
    likes: row.likes,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function haversineKm(origin: [number, number], destination: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(destination[1] - origin[1]);
  const longitudeDelta = radians(destination[0] - origin[0]);
  const latitudeA = radians(origin[1]);
  const latitudeB = radians(destination[1]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}
