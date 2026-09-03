import type { Flight } from "./flightyData";
import type { JourneySegment } from "./journeyData";

type TransportLookup = (kind: "flight" | "rail", params: URLSearchParams, signal?: AbortSignal) => Promise<Response>;
let nativeTransportLookup: TransportLookup | null = null;

/** The bundled client supplies a native HTTP adapter; web keeps its same-origin API. */
export function configureNativeTransportLookup(lookup: TransportLookup) {
  nativeTransportLookup = lookup;
}

function requestTransport(kind: "flight" | "rail", params: URLSearchParams, signal?: AbortSignal) {
  if (nativeTransportLookup) return nativeTransportLookup(kind, params, signal);
  return fetch(`/api/transport/${kind}?${params}`, { signal, headers: { Accept: "application/json" } });
}

export type VerifiedFlightResult = {
  flight: Flight;
  segment: JourneySegment;
  routeVerified: true;
  live: boolean;
  message: string;
};

export type VerifiedRailResult = {
  segments: JourneySegment[];
  attribution: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "交通数据服务暂时不可用");
  }
  return payload;
}

export async function lookupVerifiedFlight(input: {
  number: string;
  date: string;
  departure: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    number: input.number,
    date: input.date,
    departure: input.departure,
  });
  const response = await requestTransport("flight", params, input.signal);
  return readJson<VerifiedFlightResult>(response);
}

export async function searchVerifiedRail(input: {
  from: [number, number];
  to: [number, number];
  departAt: string;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    fromLon: String(input.from[0]),
    fromLat: String(input.from[1]),
    toLon: String(input.to[0]),
    toLat: String(input.to[1]),
    departAt: input.departAt,
  });
  const response = await requestTransport("rail", params, input.signal);
  return readJson<VerifiedRailResult>(response);
}

export function localDateTimeIso(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? `${date}T${time}:00` : parsed.toISOString();
}
