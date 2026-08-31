"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AIRPORTS, airportByCode, airportStatusLevel, type Region } from "./flightyData";
import type { WeatherMode } from "./flightyStorage";
import type { JourneyMode, JourneySegment } from "./journeyData";
import { MAPBOX_ACCESS_TOKEN } from "./mapboxConfig";
import { fetchRoadTraffic, type RoadTrafficRoute } from "./roadTraffic";
import { measure, pointAt, unwrap, type LegPath } from "./routeGeometry";
import Vehicle3D from "./Vehicle3D";
import { vehicleStageMotion } from "./vehicleMotion";
import { createVehicleFollower } from "./vehicleFollow";

export type BasemapMode = "standard" | "satellite" | "terrain" | "navigation" | "traffic";

type Props = {
  airportsVisible: boolean;
  airportRegion?: "All" | Region;
  selectedAirport: string | null;
  weatherMode: WeatherMode;
  resetToken: number;
  onAirportSelect: (code: string) => void;
  onWeatherError: (message: string) => void;
  journeySegments?: JourneySegment[];
  selectedJourneySegmentId?: string | null;
  journeySelectionToken?: number;
  onJourneySegmentSelect?: (id: string) => void;
  vehicleScale?: number;
  animationSpeed?: number;
  motionEnabled?: boolean;
  theme?: "light" | "dark";
  basemap?: BasemapMode;
  followVehicle?: boolean;
  onFollowInterrupted?: () => void;
  onRoadTrafficChange?: (routes: Record<string, RoadTrafficRoute>) => void;
};

type RadarResponse = {
  host?: string;
  radar?: { past?: Array<{ path?: string }> };
};

type LiveData = {
  airportsVisible: boolean;
  airportRegion: "All" | Region;
  selectedAirport: string | null;
  journeySegments: JourneySegment[];
  selectedJourneySegmentId: string | null;
};

type RiderPortal = {
  host: HTMLElement;
  segment: JourneySegment;
  heading: number;
  progress: number;
};

export const BASEMAP_OPTIONS: Array<{ id: BasemapMode; label: string }> = [
  { id: "standard", label: "标准" },
  { id: "satellite", label: "卫星" },
  { id: "terrain", label: "地形" },
  { id: "navigation", label: "导航" },
  { id: "traffic", label: "路况" },
];

export default function FlightGlobe({
  airportsVisible,
  airportRegion = "All",
  selectedAirport,
  weatherMode,
  resetToken,
  onAirportSelect,
  onWeatherError,
  journeySegments = [],
  selectedJourneySegmentId = null,
  journeySelectionToken = 0,
  onJourneySegmentSelect,
  vehicleScale = 1,
  animationSpeed = 1,
  motionEnabled = true,
  theme = "dark",
  basemap: controlledBasemap,
  followVehicle = false,
  onFollowInterrupted,
  onRoadTrafficChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const airportMarkersRef = useRef<Array<import("mapbox-gl").Marker>>([]);
  const basemapRef = useRef<BasemapMode>("standard");
  const basemapThemeRef = useRef<"light" | "dark">(theme);
  const followVehicleRef = useRef(followVehicle);
  const liveDataRef = useRef<LiveData>({
    airportsVisible,
    airportRegion,
    selectedAirport,
    journeySegments,
    selectedJourneySegmentId,
  });
  const callbacksRef = useRef({
    onAirportSelect,
    onWeatherError,
    onJourneySegmentSelect,
    onFollowInterrupted,
  });
  const [loaded, setLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [radarUpdated, setRadarUpdated] = useState<string | null>(null);
  const [roadTraffic, setRoadTraffic] = useState<Record<string, RoadTrafficRoute>>({});
  const [riderPortal, setRiderPortal] = useState<RiderPortal | null>(null);

  useEffect(() => {
    basemapThemeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    followVehicleRef.current = followVehicle;
  }, [followVehicle]);

  useEffect(() => {
    liveDataRef.current = {
      airportsVisible,
      airportRegion,
      selectedAirport,
      journeySegments,
      selectedJourneySegmentId,
    };
  }, [
    airportsVisible,
    airportRegion,
    selectedAirport,
    journeySegments,
    selectedJourneySegmentId,
  ]);

  useEffect(() => {
    callbacksRef.current = {
      onAirportSelect,
      onWeatherError,
      onJourneySegmentSelect,
      onFollowInterrupted,
    };
  }, [onAirportSelect, onWeatherError, onJourneySegmentSelect, onFollowInterrupted]);

  useEffect(() => {
    let disposed = false;
    let instance: import("mapbox-gl").Map | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !hostRef.current) return;
      mapboxRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      const map = new mapboxgl.Map({
        container: hostRef.current,
        style: styleUrl("standard"),
        projection: "globe",
        center: [126, 27],
        zoom: 2.05,
        pitch: 0,
        bearing: 0,
        antialias: true,
        attributionControl: false,
        fadeDuration: 0,
      });
      instance = map;
      mapRef.current = map;
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      map.on("dragstart", (event) => {
        if (event.originalEvent && followVehicleRef.current)
          callbacksRef.current.onFollowInterrupted?.();
      });

      map.on("style.load", () => {
        if (disposed) return;
        configureBasemap(map, basemapRef.current, basemapThemeRef.current);
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
    if (!map || !loaded) return;
    configureBasemap(map, basemapRef.current, theme);
  }, [theme, loaded, styleRevision]);

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
    )?.setData(airportFeatures(selectedAirport, airportRegion));
  }, [airportsVisible, airportRegion, selectedAirport, loaded, styleRevision]);

  useEffect(() => {
    for (const marker of airportMarkersRef.current) marker.remove();
    airportMarkersRef.current = [];
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !loaded || !airportsVisible) return;
    const airports = AIRPORTS.filter((airport) => airportRegion === "All" || airport.region === airportRegion);
    airportMarkersRef.current = airports.map((airport) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `flighty-airport-marker ${airportStatusLevel(airport)} ${airport.code === selectedAirport ? "selected" : ""}`;
      element.setAttribute("aria-label", `${airport.code} ${airport.name}`);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        callbacksRef.current.onAirportSelect(airport.code);
      });
      return new mapboxgl.Marker({ element, anchor: "center" }).setLngLat(airport.coordinate).addTo(map);
    });
    return () => {
      for (const marker of airportMarkersRef.current) marker.remove();
      airportMarkersRef.current = [];
    };
  }, [airportsVisible, airportRegion, selectedAirport, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !airportsVisible || selectedAirport) return;
    const view = airportRegion === "Asia"
      ? { center: [108, 28] as [number, number], zoom: 1.85 }
      : airportRegion === "Europe"
        ? { center: [10, 49] as [number, number], zoom: 2.3 }
        : airportRegion === "North America"
          ? { center: [-100, 39] as [number, number], zoom: 1.95 }
          : { center: [64, 30] as [number, number], zoom: 1.3 };
    map.easeTo({ ...view, offset: [0, -72], duration: 520, essential: true });
  }, [airportsVisible, airportRegion, selectedAirport, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (
      map.getSource("flighty-journey-lines") as
        | import("mapbox-gl").GeoJSONSource
        | undefined
    )?.setData(
      journeyLineFeatures(journeySegments, selectedJourneySegmentId, roadTraffic),
    );
    (
      map.getSource("flighty-journey-stops") as
        | import("mapbox-gl").GeoJSONSource
        | undefined
    )?.setData(journeyStopFeatures(journeySegments, selectedJourneySegmentId));
  }, [journeySegments, selectedJourneySegmentId, roadTraffic, loaded, styleRevision]);

  useEffect(() => {
    const controller = new AbortController();
    const carSegments = journeySegments.filter((segment) => segment.mode === "car");
    if (!carSegments.length) {
      void Promise.resolve().then(() => {
        if (controller.signal.aborted) return;
        setRoadTraffic({});
        onRoadTrafficChange?.({});
      });
      return () => controller.abort();
    }
    void Promise.all(
      carSegments.map((segment) =>
        fetchRoadTraffic(segment, controller.signal).catch(() => null),
      ),
    ).then((routes) => {
      if (controller.signal.aborted) return;
      const next = Object.fromEntries(
        routes
          .filter((route): route is RoadTrafficRoute => Boolean(route))
          .map((route) => [route.segmentId, route]),
      );
      setRoadTraffic(next);
      onRoadTrafficChange?.(next);
    });
    return () => controller.abort();
  }, [journeySegments, onRoadTrafficChange]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !loaded) return;
    const preferredSegment =
      journeySegments.find((item) => item.id === selectedJourneySegmentId) ??
      journeySegments.find((item) => item.status === "active") ??
      journeySegments[0];
    if (!preferredSegment) return;
    const segment = preferredSegment;
    const road = roadTraffic[segment.id]?.coordinates;
    const coordinates = road ?? greatCircleCoordinates(
      segment.origin.coordinate,
      segment.destination.coordinate,
      128,
    );
    const path: LegPath = measure(
      segment.mode,
      unwrap(coordinates),
      road ? "road" : "geodesic",
    );
    const duration = animationDuration(segment.mode) / Math.max(0.25, animationSpeed);

    const element = document.createElement("button");
    element.type = "button";
    element.className = `journey-vehicle-3d-marker ${segment.mode}`;
    element.style.setProperty("--vehicle-3d-size", `${104 * vehicleScale}px`);
    element.setAttribute(
      "aria-label",
      `${segment.title} · ${transportLabel(segment.mode)}正在路线中移动`,
    );
    element.addEventListener("click", () => callbacksRef.current.onJourneySegmentSelect?.(segment.id));

    const modelHost = document.createElement("span");
    modelHost.className = "journey-vehicle-3d-host";
    element.appendChild(modelHost);
    let publishedHeading = Number.NaN;
    setRiderPortal({ host: modelHost, segment, heading: 0, progress: segment.progress });

    const marker = new mapboxgl.Marker({
      element,
      anchor: "center",
      rotationAlignment: "viewport",
      pitchAlignment: "viewport",
    })
      .setLngLat(path.coordinates[0])
      .addTo(map);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const followVehicleAt = createVehicleFollower(map, {
      pin() {
        // A followed vehicle is always at the viewport center. Detach the
        // geographic marker so map moves do not reproject/round it repeatedly.
        marker.remove();
        element.classList.add("is-following");
        element.style.removeProperty("transform");
        element.style.removeProperty("opacity");
        element.style.removeProperty("pointer-events");
        map.getContainer().appendChild(element);
      },
      unpin(coordinate) {
        element.classList.remove("is-following");
        marker.setLngLat(coordinate).addTo(map);
      },
      move(coordinate) {
        marker.setLngLat(coordinate);
      },
    });
    const startedAt = performance.now() - duration * Math.max(0, Math.min(1, preferredSegment.progress));
    let frame = 0;
    let publishedProgressAt = 0;
    let publishedStage = "";
    let publishedTrail = "";
    const animate = (now: number) => {
      let moving = Math.max(0, Math.min(1, preferredSegment.progress));
      if (!reduceMotion.matches && motionEnabled) {
        const elapsed = (now - startedAt) % duration;
        moving = elapsed / duration;
      }
      const point = pointAt(path, moving);
      // jumpTo cancels camera easing; let an active wheel/pinch zoom finish
      // before resuming follow, preserving the zoom the user actually chose.
      followVehicleAt(point.coordinate, followVehicleRef.current && !map.isZooming());
      const stageMotion = vehicleStageMotion(segment.mode, moving);
      const trail = stageMotion.trail.toFixed(3);
      if (trail !== publishedTrail) {
        publishedTrail = trail;
        element.style.setProperty("--journey-motion-trail", trail);
      }
      if (stageMotion.stage !== publishedStage) {
        publishedStage = stageMotion.stage;
        element.dataset.motionStage = stageMotion.stage;
        element.setAttribute("aria-label", `${segment.title} · ${transportLabel(segment.mode)}${motionStageLabel(stageMotion.stage)}`);
      }
      const screenHeading = (point.bearing - map.getBearing() + 360) % 360;
      const headingDelta = Math.abs(((screenHeading - publishedHeading + 540) % 360) - 180);
      if (!Number.isFinite(publishedHeading) || headingDelta > 2) {
        publishedHeading = screenHeading;
        setRiderPortal((current) =>
          current?.host === modelHost
            ? { ...current, heading: screenHeading }
            : current,
        );
      }
      if (now - publishedProgressAt > 160) {
        publishedProgressAt = now;
        setRiderPortal((current) => current?.host === modelHost ? { ...current, progress: moving } : current);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      marker.remove();
      setRiderPortal((current) => current?.host === modelHost ? null : current);
    };
  }, [journeySegments, selectedJourneySegmentId, roadTraffic, loaded, styleRevision, vehicleScale, animationSpeed, motionEnabled]);

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
    if (!map || !loaded || !selectedJourneySegmentId || followVehicleRef.current) return;
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
  }, [selectedJourneySegmentId, journeySelectionToken, journeySegments, loaded, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.flyTo({
      center: [126, 27],
      zoom: weatherMode === "none" ? 2.05 : 1.85,
      pitch: 0,
      bearing: 0,
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

  const switchBasemap = useCallback((next: BasemapMode) => {
    if (next === basemapRef.current) return;
    const map = mapRef.current;
    const previousUrl = styleUrl(basemapRef.current);
    const nextUrl = styleUrl(next);
    basemapRef.current = next;
    if (!map) return;
    if (previousUrl === nextUrl) {
      configureBasemap(map, next, basemapThemeRef.current);
      if (next === "terrain") installTerrain(map);
      else removeTerrain(map);
      if (next === "traffic") installTrafficLayers(map);
      else removeTrafficLayers(map);
      setStyleRevision((value) => value + 1);
      return;
    }
    setLoaded(false);
    map.setStyle(nextUrl);
  }, []);

  useEffect(() => {
    if (controlledBasemap) switchBasemap(controlledBasemap);
  }, [controlledBasemap, switchBasemap]);

  return (
    <div
      className={`flight-globe ${loaded ? "loaded" : ""} ${weatherMode !== "none" ? "weather-on" : ""}`}
    >
      <div ref={hostRef} className="flight-globe-map" />
      {riderPortal && createPortal(
        <Vehicle3D
          kind={riderPortal.segment.mode}
          view="map"
          heading={riderPortal.heading}
          progress={riderPortal.progress}
          rate={Math.max(0.25, animationSpeed)}
          className="journey-vehicle-3d-model"
        />,
        riderPortal.host,
      )}
      <div className="globe-loading">正在载入实时地球…</div>
      {weatherMode !== "none" && (
        <div className="weather-legend">
          <span>雨</span><i className="green" /><i className="yellow" /><i className="orange" /><i className="red" /><i className="pink" />
          <span>雪</span><i className="snow-1" /><i className="snow-2" /><i className="snow-3" /><i className="snow-4" />
          {radarUpdated && <small>更新于 {radarUpdated}</small>}
        </div>
      )}
      <span className="map-data-credits">
        {weatherMode !== "none" && <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">雷达 RainViewer</a>}
      </span>
    </div>
  );
}

function configureBasemap(
  map: import("mapbox-gl").Map,
  mode: BasemapMode,
  theme: "light" | "dark",
) {
  try {
    map.setConfigProperty("basemap", "lightPreset", theme === "light" ? "day" : "night");
    map.setConfigProperty("basemap", "showPointOfInterestLabels", mode !== "satellite");
    map.setConfigProperty("basemap", "showTransitLabels", mode !== "satellite");
    map.setConfigProperty("basemap", "showRoadLabels", mode !== "satellite");
  } catch {
    /* Continue with style defaults if a future Mapbox style changes a property. */
  }
  map.setFog({
    color: theme === "light" ? "rgb(219, 232, 246)" : "rgb(5, 9, 18)",
    "high-color": theme === "light" ? "rgb(178, 210, 242)" : "rgb(15, 28, 52)",
    "space-color": theme === "light" ? "rgb(230, 239, 249)" : "rgb(0, 0, 2)",
    "horizon-blend": 0.08,
    "star-intensity": 0.72,
  });
  if (mode === "terrain") installTerrain(map);
  else removeTerrain(map);
}

function installProductLayers(
  map: import("mapbox-gl").Map,
  data: LiveData,
  mode: BasemapMode,
) {
  if (mode === "terrain") installTerrain(map);
  if (mode === "traffic") installTrafficLayers(map);
  if (!map.getSource("flighty-airports")) {
    map.addSource("flighty-airports", {
      type: "geojson",
      data: airportFeatures(data.selectedAirport, data.airportRegion),
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
        "line-color": ["coalesce", ["get", "trafficColor"], ["get", "color"]],
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
        "line-color": ["coalesce", ["get", "trafficColor"], ["get", "color"]],
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
        "circle-radius": ["case", ["get", "selected"], 19, 13],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.34,
        "circle-blur": 0.38,
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
        "circle-radius": ["case", ["get", "selected"], 9, 7],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }
}

function installTerrain(map: import("mapbox-gl").Map) {
  if (!map.getSource("flighty-terrain-dem")) {
    map.addSource("flighty-terrain-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  }
  map.setTerrain({ source: "flighty-terrain-dem", exaggeration: 1.35 });
}

function removeTerrain(map: import("mapbox-gl").Map) {
  if (!map.getTerrain()) return;
  map.setTerrain(null);
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
  if (mode === "satellite") return "mapbox://styles/mapbox/standard-satellite";
  if (mode === "terrain") return "mapbox://styles/mapbox/outdoors-v12";
  if (mode === "navigation") return "mapbox://styles/mapbox/navigation-day-v1";
  return "mapbox://styles/mapbox/standard";
}

function airportFeatures(selectedAirport: string | null, region: "All" | Region = "All") {
  return {
    type: "FeatureCollection" as const,
    features: AIRPORTS.filter((airport) => region === "All" || airport.region === region).map((airport) => ({
      type: "Feature" as const,
      properties: {
        code: airport.code,
        selected: airport.code === selectedAirport,
        color: airportStatusLevel(airport) === "severe"
          ? "#ff375f"
          : airportStatusLevel(airport) === "warning"
            ? "#ff9f0a"
            : "#24c78a",
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
  roadTraffic: Record<string, RoadTrafficRoute> = {},
) {
  return {
    type: "FeatureCollection" as const,
    features: segments.map((segment) => {
      const traffic = roadTraffic[segment.id];
      return {
        type: "Feature" as const,
        properties: {
          segmentId: segment.id,
          color: journeyColor[segment.mode],
          trafficColor: traffic ? congestionColor(traffic.congestion) : null,
          selected: segment.id === selectedId,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: traffic?.coordinates ?? greatCircleCoordinates(segment.origin.coordinate, segment.destination.coordinate),
        },
      };
    }),
  };
}

function congestionColor(levels: RoadTrafficRoute["congestion"]) {
  if (levels.includes("severe")) return "#ff453a";
  if (levels.includes("heavy")) return "#ff9f0a";
  if (levels.includes("moderate")) return "#ffd60a";
  if (levels.includes("low")) return "#30d158";
  return "#ff453a";
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

function animationDuration(mode: JourneyMode) {
  return { flight: 18_000, train: 25_000, car: 31_000, ferry: 36_000 }[mode];
}

function transportLabel(mode: JourneyMode) {
  return { flight: "飞机", train: "火车", car: "汽车", ferry: "轮船" }[mode];
}

function motionStageLabel(stage: "departing" | "cruising" | "arriving") {
  return { departing: "正在出发", cruising: "正在途中", arriving: "正在抵达" }[stage];
}
