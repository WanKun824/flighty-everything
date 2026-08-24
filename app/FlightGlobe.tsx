"use client";

import { useEffect, useRef, useState } from "react";
import { AIRPORTS, airportByCode } from "./flightyData";
import type { WeatherMode } from "./flightyStorage";
import type { JourneySegment } from "./journeyData";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

type Props = {
  airportsVisible: boolean;
  selectedAirport: string | null;
  weatherMode: WeatherMode;
  resetToken: number;
  onAirportSelect: (code: string) => void;
  onWeatherError: (message: string) => void;
  journeySegments?: JourneySegment[];
  selectedJourneySegmentId?: string | null;
  onJourneySegmentSelect?: (id: string) => void;
};

type RadarResponse = {
  host?: string;
  radar?: { past?: Array<{ path?: string }> };
};

export default function FlightGlobe({
  airportsVisible,
  selectedAirport,
  weatherMode,
  resetToken,
  onAirportSelect,
  onWeatherError,
  journeySegments = [],
  selectedJourneySegmentId = null,
  onJourneySegmentSelect,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const callbacksRef = useRef({
    onAirportSelect,
    onWeatherError,
    onJourneySegmentSelect,
  });
  const [loaded, setLoaded] = useState(false);
  const [radarUpdated, setRadarUpdated] = useState<string | null>(null);

  useEffect(() => {
    callbacksRef.current = {
      onAirportSelect,
      onWeatherError,
      onJourneySegmentSelect,
    };
  }, [onAirportSelect, onWeatherError, onJourneySegmentSelect]);

  useEffect(() => {
    let disposed = false;
    let instance: import("mapbox-gl").Map | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !hostRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: hostRef.current,
        style: "mapbox://styles/mapbox/standard-satellite",
        projection: "globe",
        center: [126, 27],
        zoom: 2.05,
        pitch: 0,
        bearing: -8,
        antialias: true,
        attributionControl: false,
      });
      instance = map;
      mapRef.current = map;
      map.on("style.load", () => {
        try {
          map.setConfigProperty("basemap", "lightPreset", "night");
          map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
          map.setConfigProperty("basemap", "showTransitLabels", false);
        } catch {
          /* Keep the satellite style defaults when a style option is unavailable. */
        }
        map.setFog({
          color: "rgb(5, 9, 18)",
          "high-color": "rgb(15, 28, 52)",
          "space-color": "rgb(0, 0, 2)",
          "horizon-blend": 0.08,
          "star-intensity": 0.72,
        });
        map.addSource("flighty-airports", {
          type: "geojson",
          data: airportFeatures(selectedAirport),
        });
        map.addSource("flighty-journey-lines", {
          type: "geojson",
          data: journeyLineFeatures(journeySegments, selectedJourneySegmentId),
        });
        map.addSource("flighty-journey-stops", {
          type: "geojson",
          data: journeyStopFeatures(journeySegments, selectedJourneySegmentId),
        });
        map.addLayer({
          id: "flighty-journey-glow",
          type: "line",
          source: "flighty-journey-lines",
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["case", ["get", "selected"], 10, 7],
            "line-opacity": 0.16,
            "line-blur": 5,
          },
        });
        map.addLayer({
          id: "flighty-journey-routes",
          type: "line",
          source: "flighty-journey-lines",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["case", ["get", "selected"], 3.5, 2.2],
            "line-opacity": ["case", ["get", "selected"], 1, 0.72],
            "line-dasharray": [2, 1.6],
          },
        });
        map.addLayer({
          id: "flighty-journey-stop-glow",
          type: "circle",
          source: "flighty-journey-stops",
          paint: {
            "circle-radius": ["case", ["get", "selected"], 13, 9],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.18,
            "circle-blur": 0.45,
          },
        });
        map.addLayer({
          id: "flighty-journey-stop-dots",
          type: "circle",
          source: "flighty-journey-stops",
          paint: {
            "circle-radius": ["case", ["get", "selected"], 6, 4],
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.4,
          },
        });
        map.addLayer({
          id: "flighty-airport-glow",
          type: "circle",
          source: "flighty-airports",
          layout: { visibility: airportsVisible ? "visible" : "none" },
          paint: {
            "circle-radius": ["case", ["get", "selected"], 15, 10],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.2,
            "circle-blur": 0.5,
          },
        });
        map.addLayer({
          id: "flighty-airport-dots",
          type: "circle",
          source: "flighty-airports",
          layout: { visibility: airportsVisible ? "visible" : "none" },
          paint: {
            "circle-radius": ["case", ["get", "selected"], 7, 5],
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.6,
          },
        });
        map.on("click", "flighty-airport-dots", (event) => {
          const feature = event.features?.[0] as
            { properties?: { code?: unknown } } | undefined;
          const code = feature?.properties?.code;
          if (typeof code === "string")
            callbacksRef.current.onAirportSelect(code);
        });
        map.on("mouseenter", "flighty-airport-dots", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "flighty-airport-dots", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("click", "flighty-journey-stop-dots", (event) => {
          const feature = event.features?.[0] as
            { properties?: { segmentId?: unknown } } | undefined;
          const segmentId = feature?.properties?.segmentId;
          if (typeof segmentId === "string")
            callbacksRef.current.onJourneySegmentSelect?.(segmentId);
        });
        map.on("mouseenter", "flighty-journey-stop-dots", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "flighty-journey-stop-dots", () => {
          map.getCanvas().style.cursor = "";
        });
        setLoaded(true);
      });
    });

    return () => {
      disposed = true;
      mapRef.current = null;
      instance?.remove();
    };
    // Map lifetime is intentionally tied only to the canvas lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !map.getLayer("flighty-airport-dots")) return;
    const visibility = airportsVisible ? "visible" : "none";
    map.setLayoutProperty("flighty-airport-glow", "visibility", visibility);
    map.setLayoutProperty("flighty-airport-dots", "visibility", visibility);
    (
      map.getSource("flighty-airports") as
        import("mapbox-gl").GeoJSONSource | undefined
    )?.setData(airportFeatures(selectedAirport));
  }, [airportsVisible, selectedAirport, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (
      map.getSource("flighty-journey-lines") as
        import("mapbox-gl").GeoJSONSource | undefined
    )?.setData(journeyLineFeatures(journeySegments, selectedJourneySegmentId));
    (
      map.getSource("flighty-journey-stops") as
        import("mapbox-gl").GeoJSONSource | undefined
    )?.setData(journeyStopFeatures(journeySegments, selectedJourneySegmentId));
  }, [journeySegments, selectedJourneySegmentId, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (!selectedAirport) return;
    const airport = airportByCode(selectedAirport);
    if (airport)
      map.flyTo({
        center: airport.coordinate,
        zoom: 8.4,
        pitch: 28,
        duration: 900,
        essential: true,
      });
  }, [selectedAirport, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selectedJourneySegmentId) return;
    const segment = journeySegments.find(
      (item) => item.id === selectedJourneySegmentId,
    );
    if (!segment) return;
    const [aLongitude, aLatitude] = segment.origin.coordinate;
    const [bLongitude, bLatitude] = segment.destination.coordinate;
    map.fitBounds(
      [
        [Math.min(aLongitude, bLongitude), Math.min(aLatitude, bLatitude)],
        [Math.max(aLongitude, bLongitude), Math.max(aLatitude, bLatitude)],
      ],
      { padding: 110, maxZoom: 7, duration: 850, essential: true },
    );
  }, [selectedJourneySegmentId, journeySegments, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.flyTo({
      center: [126, 27],
      zoom: weatherMode === "none" ? 2.05 : 1.85,
      pitch: 0,
      bearing: -8,
      duration: 820,
      essential: true,
    });
  }, [resetToken, loaded, weatherMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (weatherMode === "none") {
      if (map.getLayer("flighty-radar"))
        map.setLayoutProperty("flighty-radar", "visibility", "none");
      return;
    }

    let cancelled = false;
    const showRadar = async () => {
      try {
        const response = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json",
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Weather service is unavailable");
        const data = (await response.json()) as RadarResponse;
        const frame = data.radar?.past?.at(-1);
        if (!data.host || !frame?.path)
          throw new Error("No radar frame is available");
        if (cancelled || !mapRef.current) return;
        const currentMap = mapRef.current;
        const tiles = [`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`];
        if (currentMap.getLayer("flighty-radar"))
          currentMap.removeLayer("flighty-radar");
        if (currentMap.getSource("flighty-radar"))
          currentMap.removeSource("flighty-radar");
        currentMap.addSource("flighty-radar", {
          type: "raster",
          tiles,
          tileSize: 256,
          maxzoom: 7,
          attribution: "Weather data by RainViewer",
        });
        currentMap.addLayer({
          id: "flighty-radar",
          type: "raster",
          source: "flighty-radar",
          paint: {
            "raster-opacity": weatherMode === "us" ? 0.83 : 0.72,
            "raster-fade-duration": 180,
          },
        });
        currentMap.flyTo({
          center: weatherMode === "us" ? [-98, 38] : [118, 25],
          zoom: weatherMode === "us" ? 2.75 : 1.85,
          pitch: 0,
          bearing: 0,
          duration: 900,
          essential: true,
        });
        setRadarUpdated(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch (error) {
        if (!cancelled)
          callbacksRef.current.onWeatherError(
            error instanceof Error
              ? error.message
              : "Weather layer could not load",
          );
      }
    };
    void showRadar();
    return () => {
      cancelled = true;
    };
  }, [weatherMode, loaded]);

  return (
    <div
      className={`flight-globe ${loaded ? "loaded" : ""} ${weatherMode !== "none" ? "weather-on" : ""}`}
    >
      <div ref={hostRef} className="flight-globe-map" />
      <div className="globe-loading">Loading live globe…</div>
      {weatherMode !== "none" && (
        <div className="weather-legend">
          <span>Rain</span>
          <i className="green" />
          <i className="yellow" />
          <i className="orange" />
          <i className="red" />
          <i className="pink" />
          <span>Snow</span>
          <i className="snow-1" />
          <i className="snow-2" />
          <i className="snow-3" />
          <i className="snow-4" />
          {radarUpdated && <small>Updated {radarUpdated}</small>}
        </div>
      )}
      <a
        className="weather-credit"
        href="https://www.rainviewer.com/"
        target="_blank"
        rel="noreferrer"
      >
        Weather by RainViewer
      </a>
    </div>
  );
}

function airportFeatures(selectedAirport: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: AIRPORTS.map((airport) => ({
      type: "Feature" as const,
      properties: {
        code: airport.code,
        selected: airport.code === selectedAirport,
        color: airport.issue ? "#ff334b" : "#36d688",
      },
      geometry: { type: "Point" as const, coordinates: airport.coordinate },
    })),
  };
}

const journeyColor = {
  flight: "#0a84ff",
  train: "#bf5af2",
  car: "#ff453a",
  ferry: "#32ade6",
} as const;

function journeyLineFeatures(
  segments: JourneySegment[],
  selectedId: string | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: segments.map((segment) => ({
      type: "Feature" as const,
      properties: {
        segmentId: segment.id,
        color: journeyColor[segment.mode],
        selected: segment.id === selectedId,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: greatCircleCoordinates(
          segment.origin.coordinate,
          segment.destination.coordinate,
        ),
      },
    })),
  };
}

function journeyStopFeatures(
  segments: JourneySegment[],
  selectedId: string | null,
) {
  const features = segments.flatMap((segment) =>
    [segment.origin, segment.destination].map((place) => ({
      type: "Feature" as const,
      properties: {
        segmentId: segment.id,
        code: place.code,
        color: journeyColor[segment.mode],
        selected: segment.id === selectedId,
      },
      geometry: { type: "Point" as const, coordinates: place.coordinate },
    })),
  );
  return { type: "FeatureCollection" as const, features };
}

function greatCircleCoordinates(a: [number, number], b: [number, number]) {
  const points: [number, number][] = [];
  const radians = (value: number) => (value * Math.PI) / 180;
  const degrees = (value: number) => (value * 180) / Math.PI;
  const aVector = vector(radians(a[0]), radians(a[1]));
  const bVector = vector(radians(b[0]), radians(b[1]));
  const angle = Math.acos(
    Math.min(
      1,
      Math.max(
        -1,
        aVector[0] * bVector[0] +
          aVector[1] * bVector[1] +
          aVector[2] * bVector[2],
      ),
    ),
  );
  for (let index = 0; index <= 36; index += 1) {
    const ratio = index / 36;
    const sinAngle = Math.sin(angle);
    const left =
      angle < 1e-6 ? 1 - ratio : Math.sin((1 - ratio) * angle) / sinAngle;
    const right = angle < 1e-6 ? ratio : Math.sin(ratio * angle) / sinAngle;
    const x = left * aVector[0] + right * bVector[0];
    const y = left * aVector[1] + right * bVector[1];
    const z = left * aVector[2] + right * bVector[2];
    points.push([
      degrees(Math.atan2(y, x)),
      degrees(Math.atan2(z, Math.hypot(x, y))),
    ]);
  }
  return points;
}

function vector(longitude: number, latitude: number): [number, number, number] {
  return [
    Math.cos(latitude) * Math.cos(longitude),
    Math.cos(latitude) * Math.sin(longitude),
    Math.sin(latitude),
  ];
}
