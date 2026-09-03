import type { JourneyPlace } from "./journeyData";

export type AirportCatalogEntry = JourneyPlace & {
  icao: string;
  country: string;
  continent: string;
  minZoom: number;
};
type AirportRow = [string, string, string, string, string, string, number, number, number];
let catalog: Promise<AirportCatalogEntry[]> | undefined;

export function loadAirportCatalog(): Promise<AirportCatalogEntry[]> {
  if (!catalog) catalog = fetch("/data/airports.json")
    .then(response => { if (!response.ok) throw new Error("Airport catalog unavailable"); return response.json(); })
    .then(data => (data as { entries: AirportRow[] }).entries.map(([code, icao, name, city, country, continent, longitude, latitude, minZoom]) => ({
      code, icao, name, city, country, continent, minZoom, kind: "airport" as const,
      coordinate: [longitude, latitude] as [number, number],
    })))
    .catch(error => { catalog = undefined; throw error; });
  return catalog;
}

export function matchAirportCatalog(entries: AirportCatalogEntry[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  return entries.map(airport => {
    const code = airport.code.toLocaleLowerCase(), icao = airport.icao.toLocaleLowerCase();
    const name = `${airport.name} ${airport.city} ${airport.country}`.toLocaleLowerCase();
    const score = code === normalized || icao === normalized ? 100 : name.startsWith(normalized) ? 30 : name.includes(normalized) ? 10 : 0;
    return { airport, score: score - airport.minZoom };
  }).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map(hit => hit.airport);
}
