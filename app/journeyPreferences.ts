"use client";

import { useCallback, useEffect, useState } from "react";

export type JourneyPreferences = {
  vehicleScale: number;
  animationSpeed: number;
  motionEnabled: boolean;
};

const STORAGE_KEY = "flighty-everything:journey-preferences:v1";
export const DEFAULT_JOURNEY_PREFERENCES: JourneyPreferences = {
  vehicleScale: 1,
  animationSpeed: 1,
  motionEnabled: true,
};

export function useJourneyPreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_JOURNEY_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<JourneyPreferences> | null;
        if (stored) {
          setPreferences({
            vehicleScale: clamp(stored.vehicleScale, 0.6, 1.8, 1),
            animationSpeed: clamp(stored.animationSpeed, 0.25, 2.5, 1),
            motionEnabled: stored.motionEnabled !== false,
          });
        }
      } catch {
        /* Invalid or unavailable storage falls back to safe animation defaults. */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      /* Preferences remain active for the current session. */
    }
  }, [hydrated, preferences]);

  const update = useCallback((patch: Partial<JourneyPreferences>) => {
    setPreferences((current) => ({
      vehicleScale: clamp(patch.vehicleScale, 0.6, 1.8, current.vehicleScale),
      animationSpeed: clamp(patch.animationSpeed, 0.25, 2.5, current.animationSpeed),
      motionEnabled: patch.motionEnabled ?? current.motionEnabled,
    }));
  }, []);

  const reset = useCallback(() => setPreferences(DEFAULT_JOURNEY_PREFERENCES), []);
  return { preferences, update, reset };
}

function clamp(value: number | undefined, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
