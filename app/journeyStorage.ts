"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_JOURNEY_SEGMENTS, type JourneySegment } from "./journeyData";
import type { WeatherMode } from "./flightyStorage";

export type JourneyState = {
  tripName: string;
  segments: JourneySegment[];
  selectedSegmentId: string;
  weatherMode: WeatherMode;
};

const STORAGE_KEY = "flighty-everything:journey:v1";

export const INITIAL_JOURNEY_STATE: JourneyState = {
  tripName: "东京与濑户内 · 八日",
  segments: INITIAL_JOURNEY_SEGMENTS,
  selectedSegmentId: INITIAL_JOURNEY_SEGMENTS[0].id,
  weatherMode: "none",
};

export function useJourneyStore() {
  const [state, setState] = useState<JourneyState>(INITIAL_JOURNEY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Partial<JourneyState>;
          const segments =
            Array.isArray(stored.segments) && stored.segments.length
              ? stored.segments
              : INITIAL_JOURNEY_SEGMENTS;
          setState({
            ...INITIAL_JOURNEY_STATE,
            ...stored,
            segments,
            selectedSegmentId: segments.some(
              (segment) => segment.id === stored.selectedSegmentId,
            )
              ? (stored.selectedSegmentId as string)
              : segments[0].id,
          });
        }
      } catch {
        /* Keep the sample journey available when storage is unavailable. */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Continue in memory. */
    }
  }, [hydrated, state]);

  const selectSegment = useCallback(
    (selectedSegmentId: string) =>
      setState((current) => ({ ...current, selectedSegmentId })),
    [],
  );
  const setWeatherMode = useCallback(
    (weatherMode: WeatherMode) =>
      setState((current) => ({ ...current, weatherMode })),
    [],
  );
  const renameTrip = useCallback(
    (tripName: string) =>
      setState((current) => ({
        ...current,
        tripName: tripName.trim() || current.tripName,
      })),
    [],
  );
  const addSegment = useCallback(
    (segment: JourneySegment) =>
      setState((current) => ({
        ...current,
        segments: [
          ...current.segments.filter((item) => item.id !== segment.id),
          segment,
        ],
        selectedSegmentId: segment.id,
      })),
    [],
  );
  const removeSegment = useCallback(
    (id: string) =>
      setState((current) => {
        const segments = current.segments.filter(
          (segment) => segment.id !== id,
        );
        return {
          ...current,
          segments,
          selectedSegmentId: segments[0]?.id ?? "",
        };
      }),
    [],
  );
  const toggleComplete = useCallback(
    (id: string) =>
      setState((current) => ({
        ...current,
        segments: current.segments.map((segment) =>
          segment.id === id
            ? {
                ...segment,
                status: segment.status === "complete" ? "upcoming" : "complete",
                progress: segment.status === "complete" ? 0 : 1,
              }
            : segment,
        ),
      })),
    [],
  );
  const reset = useCallback(() => setState(INITIAL_JOURNEY_STATE), []);

  return {
    state,
    hydrated,
    selectSegment,
    setWeatherMode,
    renameTrip,
    addSegment,
    removeSegment,
    toggleComplete,
    reset,
  };
}
