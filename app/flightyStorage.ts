"use client";

import { useCallback, useEffect, useState } from "react";
import type { Flight, Friend } from "./flightyData";

export type Profile = { name: string; color: string; initials: string };
export type WeatherMode = "none" | "global" | "us";
export type MapLayerMode = "standard" | "satellite" | "terrain" | "navigation" | "traffic";

export type FlightyState = {
  profile: Profile | null;
  flights: Flight[];
  friends: Friend[];
  favorites: string[];
  weatherMode: WeatherMode;
  basemap: MapLayerMode;
};

export const EMPTY_FLIGHTY_STATE: FlightyState = {
  profile: null,
  flights: [],
  friends: [],
  favorites: [],
  weatherMode: "none",
  basemap: "satellite",
};

const STORAGE_KEY = "flighty-everything:state:v1";
const MAP_LAYERS = new Set<MapLayerMode>(["standard", "satellite", "terrain", "navigation", "traffic"]);

function dedupeFlights(flights: Flight[]) {
  const seen = new Set<string>();
  return flights.filter((flight) => {
    const key = `${flight.number}|${flight.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useFlightyStore() {
  const [state, setState] = useState<FlightyState>(EMPTY_FLIGHTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Partial<FlightyState>;
          setState({
            ...EMPTY_FLIGHTY_STATE,
            ...stored,
            flights: dedupeFlights(stored.flights ?? []),
            basemap: MAP_LAYERS.has(stored.basemap as MapLayerMode)
              ? stored.basemap as MapLayerMode
              : "satellite",
          });
        }
      } catch { /* A private or full browser store falls back to in-memory state. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Keep the app usable in-memory. */ }
  }, [hydrated, state]);

  const addFlight = useCallback((flight: Flight) => setState((current) => ({
    ...current,
    flights: [flight, ...current.flights.filter((item) => item.id !== flight.id && !(item.number === flight.number && item.date === flight.date))],
  })), []);
  const removeFlight = useCallback((id: string) => setState((current) => ({ ...current, flights: current.flights.filter((flight) => flight.id !== id) })), []);
  const saveProfile = useCallback((profile: Profile) => setState((current) => ({ ...current, profile })), []);
  const addFriend = useCallback((friend: Friend) => setState((current) => ({ ...current, friends: [friend, ...current.friends.filter((item) => item.id !== friend.id)] })), []);
  const removeFriend = useCallback((id: string) => setState((current) => ({ ...current, friends: current.friends.filter((friend) => friend.id !== id) })), []);
  const toggleFavorite = useCallback((code: string) => setState((current) => ({ ...current, favorites: current.favorites.includes(code) ? current.favorites.filter((item) => item !== code) : [...current.favorites, code] })), []);
  const setWeatherMode = useCallback((weatherMode: WeatherMode) => setState((current) => ({ ...current, weatherMode })), []);
  const setBasemap = useCallback((basemap: MapLayerMode) => setState((current) => ({ ...current, basemap })), []);
  const reset = useCallback(() => setState(EMPTY_FLIGHTY_STATE), []);

  return { state, hydrated, addFlight, removeFlight, saveProfile, addFriend, removeFriend, toggleFavorite, setWeatherMode, setBasemap, reset };
}
