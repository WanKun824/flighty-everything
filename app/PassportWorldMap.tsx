"use client";

import { useEffect, useRef, useState } from "react";
import type { JourneySegment } from "./journeyData";
import { MAPBOX_ACCESS_TOKEN } from "./mapboxConfig";
import { geodesic, unwrap } from "./routeGeometry";
import { useAppearance } from "./appearance";

export default function PassportWorldMap({ segments }: { segments: JourneySegment[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const segmentsRef = useRef(segments);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  const [status, setStatus] = useState("正在载入足迹地图…");
  const { resolved } = useAppearance();
  const hasSegments = segments.length > 0;

  useEffect(() => {
    if (!hasSegments) return;
    let disposed = false;
    let map: import("mapbox-gl").Map | null = null;
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() => map?.resize());
    observer.observe(host);
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      map = new mapboxgl.Map({
        container: host, style: resolved === "light" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/dark-v11",
        projection: "equalEarth", center: [0, 12], minZoom: -2, zoom: 0, pitch: 0, bearing: 0,
        interactive: false, attributionControl: false, antialias: true, fadeDuration: 0,
      });
      mapRef.current = map;
      map.on("error", () => { if (!disposed) setStatus("足迹地图暂不可用，统计数据仍保留"); });
      map.on("load", () => {
        if (!map || disposed) return;
        const styles = getComputedStyle(document.documentElement);
        map.addSource("passport-routes", { type: "geojson", data: routeCollection(segmentsRef.current, styles) });
        map.addSource("passport-stops", { type: "geojson", data: stopCollection(segmentsRef.current) });
        map.addLayer({ id: "passport-route-lines", type: "line", source: "passport-routes", paint: {
          "line-color": ["get", "color"], "line-width": 2.2, "line-opacity": .95,
        } });
        map.addLayer({ id: "passport-stop-dots", type: "circle", source: "passport-stops", paint: {
          "circle-radius": 3, "circle-color": styles.getPropertyValue("--ios-blue").trim(),
          "circle-stroke-color": styles.getPropertyValue("--ios-on-accent").trim(), "circle-stroke-width": 1,
        } });
        setStatus("");
      });
    }).catch(() => { if (!disposed) setStatus("足迹地图暂不可用，统计数据仍保留"); });
    return () => { disposed = true; observer.disconnect(); map?.remove(); mapRef.current = null; };
  }, [resolved, hasSegments]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const styles = getComputedStyle(document.documentElement);
      (map.getSource("passport-routes") as import("mapbox-gl").GeoJSONSource | undefined)?.setData(routeCollection(segments, styles));
      (map.getSource("passport-stops") as import("mapbox-gl").GeoJSONSource | undefined)?.setData(stopCollection(segments));
    };
    if (map.isStyleLoaded()) update(); else map.on("load", update);
    return () => { map.off("load", update); };
  }, [segments, resolved, status]);

  return <div className="passport-world-map" aria-label={`世界地图，共显示 ${segments.length} 段旅程`}>
    <div ref={hostRef} className="passport-map-host" />
    {(!hasSegments || status) && <span className="passport-map-state" role="status">{hasSegments ? status : "完成行程后，在这里查看世界足迹"}</span>}
  </div>;
}

function routeCollection(segments: JourneySegment[], styles: CSSStyleDeclaration) {
  const tokens = { flight: "--ios-blue", train: "--ios-purple", car: "--ios-red", ferry: "--ios-teal" };
  return { type: "FeatureCollection" as const, features: segments.map(segment => ({
    type: "Feature" as const,
    properties: { color: styles.getPropertyValue(tokens[segment.mode]).trim() },
    geometry: { type: "LineString" as const, coordinates: unwrap(geodesic(segment.origin.coordinate, segment.destination.coordinate, 64)) },
  })) };
}
function stopCollection(segments: JourneySegment[]) {
  return { type: "FeatureCollection" as const, features: segments.flatMap(segment => [segment.origin, segment.destination]).map(place => ({
    type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: place.coordinate },
  })) };
}
