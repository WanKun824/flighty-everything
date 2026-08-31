import type { JourneyPlace, JourneySegment, JourneyStatus } from "../../../journeyData";

type TransitPlace = {
  name?: string;
  stopId?: string;
  lat?: number;
  lon?: number;
  tz?: string;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  track?: string;
  scheduledTrack?: string;
  cancelled?: boolean;
};

type TransitLeg = {
  mode?: string;
  from?: TransitPlace;
  to?: TransitPlace;
  startTime?: string;
  endTime?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  duration?: number;
  realTime?: boolean;
  scheduled?: boolean;
  cancelled?: boolean;
  agencyName?: string;
  routeShortName?: string;
  displayName?: string;
  tripShortName?: string;
  headsign?: string;
  tripId?: string;
  distance?: number;
};

type TransitItinerary = {
  id?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  transfers?: number;
  legs?: TransitLeg[];
};

const RAIL_MODES = new Set([
  "RAIL",
  "HIGHSPEED_RAIL",
  "LONG_DISTANCE",
  "NIGHT_RAIL",
  "REGIONAL_FAST_RAIL",
  "REGIONAL_RAIL",
  "SUBURBAN",
  "SUBWAY",
]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const fromLat = numberParam(requestUrl, "fromLat", -90, 90);
  const fromLon = numberParam(requestUrl, "fromLon", -180, 180);
  const toLat = numberParam(requestUrl, "toLat", -90, 90);
  const toLon = numberParam(requestUrl, "toLon", -180, 180);
  const departAt = requestUrl.searchParams.get("departAt") ?? "";

  if ([fromLat, fromLon, toLat, toLon].some((value) => value === null)) {
    return Response.json({ error: "起点或终点坐标无效" }, { status: 400 });
  }
  if (!departAt || Number.isNaN(new Date(departAt).getTime())) {
    return Response.json({ error: "请选择有效的列车出发时间" }, { status: 400 });
  }

  const params = new URLSearchParams({
    fromPlace: `${fromLat},${fromLon}`,
    toPlace: `${toLat},${toLon}`,
    time: new Date(departAt).toISOString(),
    transitModes: "RAIL,HIGHSPEED_RAIL,LONG_DISTANCE,NIGHT_RAIL,REGIONAL_FAST_RAIL,REGIONAL_RAIL,SUBURBAN,SUBWAY",
    directModes: "",
    maxTransfers: "2",
    numItineraries: "4",
    maxItineraries: "6",
    detailedLegs: "false",
    detailedTransfers: "false",
  });

  try {
    const response = await fetch(`https://api.transitous.org/api/v6/plan?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "flighty-everything/0.3 (+https://transitous.org)",
      },
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) {
      if (response.status >= 500) {
        return Response.json(
          { error: "该日期暂时没有可用的公开列车时刻，请换一个时间或手动添加" },
          { status: 503 },
        );
      }
      throw new Error(`Transitous ${response.status}`);
    }
    const payload = (await response.json()) as { itineraries?: TransitItinerary[] };
    const segments = (payload.itineraries ?? [])
      .map((itinerary, index) => itinerarySegment(itinerary, index))
      .filter((segment): segment is JourneySegment => Boolean(segment))
      .slice(0, 4);

    if (!segments.length) {
      return Response.json(
        { error: "这两个地点之间没有查到公开列车班次" },
        { status: 404 },
      );
    }
    return Response.json({
      segments,
      attribution: "时刻表与实时标注由 Transitous 及其公开数据源提供",
    }, {
      headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Verified rail lookup failed", error);
    return Response.json({ error: "真实列车时刻服务暂时不可用，请稍后再试" }, { status: 502 });
  }
}

function itinerarySegment(itinerary: TransitItinerary, index: number): JourneySegment | null {
  const railLegs = (itinerary.legs ?? []).filter((leg) => RAIL_MODES.has(leg.mode ?? ""));
  const first = railLegs[0];
  const last = railLegs.at(-1);
  if (!first?.from || !last?.to) return null;

  const departureAt = first.startTime || first.from.departure || first.scheduledStartTime || first.from.scheduledDeparture;
  const arrivalAt = last.endTime || last.to.arrival || last.scheduledEndTime || last.to.scheduledArrival;
  const scheduledDepartureAt = first.scheduledStartTime || first.from.scheduledDeparture || departureAt;
  const scheduledArrivalAt = last.scheduledEndTime || last.to.scheduledArrival || arrivalAt;
  if (!departureAt || !arrivalAt) return null;

  const origin = railPlace(first.from, "FROM");
  const destination = railPlace(last.to, "TO");
  const services = unique(railLegs.map((leg) => leg.displayName || leg.routeShortName || leg.tripShortName || "列车"));
  const providers = unique(railLegs.map((leg) => leg.agencyName || "铁路运营方"));
  const realtime = railLegs.some((leg) => leg.realTime);
  const cancelled = railLegs.some((leg) => leg.cancelled || leg.from?.cancelled || leg.to?.cancelled);
  const durationMinutes = Math.max(1, Math.round((new Date(arrivalAt).getTime() - new Date(departureAt).getTime()) / 60_000));
  const delayMinutes = scheduledDepartureAt
    ? Math.round((new Date(departureAt).getTime() - new Date(scheduledDepartureAt).getTime()) / 60_000)
    : 0;
  const now = Date.now();
  const start = new Date(departureAt).getTime();
  const end = new Date(arrivalAt).getTime();
  const status: JourneyStatus = cancelled || now >= end ? "complete" : now >= start ? "active" : "upcoming";
  const progress = status === "complete" ? 1 : status === "active"
    ? Math.min(0.98, Math.max(0.02, (now - start) / Math.max(1, end - start)))
    : 0;
  const originTimeZone = first.from.tz;
  const destinationTimeZone = last.to.tz;

  return {
    id: `journey-transitous-${Date.now()}-${index}`,
    mode: "train",
    service: services.join(" + "),
    title: `${origin.name}至${destination.name}`,
    origin,
    destination,
    date: formatDate(departureAt, originTimeZone),
    departure: formatTime(departureAt, originTimeZone),
    arrival: formatTime(arrivalAt, destinationTimeZone),
    durationMinutes,
    distanceKm: Math.max(1, Math.round(haversineKm(origin.coordinate, destination.coordinate))),
    status,
    note: `${providers.join(" · ")} · ${railLegs.length > 1 ? `${railLegs.length - 1} 次换乘` : "直达"}`,
    progress,
    operational: {
      source: "transitous",
      sourceLabel: "Transitous 公开时刻表",
      quality: realtime ? "realtime" : "verified-schedule",
      fetchedAt: new Date().toISOString(),
      realtime,
      statusText: cancelled ? "已取消" : realtime ? (delayMinutes > 0 ? `晚点 ${delayMinutes} 分钟` : "实时准点") : "计划时刻",
      provider: providers.join(" · "),
      scheduledDepartureAt,
      scheduledArrivalAt,
      estimatedDepartureAt: realtime ? departureAt : undefined,
      estimatedArrivalAt: realtime ? arrivalAt : undefined,
      delayMinutes,
      originPlatform: first.from.track || first.from.scheduledTrack,
      destinationPlatform: last.to.track || last.to.scheduledTrack,
    },
  };
}

function railPlace(place: TransitPlace, fallback: string): JourneyPlace {
  const code = stopCode(place.stopId) || fallback;
  return {
    code,
    name: place.name || code,
    city: place.name || code,
    coordinate: [Number(place.lon) || 0, Number(place.lat) || 0],
    kind: "station",
  };
}

function stopCode(stopId?: string) {
  if (!stopId) return "";
  const tail = stopId.split(/[\s:_-]/).filter(Boolean).at(-1) ?? "";
  return tail.slice(0, 8).toUpperCase();
}

function formatTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(value));
}

function formatDate(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone,
  }).format(new Date(value));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function numberParam(url: URL, key: string, min: number, max: number) {
  const value = Number(url.searchParams.get(key));
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitude = radians(b[1] - a[1]);
  const longitude = radians(b[0] - a[0]);
  const aLat = radians(a[1]);
  const bLat = radians(b[1]);
  const value = Math.sin(latitude / 2) ** 2
    + Math.cos(aLat) * Math.cos(bLat) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
