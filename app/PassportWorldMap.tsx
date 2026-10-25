"use client";

import { useEffect, useRef } from "react";
import type { JourneySegment } from "./journeyData";
import { MAPBOX_ACCESS_TOKEN } from "./mapboxConfig";
import { geodesic, unwrap } from "./routeGeometry";

export default function PassportWorldMap({ segments }: { segments: JourneySegment[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  useEffect(() => {
    let disposed = false;
    let map: import("mapbox-gl").Map | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !hostRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      map = new mapboxgl.Map({
        container: hostRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        projection: "equalEarth",
        center: [0, 12],
        minZoom: -2,
        zoom: 0,
        pitch: 0,
        bearing: 0,
        interactive: false,
        attributionControl: false,
        antialias: true,
        fadeDuration: 0,
      });
      map.on("load", () => {
        if (!map || disposed) return;
        for (const layer of map.getStyle().layers ?? []) {
          if (layer.type === "symbol" || layer.type === "line") map.setLayoutProperty(layer.id, "visibility", "none");
          if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#6500ee");
          if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", layer.id.includes("water") ? "#210063" : "#6500ee");
        }
        map.addSource("passport-routes", {
          type: "geojson",
          data: routeCollection(segmentsRef.current),
        });
        map.addLayer({
          id: "passport-route-glow",
          type: "line",
          source: "passport-routes",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 7,
            "line-opacity": 0.22,
            "line-blur": 4,
          },
        });
        map.addSource("passport-stops", {
          type: "geojson", data: {
            type: "FeatureCollection",
            features: segmentsRef.current.flatMap(segment => [segment.origin, segment.destination]).map(place => ({
              type: "Feature", properties: {}, geometry: { type: "Point", coordinates: place.coordinate },
            })),
          },
        });
        map.addLayer({ id: "passport-stop-dots", type: "circle", source: "passport-stops", paint: {
          "circle-radius": 3, "circle-color": "#f4ed79", "circle-stroke-color": "#fff", "circle-stroke-width": 1,
        } });
        map.addLayer({
          id: "passport-route-lines",
          type: "line",
          source: "passport-routes",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2.2,
            "line-opacity": 0.95,
          },
        });
      });
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, []);

  return <div ref={hostRef} className="passport-world-map" aria-label={`世界地图，共显示 ${segments.length} 段旅程`} />;
}

function routeCollection(segments: JourneySegment[]) {
  return {
    type: "FeatureCollection" as const,
    features: segments.map((segment) => ({
      type: "Feature" as const,
      properties: { color: routeColor(segment.mode) },
      geometry: {
        type: "LineString" as const,
        coordinates: unwrap(geodesic(segment.origin.coordinate, segment.destination.coordinate, 64)),
      },
    })),
  };
}

function routeColor(mode: JourneySegment["mode"]) {
  return {
    flight: "#42a5ff",
    train: "#c35cff",
    car: "#ff5570",
    ferry: "#4ccff2",
  }[mode];
}
