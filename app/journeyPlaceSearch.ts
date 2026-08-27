import { JOURNEY_PLACES, type JourneyPlace } from "./journeyData";
import { MAPBOX_ACCESS_TOKEN } from "./mapboxConfig";
import { minQueryLength, stopKindOf } from "./placeSearch";

export type JourneyPlaceSuggestion = {
  id: string;
  name: string;
  subtitle: string;
  kind: JourneyPlace["kind"];
  localPlace?: JourneyPlace;
};

type SearchBoxSuggestResponse = {
  suggestions?: Array<{
    mapbox_id?: string;
    name?: string;
    place_formatted?: string;
    feature_type?: string;
    poi_category?: string[];
  }>;
};

type SearchBoxRetrieveResponse = {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: {
      name?: string;
      feature_type?: string;
      full_address?: string;
      place_formatted?: string;
      poi_category?: string[];
      context?: {
        place?: { name?: string };
        locality?: { name?: string };
        region?: { name?: string };
      };
    };
  }>;
};

export async function searchJourneyPlaces(
  rawQuery: string,
  sessionToken: string,
  signal?: AbortSignal,
) {
  const query = rawQuery.trim();
  if (query.length < minQueryLength(query)) return [];
  const normalized = query.toLocaleLowerCase();
  const local: JourneyPlaceSuggestion[] = JOURNEY_PLACES
    .filter((place) => `${place.code} ${place.name} ${place.city}`.toLocaleLowerCase().includes(normalized))
    .slice(0, 4)
    .map((place) => ({
      id: `local:${place.code}`,
      name: place.name,
      subtitle: `${place.city} · ${place.code}`,
      kind: place.kind,
      localPlace: place,
    }));

  const parameters = new URLSearchParams({
    q: query,
    access_token: MAPBOX_ACCESS_TOKEN,
    session_token: sessionToken,
    language: "zh,en",
    limit: "7",
    types: "poi,address,place,locality,neighborhood",
  });
  const response = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/suggest?${parameters}`,
    { signal, cache: "no-store" },
  );
  if (!response.ok) return local;
  const payload = (await response.json()) as SearchBoxSuggestResponse;
  const remote = (payload.suggestions ?? [])
    .filter((suggestion) => suggestion.mapbox_id && suggestion.name)
    .map((suggestion): JourneyPlaceSuggestion => ({
      id: suggestion.mapbox_id as string,
      name: suggestion.name as string,
      subtitle: suggestion.place_formatted || "地图地点",
      kind: stopKindOf(
        suggestion.feature_type ?? "poi",
        suggestion.poi_category ?? [],
        suggestion.name ?? "",
      ),
    }));
  const seen = new Set<string>();
  return [...local, ...remote].filter((item) => {
    const key = `${item.name}|${item.subtitle}`.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

export async function retrieveJourneyPlace(
  suggestion: JourneyPlaceSuggestion,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<JourneyPlace | null> {
  if (suggestion.localPlace) return suggestion.localPlace;
  const parameters = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    session_token: sessionToken,
  });
  const response = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.id)}?${parameters}`,
    { signal, cache: "no-store" },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as SearchBoxRetrieveResponse;
  const feature = payload.features?.[0];
  const coordinate = feature?.geometry?.coordinates;
  if (!feature || !coordinate) return null;
  const properties = feature.properties ?? {};
  const name = properties.name || suggestion.name;
  const kind = stopKindOf(
    properties.feature_type ?? "poi",
    properties.poi_category ?? [],
    name,
  );
  const city = properties.context?.place?.name
    || properties.context?.locality?.name
    || properties.context?.region?.name
    || suggestion.subtitle.split(",")[0]
    || name;
  return {
    code: placeCode(name, kind),
    name,
    city,
    coordinate,
    kind,
  };
}

function placeCode(name: string, kind: JourneyPlace["kind"]) {
  const latin = name.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (latin.length >= 3) return latin.slice(0, 3);
  return { airport: "AIR", station: "STN", port: "PRT", place: "POI" }[kind];
}
