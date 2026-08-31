import { airportByCode, type Flight } from "../../../flightyData";
import type { JourneyPlace, JourneySegment } from "../../../journeyData";

type AdsbDbAirport = {
  iata_code?: string;
  icao_code?: string;
  latitude?: number;
  longitude?: number;
  municipality?: string;
  name?: string;
};

type AdsbDbRoute = {
  callsign?: string;
  callsign_icao?: string | null;
  callsign_iata?: string | null;
  airline?: { name?: string; icao?: string; iata?: string | null } | null;
  origin?: AdsbDbAirport;
  destination?: AdsbDbAirport;
};

type AdsbLiveAircraft = {
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  track?: number;
  seen?: number;
  t?: string;
  r?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const number = (url.searchParams.get("number") ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const date = url.searchParams.get("date") ?? "";
  const departure = url.searchParams.get("departure") ?? "09:00";

  if (!/^[A-Z0-9]{3,8}$/.test(number)) {
    return Response.json({ error: "请输入有效航班号，例如 CX548" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(departure)) {
    return Response.json({ error: "请选择出发日期和计划时间" }, { status: 400 });
  }

  try {
    const routeResponse = await fetch(
      `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(number)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(9_000) },
    );
    if (routeResponse.status === 404) {
      return Response.json(
        { error: "没有查到这个航班号的已核验航线，请改用起终点手动添加" },
        { status: 404 },
      );
    }
    if (!routeResponse.ok) throw new Error(`adsbdb ${routeResponse.status}`);
    const routePayload = (await routeResponse.json()) as {
      response?: { flightroute?: AdsbDbRoute } | string;
    };
    const route = typeof routePayload.response === "object"
      ? routePayload.response.flightroute
      : undefined;
    if (!route?.origin || !route.destination) {
      return Response.json({ error: "航线数据不完整，请稍后再试" }, { status: 502 });
    }

    const origin = journeyPlace(route.origin);
    const destination = journeyPlace(route.destination);
    const distanceKm = Math.max(1, Math.round(haversineKm(origin.coordinate, destination.coordinate)));
    const durationMinutes = Math.max(55, Math.round(distanceKm / 820 * 60 + 45));
    const arrival = addMinutes(departure, durationMinutes);
    const callsign = route.callsign_icao || route.callsign_iata || route.callsign || number;
    const liveAircraft = date === new Date().toISOString().slice(0, 10)
      ? await lookupLiveAircraft(callsign)
      : null;
    const live = Boolean(liveAircraft && finite(liveAircraft.lat) && finite(liveAircraft.lon));
    const provider = route.airline?.name || route.airline?.iata || "已核验承运方";
    const equipment = liveAircraft?.t || liveAircraft?.r || "机型待承运方确认";
    const observedAt = liveAircraft
      ? new Date(Date.now() - Math.max(0, Number(liveAircraft.seen) || 0) * 1000).toISOString()
      : undefined;
    const progress = liveAircraft && finite(liveAircraft.lat) && finite(liveAircraft.lon)
      ? routeProgress(origin.coordinate, destination.coordinate, [liveAircraft.lon!, liveAircraft.lat!])
      : 0;

    const flight: Flight = {
      id: `verified-${number}-${date}-${Date.now()}`,
      number: route.callsign_iata || number,
      airline: provider,
      from: origin.code,
      to: destination.code,
      departure,
      arrival,
      date: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      aircraft: liveAircraft?.r || "待确认",
      aircraftFamily: equipment,
      seatClass: "Economy",
      seat: "待填写",
      durationMinutes,
      distanceKm,
      delayMinutes: 0,
      status: live ? "En Route" : "Scheduled",
    };

    const segment: JourneySegment = {
      id: `journey-${flight.id}`,
      mode: "flight",
      service: flight.number,
      title: `${origin.city}飞往${destination.city}`,
      origin,
      destination,
      date: new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "short",
      }),
      departure,
      arrival,
      durationMinutes,
      distanceKm,
      status: live ? "active" : "upcoming",
      note: live
        ? `${provider} · ADS-B 实时位置已连接`
        : `${provider} · 航线已核验，计划时刻由你填写`,
      progress,
      operational: {
        source: live ? "adsb.lol" : "adsbdb",
        sourceLabel: live ? "ADS-B 实时位置 + ADSBDB 航线" : "ADSBDB 已核验航线",
        quality: live ? "realtime" : "verified-route",
        fetchedAt: new Date().toISOString(),
        realtime: live,
        statusText: live ? "飞行中" : "航线已核验 · 时刻待确认",
        provider,
        equipment,
        scheduledDepartureAt: `${date}T${departure}:00`,
        scheduledArrivalAt: `${date}T${arrival}:00`,
        position: live && observedAt
          ? {
              longitude: liveAircraft!.lon!,
              latitude: liveAircraft!.lat!,
              altitudeMeters: altitudeMeters(liveAircraft),
              speedKmh: finite(liveAircraft!.gs) ? Math.round(liveAircraft!.gs! * 1.852) : undefined,
              heading: finite(liveAircraft!.track) ? liveAircraft!.track : undefined,
              observedAt,
            }
          : undefined,
      },
    };

    return Response.json({
      flight,
      segment,
      routeVerified: true,
      live,
      message: live
        ? "已核验航线并连接 ADS-B 实时位置"
        : "已核验真实航线；计划时间由你填写，暂无实时位置",
    }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Verified flight lookup failed", error);
    return Response.json({ error: "真实航班数据暂时不可用，请稍后再试" }, { status: 502 });
  }
}

async function lookupLiveAircraft(callsign: string) {
  try {
    const response = await fetch(
      `https://api.adsb.lol/v2/callsign/${encodeURIComponent(callsign.trim())}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(7_000) },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { ac?: AdsbLiveAircraft[] };
    return payload.ac?.find((item) => item.flight?.trim() === callsign.trim()) ?? payload.ac?.[0] ?? null;
  } catch {
    return null;
  }
}

function journeyPlace(value: AdsbDbAirport): JourneyPlace {
  const code = value.iata_code || value.icao_code || "—";
  const known = airportByCode(code);
  if (known) {
    return {
      code: known.code,
      name: known.name,
      city: known.city,
      coordinate: known.coordinate,
      kind: "airport",
    };
  }
  return {
    code,
    name: value.name || code,
    city: value.municipality || value.name || code,
    coordinate: [Number(value.longitude) || 0, Number(value.latitude) || 0],
    kind: "airport",
  };
}

function routeProgress(origin: [number, number], destination: [number, number], current: [number, number]) {
  const total = haversineKm(origin, destination);
  if (!total) return 0;
  const covered = haversineKm(origin, current);
  const remaining = haversineKm(current, destination);
  const ratio = covered / Math.max(total, covered + remaining);
  return Math.min(0.98, Math.max(0.02, ratio));
}

function altitudeMeters(aircraft: AdsbLiveAircraft) {
  const feet = typeof aircraft.alt_geom === "number"
    ? aircraft.alt_geom
    : typeof aircraft.alt_baro === "number"
      ? aircraft.alt_baro
      : undefined;
  return feet === undefined ? undefined : Math.round(feet * 0.3048);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
