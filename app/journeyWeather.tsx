"use client";

import { useEffect, useState } from "react";
import SFCloudBoltRainFill from "sf-symbols-lib/monochrome/SFCloudBoltRainFill";
import SFCloudDrizzleFill from "sf-symbols-lib/monochrome/SFCloudDrizzleFill";
import SFCloudFill from "sf-symbols-lib/monochrome/SFCloudFill";
import SFCloudFogFill from "sf-symbols-lib/monochrome/SFCloudFogFill";
import SFCloudHeavyrainFill from "sf-symbols-lib/monochrome/SFCloudHeavyrainFill";
import SFCloudMoonFill from "sf-symbols-lib/monochrome/SFCloudMoonFill";
import SFCloudMoonRainFill from "sf-symbols-lib/monochrome/SFCloudMoonRainFill";
import SFCloudRainFill from "sf-symbols-lib/monochrome/SFCloudRainFill";
import SFCloudSnowFill from "sf-symbols-lib/monochrome/SFCloudSnowFill";
import SFCloudSunFill from "sf-symbols-lib/monochrome/SFCloudSunFill";
import SFMoonFill from "sf-symbols-lib/monochrome/SFMoonFill";
import SFSunMaxFill from "sf-symbols-lib/monochrome/SFSunMaxFill";
import type { JourneySegment } from "./journeyData";

export type WeatherPointRole = "origin" | "node" | "destination";
export type WeatherKind = "clear" | "partly-cloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "heavy-rain" | "snow" | "storm";

export type JourneyWeatherCheckpoint = {
  id: WeatherPointRole;
  label: string;
  coordinate: [number, number];
};

export type JourneyWeatherObservation = JourneyWeatherCheckpoint & {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  kind: WeatherKind;
  condition: string;
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
};

const WEATHER_CACHE = new Map<string, Promise<JourneyWeatherObservation>>();

export function journeyWeatherCheckpoints(segment: JourneySegment): JourneyWeatherCheckpoint[] {
  return [
    { id: "origin", label: segment.origin.name, coordinate: segment.origin.coordinate },
    { id: "node", label: "途中节点", coordinate: greatCircleMidpoint(segment.origin.coordinate, segment.destination.coordinate) },
    { id: "destination", label: segment.destination.name, coordinate: segment.destination.coordinate },
  ];
}

export function greatCircleMidpoint(a: [number, number], b: [number, number]): [number, number] {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const degrees = (value: number) => value * 180 / Math.PI;
  const longitudeA = radians(a[0]);
  const latitudeA = radians(a[1]);
  const longitudeB = radians(b[0]);
  const latitudeB = radians(b[1]);
  const x = Math.cos(latitudeA) * Math.cos(longitudeA) + Math.cos(latitudeB) * Math.cos(longitudeB);
  const y = Math.cos(latitudeA) * Math.sin(longitudeA) + Math.cos(latitudeB) * Math.sin(longitudeB);
  const z = Math.sin(latitudeA) + Math.sin(latitudeB);
  const magnitude = Math.hypot(x, y, z);
  if (magnitude < 1e-8) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return [degrees(Math.atan2(y, x)), degrees(Math.asin(z / magnitude))];
}

export function weatherKindForCode(code: number): { kind: WeatherKind; condition: string } {
  if (code === 0) return { kind: "clear", condition: "晴朗" };
  if (code === 1 || code === 2) return { kind: "partly-cloudy", condition: "少云" };
  if (code === 3) return { kind: "cloudy", condition: "多云" };
  if (code === 45 || code === 48) return { kind: "fog", condition: "雾" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", condition: "毛毛雨" };
  if (code === 65 || code === 82) return { kind: "heavy-rain", condition: "大雨" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 81)) return { kind: "rain", condition: "降雨" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", condition: "降雪" };
  if (code >= 95) return { kind: "storm", condition: "雷暴" };
  return { kind: "cloudy", condition: "阴天" };
}

async function fetchCheckpoint(checkpoint: JourneyWeatherCheckpoint) {
  const cacheKey = checkpoint.coordinate.map((value) => value.toFixed(3)).join(",");
  let pending = WEATHER_CACHE.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      const [longitude, latitude] = checkpoint.coordinate;
      const query = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: "temperature_2m,weather_code,is_day",
        timezone: "auto",
        forecast_days: "1",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
      if (!response.ok) throw new Error("天气暂时不可用");
      const data = (await response.json()) as OpenMeteoResponse;
      const temperature = data.current?.temperature_2m;
      const weatherCode = data.current?.weather_code;
      if (typeof temperature !== "number" || typeof weatherCode !== "number") throw new Error("天气数据不完整");
      const weather = weatherKindForCode(weatherCode);
      return {
        ...checkpoint,
        temperature,
        weatherCode,
        isDay: data.current?.is_day !== 0,
        ...weather,
      };
    })();
    WEATHER_CACHE.set(cacheKey, pending);
    pending.catch(() => WEATHER_CACHE.delete(cacheKey));
  }
  return pending;
}

export function useJourneyWeather(segment?: JourneySegment) {
  const [observations, setObservations] = useState<JourneyWeatherObservation[]>([]);

  useEffect(() => {
    if (!segment) {
      const timer = window.setTimeout(() => setObservations([]), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    void Promise.all(journeyWeatherCheckpoints(segment).map((point) => fetchCheckpoint(point)))
      .then((next) => {
        if (!controller.signal.aborted) setObservations(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setObservations([]);
      });
    return () => controller.abort();
  }, [segment]);

  return observations;
}

function weatherGlyph(observation: JourneyWeatherObservation) {
  if (observation.kind === "clear") return observation.isDay ? <SFSunMaxFill size="sm" /> : <SFMoonFill size="sm" />;
  if (observation.kind === "partly-cloudy") return observation.isDay ? <SFCloudSunFill size="sm" /> : <SFCloudMoonFill size="sm" />;
  if (observation.kind === "fog") return <SFCloudFogFill size="sm" />;
  if (observation.kind === "drizzle") return <SFCloudDrizzleFill size="sm" />;
  if (observation.kind === "rain") return observation.isDay ? <SFCloudRainFill size="sm" /> : <SFCloudMoonRainFill size="sm" />;
  if (observation.kind === "heavy-rain") return <SFCloudHeavyrainFill size="sm" />;
  if (observation.kind === "snow") return <SFCloudSnowFill size="sm" />;
  if (observation.kind === "storm") return <SFCloudBoltRainFill size="sm" />;
  return <SFCloudFill size="sm" />;
}

export function JourneyWeatherIcon({ observation }: { observation: JourneyWeatherObservation }) {
  const label = `${observation.label}：${observation.condition}，${Math.round(observation.temperature)}°`;
  return (
    <span className={`journey-weather-symbol is-${observation.kind}`} aria-label={label} title={label}>
      {weatherGlyph(observation)}
    </span>
  );
}
