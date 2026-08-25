"use client";

import { useEffect, useRef, useState } from "react";
import { AIRPORTS, airportByCode } from "./flightyData";
import type { WeatherMode } from "./flightyStorage";
import type { JourneyMode, JourneySegment } from "./journeyData";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

export type BasemapMode = "satellite" | "streets" | "traffic";

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
  vehicleScale?: number;
  animationSpeed?: number;
  motionEnabled?: boolean;
};

type RadarResponse = {
  host?: string;
  radar?: { past?: Array<{ path?: string }> };
};

type LiveData = {
  airportsVisible: boolean;
  selectedAirport: string | null;
  journeySegments: JourneySegment[];
  selectedJourneySegmentId: string | null;
};

type AnimatedMarker = {
  marker: import("mapbox-gl").Marker;
  element: HTMLButtonElement;
  coordinates: [number, number][];
  segment: JourneySegment;
  phase: number;
};

const BASEMAP_LABELS: Array<{ id: BasemapMode; label: string }> = [
  { id: "satellite", label: "卫星" },
  { id: "streets", label: "街道" },
  { id: "traffic", label: "交通" },
];

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
  vehicleScale = 1,
  animationSpeed = 1,
  motionEnabled = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const basemapRef = useRef<BasemapMode>("satellite");
  const liveDataRef = useRef<LiveData>({
    airportsVisible,
    selectedAirport,
    journeySegments,
    selectedJourneySegmentId,
  });
  const callbacksRef = useRef({
    onAirportSelect,
    onWeatherError,
    onJourneySegmentSelect,
  });
  const [loaded, setLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [radarUpdated, setRadarUpdated] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapMode>("satellite");

  useEffect(() => {
    liveDataRef.current = {
      airportsVisible,
      selectedAirport,
      journeySegments,
      selectedJourneySegmentId,
    };
  }, [
    airportsVisible,
    selectedAirport,
    journeySegments,
    selectedJourneySegmentId,
  ]);

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
      mapboxRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: hostRef.current,
        style: styleUrl("satellite"),
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
        if (disposed) return;
        configureBasemap(map, basemapRef.current);
        installProductLayers(map, liveDataRef.current, basemapRef.current);
        setLoaded(true);
        setStyleRevision((value) => value + 1);
      });

      map.on("click", "flighty-airport-dots", (event) => {
        const feature = event.features?.[0] as
          | { properties?: { code?: unknown } }
          | undefined;
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
          | { properties?: { segmentId?: unknown } }
          | undefined;
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
    });

    return () => {
      disposed = true;
      mapRef.current = null;
      mapboxRef.current = null;
      instance?.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !map.getLayer("flighty-airport-dots")) return;
    const visibility = airportsVisible ? "visible" : "none";
    map.setLayoutProperty("flighty-airport-glow", "visibility", visibility);
    map.setLayoutProperty("flighty-airport-dots", "visibility", visibility);
    (
      map.getSource("flighty-airports") as
        | import("mapbox-gl").GeoJSONSource
        | undefined
    )?.setData(airportFeatures(selectedAirport));
  }, [airportsVisible, selectedAirport, loaded, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (
      map.getSource("flighty-journey-lines") as
        | import("mapbox-gl").GeoJSONSource
        | undefined
    )?.setData(journeyLineFeatures(journeySegments, selectedJourneySegmentId));
    (
      map.getSource("flighty-journey-stops") as
        | import("mapbox-gl").GeoJSONSource
        | undefined
    )?.setData(journeyStopFeatures(journeySegments, selectedJourneySegmentId));
  }, [journeySegments, selectedJourneySegmentId, loaded, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !loaded) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const markers: AnimatedMarker[] = journeySegments.map((segment, index) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `journey-vehicle-marker ${segment.mode} ${segment.id === selectedJourneySegmentId ? "selected" : ""}`;
      element.style.setProperty("--vehicle-size", `${32 * vehicleScale}px`);
      element.style.setProperty("--vehicle-selected-size", `${38 * vehicleScale}px`);
      element.style.setProperty("--vehicle-glyph-scale", String(vehicleScale));
      element.setAttribute(
        "aria-label",
        `${segment.title} · ${transportLabel(segment.mode)}正在路线中移动`,
      );
      const glyph = document.createElement("span");
      glyph.className = "journey-vehicle-glyph";
      element.appendChild(glyph);
      element.addEventListener("click", () =>
        callbacksRef.current.onJourneySegmentSelect?.(segment.id),
      );
      const coordinates = greatCircleCoordinates(
        segment.origin.coordinate,
        segment.destination.coordinate,
        96,
      );
      const marker = new mapboxgl.Marker({
        element,
        anchor: "center",
        rotationAlignment: "map",
        pitchAlignment: "map",
      })
        .setLngLat(coordinates[0])
        .addTo(map);
      return {
        marker,
        element,
        coordinates,
        segment,
        phase: index / Math.max(1, journeySegments.length),
      };
    });

    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      for (const item of markers) {
        const base = item.segment.status === "complete" ? 1 : item.segment.progress;
        const duration = animationDuration(item.segment.mode) / Math.max(0.25, animationSpeed);
        const moving = reduceMotion.matches || !motionEnabled
          ? base
          : item.segment.status === "complete"
            ? 1
            : (base + item.phase + (now - startedAt) / duration) % 1;
        const point = pointAlong(item.coordinates, moving);
        item.marker.setLngLat(point.coordinate);
        item.marker.setRotation(point.bearing);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      for (const item of markers) item.marker.remove();
    };
  }, [journeySegments, selectedJourneySegmentId, loaded, styleRevision, vehicleScale, animationSpeed, motionEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selectedAirport) return;
    const airport = airportByCode(selectedAirport);
    if (airport)
      map.flyTo({
        center: airport.coordinate,
        zoom: 8.4,
        pitch: 28,
        duration: 900,
        essential: true,
      });
  }, [selectedAirport, loaded, styleRevision]);

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
  }, [selectedJourneySegmentId, journeySegments, loaded, styleRevision]);

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
  }, [resetToken, loaded, weatherMode, styleRevision]);

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
        if (!response.ok) throw new Error("天气服务暂时不可用");
        const data = (await response.json()) as RadarResponse;
        const radarFrame = data.radar?.past?.at(-1);
        if (!data.host || !radarFrame?.path)
          throw new Error("当前没有可用的雷达画面");
        if (cancelled || !mapRef.current) return;
        const currentMap = mapRef.current;
        const tiles = [
          `${data.host}${radarFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
        ];
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
          slot: "top",
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
            error instanceof Error ? error.message : "天气图层无法加载",
          );
      }
    };
    void showRadar();
    return () => {
      cancelled = true;
    };
  }, [weatherMode, loaded, styleRevision]);

  const switchBasemap = (next: BasemapMode) => {
    if (next === basemap) return;
    const map = mapRef.current;
    const previousUrl = styleUrl(basemapRef.current);
    const nextUrl = styleUrl(next);
    basemapRef.current = next;
    setBasemap(next);
    if (!map) return;
    if (previousUrl === nextUrl) {
      if (next === "traffic") installTrafficLayers(map);
      else removeTrafficLayers(map);
      setStyleRevision((value) => value + 1);
      return;
    }
    setLoaded(false);
    map.setStyle(nextUrl);
  };

  return (
    <div
      className={`flight-globe ${loaded ? "loaded" : ""} ${weatherMode !== "none" ? "weather-on" : ""}`}
    >
      <div ref={hostRef} className="flight-globe-map" />
      <div className="globe-loading">正在载入实时地球…</div>
      <div className="map-layer-switcher" role="group" aria-label="地图图层">
        {BASEMAP_LABELS.map((item) => (
          <button
            key={item.id}
            className={basemap === item.id ? "active" : ""}
            aria-pressed={basemap === item.id}
            onClick={() => switchBasemap(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {weatherMode !== "none" && (
        <div className="weather-legend">
          <span>雨</span><i className="green" /><i className="yellow" /><i className="orange" /><i className="red" /><i className="pink" />
          <span>雪</span><i className="snow-1" /><i className="snow-2" /><i className="snow-3" /><i className="snow-4" />
          {radarUpdated && <small>更新于 {radarUpdated}</small>}
        </div>
      )}
      <a className="weather-credit" href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">天气数据：RainViewer</a>
    </div>
  );
}

function configureBasemap(map: import("mapbox-gl").Map, mode: BasemapMode) {
  try {
    map.setConfigProperty("basemap", "lightPreset", "night");
    map.setConfigProperty("basemap", "showPointOfInterestLabels", mode !== "satellite");
    map.setConfigProperty("basemap", "showTransitLabels", mode !== "satellite");
    map.setConfigProperty("basemap", "showRoadLabels", mode !== "satellite");
  } catch {
    /* Continue with style defaults if a future Mapbox style changes a property. */
  }
  map.setFog({
    color: "rgb(5, 9, 18)",
    "high-color": "rgb(15, 28, 52)",
    "space-color": "rgb(0, 0, 2)",
    "horizon-blend": 0.08,
    "star-intensity": 0.72,
  });
}

function installProductLayers(
  map: import("mapbox-gl").Map,
  data: LiveData,
  mode: BasemapMode,
) {
  if (mode === "traffic") installTrafficLayers(map);
  if (!map.getSource("flighty-airports")) {
    map.addSource("flighty-airports", {
      type: "geojson",
      data: airportFeatures(data.selectedAirport),
    });
  }
  if (!map.getSource("flighty-journey-lines")) {
    map.addSource("flighty-journey-lines", {
      type: "geojson",
      data: journeyLineFeatures(
        data.journeySegments,
        data.selectedJourneySegmentId,
      ),
    });
  }
  if (!map.getSource("flighty-journey-stops")) {
    map.addSource("flighty-journey-stops", {
      type: "geojson",
      data: journeyStopFeatures(
        data.journeySegments,
        data.selectedJourneySegmentId,
      ),
    });
  }
  if (!map.getLayer("flighty-journey-glow")) {
    map.addLayer({
      id: "flighty-journey-glow",
      type: "line",
      source: "flighty-journey-lines",
      slot: "top",
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["case", ["get", "selected"], 10, 7],
        "line-opacity": 0.16,
        "line-blur": 5,
      },
    });
  }
  if (!map.getLayer("flighty-journey-routes")) {
    map.addLayer({
      id: "flighty-journey-routes",
      type: "line",
      source: "flighty-journey-lines",
      slot: "top",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["case", ["get", "selected"], 3.5, 2.2],
        "line-opacity": ["case", ["get", "selected"], 1, 0.72],
        "line-dasharray": [2, 1.6],
      },
    });
  }
  if (!map.getLayer("flighty-journey-stop-glow")) {
    map.addLayer({
      id: "flighty-journey-stop-glow",
      type: "circle",
      source: "flighty-journey-stops",
      slot: "top",
      paint: {
        "circle-radius": ["case", ["get", "selected"], 13, 9],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.18,
        "circle-blur": 0.45,
      },
    });
  }
  if (!map.getLayer("flighty-journey-stop-dots")) {
    map.addLayer({
      id: "flighty-journey-stop-dots",
      type: "circle",
      source: "flighty-journey-stops",
      slot: "top",
      paint: {
        "circle-radius": ["case", ["get", "selected"], 6, 4],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.4,
      },
    });
  }
  if (!map.getLayer("flighty-airport-glow")) {
    map.addLayer({
      id: "flighty-airport-glow",
      type: "circle",
      source: "flighty-airports",
      slot: "top",
      layout: { visibility: data.airportsVisible ? "visible" : "none" },
      paint: {
        "circle-radius": ["case", ["get", "selected"], 15, 10],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.2,
        "circle-blur": 0.5,
      },
    });
  }
  if (!map.getLayer("flighty-airport-dots")) {
    map.addLayer({
      id: "flighty-airport-dots",
      type: "circle",
      source: "flighty-airports",
      slot: "top",
      layout: { visibility: data.airportsVisible ? "visible" : "none" },
      paint: {
        "circle-radius": ["case", ["get", "selected"], 7, 5],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.6,
      },
    });
  }
}

function installTrafficLayers(map: import("mapbox-gl").Map) {
  if (!map.getSource("flighty-traffic")) {
    map.addSource("flighty-traffic", {
      type: "vector",
      url: "mapbox://mapbox.mapbox-traffic-v1",
    });
  }
  if (!map.getLayer("flighty-traffic-casing")) {
    map.addLayer({
      id: "flighty-traffic-casing",
      type: "line",
      source: "flighty-traffic",
      "source-layer": "traffic",
      slot: "middle",
      minzoom: 5,
      paint: {
        "line-color": "rgba(7, 9, 15, .82)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.8, 13, 7],
        "line-opacity": 0.72,
      },
    });
  }
  if (!map.getLayer("flighty-traffic-flow")) {
    map.addLayer({
      id: "flighty-traffic-flow",
      type: "line",
      source: "flighty-traffic",
      "source-layer": "traffic",
      slot: "middle",
      minzoom: 5,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "closed"], "yes"], "#ff375f",
          ["match", ["get", "congestion"], "severe", "#ff453a", "heavy", "#ff9f0a", "moderate", "#ffd60a", "low", "#30d158", "#8e8e93"],
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 13, 4.2],
        "line-opacity": 0.92,
        "line-offset": ["interpolate", ["linear"], ["zoom"], 5, 0, 13, 1.1],
      },
    });
  }
}

function removeTrafficLayers(map: import("mapbox-gl").Map) {
  if (map.getLayer("flighty-traffic-flow")) map.removeLayer("flighty-traffic-flow");
  if (map.getLayer("flighty-traffic-casing")) map.removeLayer("flighty-traffic-casing");
  if (map.getSource("flighty-traffic")) map.removeSource("flighty-traffic");
}

function styleUrl(mode: BasemapMode) {
  return mode === "satellite"
    ? "mapbox://styles/mapbox/standard-satellite"
    : "mapbox://styles/mapbox/standard";
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

function journeyLineFeatures(segments: JourneySegment[], selectedId: string | null) {
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
        coordinates: greatCircleCoordinates(segment.origin.coordinate, segment.destination.coordinate),
      },
    })),
  };
}

function journeyStopFeatures(segments: JourneySegment[], selectedId: string | null) {
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

function greatCircleCoordinates(a: [number, number], b: [number, number], steps = 48) {
  const points: [number, number][] = [];
  const radians = (value: number) => (value * Math.PI) / 180;
  const degrees = (value: number) => (value * 180) / Math.PI;
  const aVector = vector(radians(a[0]), radians(a[1]));
  const bVector = vector(radians(b[0]), radians(b[1]));
  const angle = Math.acos(Math.min(1, Math.max(-1, aVector[0] * bVector[0] + aVector[1] * bVector[1] + aVector[2] * bVector[2])));
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const sinAngle = Math.sin(angle);
    const left = angle < 1e-6 ? 1 - ratio : Math.sin((1 - ratio) * angle) / sinAngle;
    const right = angle < 1e-6 ? ratio : Math.sin(ratio * angle) / sinAngle;
    const x = left * aVector[0] + right * bVector[0];
    const y = left * aVector[1] + right * bVector[1];
    const z = left * aVector[2] + right * bVector[2];
    points.push([degrees(Math.atan2(y, x)), degrees(Math.atan2(z, Math.hypot(x, y)))]);
  }
  return points;
}

function vector(longitude: number, latitude: number): [number, number, number] {
  return [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)];
}

function pointAlong(coordinates: [number, number][], progress: number) {
  const position = Math.max(0, Math.min(1, progress)) * (coordinates.length - 1);
  const index = Math.min(coordinates.length - 2, Math.floor(position));
  const ratio = position - index;
  const from = coordinates[index];
  const to = coordinates[index + 1];
  let longitudeDelta = to[0] - from[0];
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;
  const longitude = from[0] + longitudeDelta * ratio;
  const latitude = from[1] + (to[1] - from[1]) * ratio;
  const bearing = (Math.atan2(longitudeDelta * Math.cos((latitude * Math.PI) / 180), to[1] - from[1]) * 180) / Math.PI;
  return { coordinate: [longitude, latitude] as [number, number], bearing };
}

function animationDuration(mode: JourneyMode) {
  return { flight: 18_000, train: 25_000, car: 31_000, ferry: 36_000 }[mode];
}

function transportLabel(mode: JourneyMode) {
  return { flight: "飞机", train: "火车", car: "汽车", ferry: "轮船" }[mode];
}
