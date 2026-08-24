"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { initialTripStops, type TripStop } from "./trip";

/**
 * 行程存储：把「当前行程」和「已保存的命名行程」都落到 localStorage。
 *
 * 项目没有后端（db/schema.ts 是空的），全部状态本来刷新即丢。这里补一层本地持久化：
 * - 当前行程每次变化自动落盘，刷新后回到同一段行程。
 * - 「保存到行程库」把当前行程固化成一条带名字的记录，可载入、可删除。
 *
 * 这只是浏览器本地存储：换设备、换浏览器都不会同步。要跨端同步得等真正的后端。
 */

export type SavedTrip = {
  id: string;
  name: string;
  stops: TripStop[];
  savedAt: number;
};

const CURRENT_KEY = "manyou:current-trip";
const LIBRARY_KEY = "manyou:trips";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储满了或隐私模式禁用 localStorage 时静默失败，不影响页面本身。
  }
}

/** 一个可用的行程至少要有两站（少于两站线形和时间轴都会退化）。 */
function isValidStops(stops: unknown): stops is TripStop[] {
  return Array.isArray(stops) && stops.length >= 2;
}

export function defaultTripName(stops: TripStop[]): string {
  if (stops.length < 2) return stops[0] ? `${stops[0].city} 之旅` : "未命名行程";
  return `${stops[0].city} → ${stops[stops.length - 1].city}`;
}

export function useTripStore() {
  // 初始值只读一次：有存过的当前行程就用它，否则落回示例行程。
  const [stops, setStopsState] = useState<TripStop[]>(() => {
    const saved = readJson<TripStop[]>(CURRENT_KEY, initialTripStops);
    return isValidStops(saved) ? saved : initialTripStops;
  });
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => {
    const saved = readJson<SavedTrip[]>(LIBRARY_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  // 当前行程每次变化都自动落盘；行程库变化也落盘。两条都只在客户端跑。
  useEffect(() => { writeJson(CURRENT_KEY, stops); }, [stops]);
  useEffect(() => { writeJson(LIBRARY_KEY, savedTrips); }, [savedTrips]);

  const setStops = useCallback((updater: SetStateAction<TripStop[]>) => setStopsState(updater), []);

  const saveTrip = useCallback((name: string) => {
    const trip: SavedTrip = {
      id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || defaultTripName(stops),
      stops,
      savedAt: Date.now(),
    };
    setSavedTrips((current) => [trip, ...current]);
    return trip;
  }, [stops]);

  const loadTrip = useCallback((id: string) => {
    const trip = savedTrips.find((item) => item.id === id);
    if (trip) setStopsState(trip.stops);
  }, [savedTrips]);

  const deleteTrip = useCallback((id: string) => {
    setSavedTrips((current) => current.filter((item) => item.id !== id));
  }, []);

  const resetTrip = useCallback(() => setStopsState(initialTripStops), []);

  return { stops, setStops, savedTrips, saveTrip, loadTrip, deleteTrip, resetTrip };
}
