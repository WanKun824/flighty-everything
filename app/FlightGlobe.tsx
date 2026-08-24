"use client";

import { useEffect, useRef, useState } from "react";
import { AIRPORTS, airportByCode } from "./flightyData";
import type { WeatherMode } from "./flightyStorage";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

type Props = {
  airportsVisible: boolean;
  selectedAirport: string | null;
  weatherMode: WeatherMode;
  resetToken: number;
  onAirportSelect: (code: string) => void;
  onWeatherError: (message: string) => void;
};

type RadarResponse = { host?: string; radar?: { past?: Array<{ path?: string }> } };

export default function FlightGlobe({ airportsVisible, selectedAirport, weatherMode, resetToken, onAirportSelect, onWeatherError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const callbacksRef = useRef({ onAirportSelect, onWeatherError });
  const [loaded, setLoaded] = useState(false);
  const [radarUpdated, setRadarUpdated] = useState<string | null>(null);

  useEffect(() => { callbacksRef.current = { onAirportSelect, onWeatherError }; }, [onAirportSelect, onWeatherError]);

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
        } catch { /* Keep the satellite style defaults when a style option is unavailable. */ }
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
          const feature = event.features?.[0] as { properties?: { code?: unknown } } | undefined;
          const code = feature?.properties?.code;
          if (typeof code === "string") callbacksRef.current.onAirportSelect(code);
        });
        map.on("mouseenter", "flighty-airport-dots", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "flighty-airport-dots", () => { map.getCanvas().style.cursor = ""; });
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
    (map.getSource("flighty-airports") as import("mapbox-gl").GeoJSONSource | undefined)?.setData(airportFeatures(selectedAirport));
  }, [airportsVisible, selectedAirport, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (!selectedAirport) return;
    const airport = airportByCode(selectedAirport);
    if (airport) map.flyTo({ center: airport.coordinate, zoom: 8.4, pitch: 28, duration: 900, essential: true });
  }, [selectedAirport, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.flyTo({ center: [126, 27], zoom: weatherMode === "none" ? 2.05 : 1.85, pitch: 0, bearing: -8, duration: 820, essential: true });
  }, [resetToken, loaded, weatherMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (weatherMode === "none") {
      if (map.getLayer("flighty-radar")) map.setLayoutProperty("flighty-radar", "visibility", "none");
      return;
    }

    let cancelled = false;
    const showRadar = async () => {
      try {
        const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Weather service is unavailable");
        const data = await response.json() as RadarResponse;
        const frame = data.radar?.past?.at(-1);
        if (!data.host || !frame?.path) throw new Error("No radar frame is available");
        if (cancelled || !mapRef.current) return;
        const currentMap = mapRef.current;
        const tiles = [`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`];
        if (currentMap.getLayer("flighty-radar")) currentMap.removeLayer("flighty-radar");
        if (currentMap.getSource("flighty-radar")) currentMap.removeSource("flighty-radar");
        currentMap.addSource("flighty-radar", { type: "raster", tiles, tileSize: 256, maxzoom: 7, attribution: "Weather data by RainViewer" });
        currentMap.addLayer({ id: "flighty-radar", type: "raster", source: "flighty-radar", paint: { "raster-opacity": weatherMode === "us" ? 0.83 : 0.72, "raster-fade-duration": 180 } });
        currentMap.flyTo({ center: weatherMode === "us" ? [-98, 38] : [118, 25], zoom: weatherMode === "us" ? 2.75 : 1.85, pitch: 0, bearing: 0, duration: 900, essential: true });
        setRadarUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch (error) {
        if (!cancelled) callbacksRef.current.onWeatherError(error instanceof Error ? error.message : "Weather layer could not load");
      }
    };
    void showRadar();
    return () => { cancelled = true; };
  }, [weatherMode, loaded]);

  return <div className={`flight-globe ${loaded ? "loaded" : ""} ${weatherMode !== "none" ? "weather-on" : ""}`}>
    <div ref={hostRef} className="flight-globe-map" />
    <div className="globe-loading">Loading live globe…</div>
    {weatherMode !== "none" && <div className="weather-legend"><span>Rain</span><i className="green" /><i className="yellow" /><i className="orange" /><i className="red" /><i className="pink" /><span>Snow</span><i className="snow-1" /><i className="snow-2" /><i className="snow-3" /><i className="snow-4" />{radarUpdated && <small>Updated {radarUpdated}</small>}</div>}
    <a className="weather-credit" href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">Weather by RainViewer</a>
  </div>;
}

function airportFeatures(selectedAirport: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: AIRPORTS.map((airport) => ({
      type: "Feature" as const,
      properties: { code: airport.code, selected: airport.code === selectedAirport, color: airport.issue ? "#ff334b" : "#36d688" },
      geometry: { type: "Point" as const, coordinates: airport.coordinate },
    })),
  };
}
