"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_JOURNEY_SEGMENTS, createJourneySegmentBetween, type JourneySegment } from "./journeyData";
import type { WeatherMode } from "./flightyStorage";

export type JourneyMotif = "torii" | "mountain" | "skyline" | "pagoda";

export type JourneyTrip = {
  id: string;
  name: string;
  color: string;
  motif: JourneyMotif;
  segments: JourneySegment[];
  createdAt: string;
  savedToPassportAt: string | null;
};

export type JourneyState = {
  trips: JourneyTrip[];
  activeTripId: string;
  collectionName: string;
  tripName: string;
  segments: JourneySegment[];
  selectedSegmentId: string;
  weatherMode: WeatherMode;
};

const STORAGE_KEY = "flighty-everything:journey:v2";
const LEGACY_STORAGE_KEY = "flighty-everything:journey:v1";
export const TRIP_COLORS = ["#0a84ff", "#ff375f", "#bf5af2", "#ff9f0a", "#30b77a", "#32ade6"];
export const TRIP_MOTIFS: JourneyMotif[] = ["torii", "mountain", "skyline", "pagoda"];

const primaryTrip: JourneyTrip = {
  id: "trip-tokyo-setouchi",
  name: "东京与濑户内 · 八日",
  color: TRIP_COLORS[0],
  motif: "torii",
  segments: INITIAL_JOURNEY_SEGMENTS,
  createdAt: "2026-08-24T00:00:00.000Z",
  savedToPassportAt: "2026-08-24T00:00:00.000Z",
};

const weekendTrip: JourneyTrip = {
  id: "trip-hong-kong-weekend",
  name: "香港周末 · 海与城",
  color: TRIP_COLORS[1],
  motif: "skyline",
  segments: [],
  createdAt: "2026-08-25T00:00:00.000Z",
  savedToPassportAt: "2026-08-25T00:00:00.000Z",
};

export const INITIAL_JOURNEY_STATE: JourneyState = {
  trips: [primaryTrip, weekendTrip],
  activeTripId: primaryTrip.id,
  collectionName: "我的行程",
  tripName: primaryTrip.name,
  segments: primaryTrip.segments,
  selectedSegmentId: primaryTrip.segments[0].id,
  weatherMode: "none",
};

function activePatch(
  current: JourneyState,
  updates: Partial<Pick<JourneyState, "tripName" | "segments" | "selectedSegmentId">>,
) {
  const tripName = updates.tripName ?? current.tripName;
  const segments = updates.segments ?? current.segments;
  const selectedSegmentId = updates.selectedSegmentId ?? current.selectedSegmentId;
  return {
    ...current,
    ...updates,
    tripName,
    segments,
    selectedSegmentId,
    trips: current.trips.map((trip) =>
      trip.id === current.activeTripId
        ? { ...trip, name: tripName, segments }
        : trip,
    ),
  };
}

function normalizeSegments(segments: JourneySegment[]) {
  const seeded = new Map(INITIAL_JOURNEY_SEGMENTS.map((segment) => [segment.id, segment]));
  return segments.map((segment) => {
    const baseline = seeded.get(segment.id);
    if (!baseline?.operational || segment.operational) return segment;
    return {
      ...segment,
      operational: baseline.operational,
    };
  });
}

function samePlace(
  left: JourneySegment["destination"],
  right: JourneySegment["origin"],
) {
  if (left.code.trim().toUpperCase() === right.code.trim().toUpperCase()) return true;
  const [leftLongitude, leftLatitude] = left.coordinate;
  const [rightLongitude, rightLatitude] = right.coordinate;
  return Math.hypot(leftLongitude - rightLongitude, leftLatitude - rightLatitude) < 0.025;
}

function segmentIdentity(segment: JourneySegment) {
  return [
    segment.mode,
    segment.service.trim().toUpperCase(),
    segment.origin.code.trim().toUpperCase(),
    segment.destination.code.trim().toUpperCase(),
    segment.date,
    segment.departure,
    segment.arrival,
  ].join("|");
}

export function splitContinuousSegments(segments: JourneySegment[]) {
  const identities = new Set<string>();
  const unique = segments.filter((segment) => {
    const identity = segmentIdentity(segment);
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
  const chains: JourneySegment[][] = [];
  for (const segment of unique) {
    const current = chains.at(-1);
    if (!current?.length || !samePlace(current.at(-1)!.destination, segment.origin)) {
      chains.push([segment]);
    } else {
      current.push(segment);
    }
  }
  return chains;
}

function splitTrip(trip: JourneyTrip) {
  const chains = splitContinuousSegments(trip.segments);
  if (!chains.length) return [{ ...trip, segments: [] }];
  return chains.map((segments, index) => ({
    ...trip,
    id: index === 0 ? trip.id : `${trip.id}-continued-${index + 1}`,
    name: index === 0 ? trip.name : `${trip.name} · ${index + 1}`,
    segments,
  }));
}

function normalizeState(stored: Partial<JourneyState> | null): JourneyState {
  if (!stored) return INITIAL_JOURNEY_STATE;
  if (Array.isArray(stored.trips) && stored.trips.length) {
    const sourceTrips = stored.trips.filter((trip): trip is JourneyTrip =>
      Boolean(trip?.id && trip?.name && Array.isArray(trip?.segments)),
    ).map((trip) => ({
      ...trip,
      segments: normalizeSegments(trip.segments),
      savedToPassportAt: trip.savedToPassportAt === null
        ? null
        : (trip.savedToPassportAt ?? trip.createdAt ?? new Date().toISOString()),
    }));
    // Trip membership is an explicit user choice; do not split it on reload.
    const trips = sourceTrips;
    if (!trips.length) return INITIAL_JOURNEY_STATE;
    const active = trips.find((trip) =>
      trip.segments.some((segment) => segment.id === stored.selectedSegmentId),
    ) ?? trips.find((trip) => trip.id === stored.activeTripId) ?? trips[0];
    const selectedSegmentId = active.segments.some((segment) => segment.id === stored.selectedSegmentId)
      ? (stored.selectedSegmentId as string)
      : (active.segments[0]?.id ?? "");
    return {
      trips,
      activeTripId: active.id,
      collectionName: stored.collectionName?.trim() || "我的行程",
      tripName: active.name,
      segments: active.segments,
      selectedSegmentId,
      weatherMode: stored.weatherMode ?? "none",
    };
  }
  const segments = normalizeSegments(Array.isArray(stored.segments) && stored.segments.length
    ? stored.segments
    : INITIAL_JOURNEY_SEGMENTS);
  const migrated: JourneyTrip = {
    ...primaryTrip,
    name: stored.tripName?.trim() || primaryTrip.name,
    segments,
    savedToPassportAt: stored.trips?.[0]?.savedToPassportAt ?? primaryTrip.savedToPassportAt,
  };
  const migratedTrips = splitTrip(migrated);
  const active = migratedTrips.find((trip) =>
    trip.segments.some((segment) => segment.id === stored.selectedSegmentId),
  ) ?? migratedTrips[0];
  return {
    trips: [...migratedTrips, weekendTrip],
    activeTripId: active.id,
    collectionName: stored.collectionName?.trim() || "我的行程",
    tripName: active.name,
    segments: active.segments,
    selectedSegmentId: active.segments.some((segment) => segment.id === stored.selectedSegmentId)
      ? (stored.selectedSegmentId as string)
      : (active.segments[0]?.id ?? ""),
    weatherMode: stored.weatherMode ?? "none",
  };
}

export function useJourneyStore() {
  const [state, setState] = useState<JourneyState>(INITIAL_JOURNEY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
          ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) setState(normalizeState(JSON.parse(raw) as Partial<JourneyState>));
      } catch {
        /* Keep the sample journeys available when storage is unavailable. */
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

  const selectTrip = useCallback((activeTripId: string) => {
    setState((current) => {
      const trip = current.trips.find((item) => item.id === activeTripId);
      if (!trip) return current;
      return {
        ...current,
        activeTripId,
        tripName: trip.name,
        segments: trip.segments,
        selectedSegmentId: trip.segments[0]?.id ?? "",
      };
    });
  }, []);

  const createTrip = useCallback((name = "我的新行程") => {
    setState((current) => {
      const index = current.trips.length;
      const trip: JourneyTrip = {
        id: `trip-${Date.now()}`,
        name: name.trim() || "我的新行程",
        color: TRIP_COLORS[index % TRIP_COLORS.length],
        motif: TRIP_MOTIFS[index % TRIP_MOTIFS.length],
        segments: [],
        createdAt: new Date().toISOString(),
        savedToPassportAt: null,
      };
      return {
        ...current,
        trips: [...current.trips, trip],
        activeTripId: trip.id,
        tripName: trip.name,
        segments: [],
        selectedSegmentId: "",
      };
    });
  }, []);

  const createTripWithSegments = useCallback((name: string, incoming: JourneySegment[]) => {
    if (!incoming.length) return;
    setState((current) => {
      const index = current.trips.length;
      const first = incoming[0];
      const final = incoming.at(-1)!;
      const segments = splitContinuousSegments(incoming).flat();
      const trip: JourneyTrip = {
        id: `trip-${Date.now()}`,
        name: name.trim() || `${first.origin.city} → ${final.destination.city}`,
        color: TRIP_COLORS[index % TRIP_COLORS.length],
        motif: TRIP_MOTIFS[index % TRIP_MOTIFS.length],
        segments,
        createdAt: new Date().toISOString(),
        savedToPassportAt: null,
      };
      return {
        ...current,
        trips: [...current.trips, trip],
        activeTripId: trip.id,
        tripName: trip.name,
        segments,
        selectedSegmentId: segments[0]?.id ?? "",
      };
    });
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setState((current) => {
      if (current.trips.length <= 1) return current;
      const trips = current.trips.filter((trip) => trip.id !== id);
      if (id !== current.activeTripId) return { ...current, trips };
      const active = trips[0];
      return {
        ...current,
        trips,
        activeTripId: active.id,
        tripName: active.name,
        segments: active.segments,
        selectedSegmentId: active.segments[0]?.id ?? "",
      };
    });
  }, []);

  const updateTripAppearance = useCallback((color: string, motif: JourneyMotif) => {
    setState((current) => ({
      ...current,
      trips: current.trips.map((trip) =>
        trip.id === current.activeTripId ? { ...trip, color, motif } : trip,
      ),
    }));
  }, []);

  const selectSegment = useCallback((selectedSegmentId: string) =>
    setState((current) => ({ ...current, selectedSegmentId })), []);

  const setWeatherMode = useCallback((weatherMode: WeatherMode) =>
    setState((current) => ({ ...current, weatherMode })), []);

  const renameTrip = useCallback((tripName: string) =>
    setState((current) => activePatch(current, {
      tripName: tripName.trim() || current.tripName,
    })), []);

  const renameCollection = useCallback((collectionName: string) =>
    setState((current) => ({
      ...current,
      collectionName: collectionName.trim() || current.collectionName,
    })), []);

  const renameTripById = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((current) => {
      if (id === current.activeTripId) return activePatch(current, { tripName: trimmed });
      return {
        ...current,
        trips: current.trips.map((trip) => trip.id === id ? { ...trip, name: trimmed } : trip),
      };
    });
  }, []);

  const saveCurrentTripToPassport = useCallback(() => {
    setState((current) => ({
      ...current,
      trips: current.trips.map((trip) => trip.id === current.activeTripId
        ? { ...trip, name: current.tripName, segments: current.segments, savedToPassportAt: new Date().toISOString() }
        : trip),
    }));
  }, []);

  const addSegments = useCallback((incoming: JourneySegment[]) => {
    if (!incoming.length) return;
    setState((current) => {
      const ids = new Set(incoming.map((segment) => segment.id));
      let activeTripId = current.activeTripId;
      let tripName = current.tripName;
      let segments = current.segments.filter((segment) => !ids.has(segment.id));
      let trips = current.trips.map((trip) => trip.id === current.activeTripId
        ? { ...trip, segments }
        : trip);
      let selectedSegmentId = current.selectedSegmentId;

      for (const chain of splitContinuousSegments(incoming)) {
        const last = segments.at(-1);
        if (!segments.length || (last && samePlace(last.destination, chain[0].origin))) {
          segments = [...segments, ...chain];
          selectedSegmentId = chain.at(-1)?.id ?? selectedSegmentId;
          trips = trips.map((trip) => trip.id === activeTripId ? { ...trip, segments } : trip);
          continue;
        }

        const index = trips.length;
        const first = chain[0];
        const final = chain.at(-1)!;
        const trip: JourneyTrip = {
          id: `trip-${Date.now()}-${index}`,
          name: `${first.origin.city} → ${final.destination.city}`,
          color: TRIP_COLORS[index % TRIP_COLORS.length],
          motif: TRIP_MOTIFS[index % TRIP_MOTIFS.length],
          segments: chain,
          createdAt: new Date().toISOString(),
          savedToPassportAt: null,
        };
        trips = [...trips, trip];
        activeTripId = trip.id;
        tripName = trip.name;
        segments = chain;
        selectedSegmentId = final.id;
      }

      return {
        ...current,
        trips,
        activeTripId,
        tripName,
        segments,
        selectedSegmentId,
      };
    });
  }, []);

  const addSegmentsToActiveTrip = useCallback((incoming: JourneySegment[]) => {
    if (!incoming.length) return;
    setState((current) => {
      const identities = new Set(current.segments.map(segmentIdentity));
      const additions = incoming.filter((segment) => {
        const identity = segmentIdentity(segment);
        if (identities.has(identity)) return false;
        identities.add(identity);
        return true;
      });
      if (!additions.length) return current;
      return activePatch(current, {
        segments: [...current.segments, ...additions],
        selectedSegmentId: additions[0].id,
      });
    });
  }, []);

  const addSegment = useCallback((segment: JourneySegment) => addSegments([segment]), [addSegments]);

  const updateSegment = useCallback((segment: JourneySegment) => {
    setState((current) => {
      const previous = current.segments.find((item) => item.id === segment.id);
      const next = previous && previous.mode !== segment.mode
        ? {
            ...createJourneySegmentBetween({
              mode: segment.mode,
              origin: segment.origin,
              destination: segment.destination,
              date: segment.date,
              departure: segment.departure,
              note: segment.note,
              title: segment.title,
            }),
            id: segment.id,
            date: segment.date,
            status: segment.status,
            progress: segment.progress,
          }
        : segment;
      return activePatch(current, {
        segments: current.segments.map((item) => item.id === segment.id ? next : item),
        selectedSegmentId: segment.id,
      });
    });
  }, []);

  const removeSegment = useCallback((id: string) => {
    setState((current) => {
      const segments = current.segments.filter((segment) => segment.id !== id);
      return activePatch(current, {
        segments,
        selectedSegmentId: current.selectedSegmentId === id
          ? (segments[0]?.id ?? "")
          : current.selectedSegmentId,
      });
    });
  }, []);

  const restoreSegments = useCallback((segments: JourneySegment[], selectedSegmentId = "") => {
    setState((current) => activePatch(current, {
      segments,
      selectedSegmentId: segments.some((segment) => segment.id === selectedSegmentId)
        ? selectedSegmentId
        : (segments[0]?.id ?? ""),
    }));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setState((current) => activePatch(current, {
      segments: current.segments.map((segment) =>
        segment.id === id
          ? {
              ...segment,
              status: segment.status === "complete" ? "upcoming" : "complete",
              progress: segment.status === "complete" ? 0 : 1,
            }
          : segment,
      ),
    }));
  }, []);

  const restartTrip = useCallback(() => {
    setState((current) => activePatch(current, {
      segments: current.segments.map((segment, index) => ({
        ...segment,
        status: index === 0 ? "active" : "upcoming",
        progress: 0,
      })),
      selectedSegmentId: current.segments[0]?.id ?? "",
    }));
  }, []);

  const advanceSegment = useCallback((id: string) => {
    setState((current) => {
      const index = current.segments.findIndex((segment) => segment.id === id);
      if (index < 0) return current;
      const next = current.segments[index + 1];
      const segments = current.segments.map((segment, segmentIndex) => {
        if (segmentIndex === index) return { ...segment, status: "complete" as const, progress: 1 };
        if (next && segmentIndex === index + 1) return { ...segment, status: "active" as const, progress: 0 };
        return segment;
      });
      return activePatch(current, {
        segments,
        selectedSegmentId: next?.id ?? id,
      });
    });
  }, []);

  const reset = useCallback(() => setState(INITIAL_JOURNEY_STATE), []);

  return {
    state,
    hydrated,
    selectTrip,
    createTrip,
    createTripWithSegments,
    deleteTrip,
    updateTripAppearance,
    selectSegment,
    setWeatherMode,
    renameCollection,
    renameTrip,
    renameTripById,
    saveCurrentTripToPassport,
    addSegment,
    addSegments,
    addSegmentsToActiveTrip,
    updateSegment,
    removeSegment,
    restoreSegments,
    toggleComplete,
    restartTrip,
    advanceSegment,
    reset,
  };
}
