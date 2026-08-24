"use client";

import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useState } from "react";

export type AppPlatform = "web" | "ios" | "android";
export type PlatformPreference = "auto" | AppPlatform;

const STORAGE_KEY = "manyou:platform-preference";

export function nativePlatform(): AppPlatform {
  const value = Capacitor.getPlatform();
  return value === "ios" || value === "android" ? value : "web";
}

export function platformFromQuery(search: string): AppPlatform | null {
  const value = new URLSearchParams(search).get("platform");
  return value === "ios" || value === "android" || value === "web" ? value : null;
}

export function resolvePlatform(preference: PlatformPreference, detected: AppPlatform): AppPlatform {
  return preference === "auto" ? detected : preference;
}

export function usePlatformMode() {
  const [preference, setPreferenceState] = useState<PlatformPreference>("auto");
  const [platform, setPlatform] = useState<AppPlatform>("web");

  useEffect(() => {
    const query = platformFromQuery(window.location.search);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const saved: PlatformPreference = stored === "ios" || stored === "android" || stored === "web" ? stored : "auto";
    const nextPreference = query ?? saved;
    const nextPlatform = resolvePlatform(nextPreference, nativePlatform());
    // Hydration intentionally starts from the web-safe server default, then synchronizes with the native shell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferenceState(nextPreference);
    setPlatform(nextPlatform);
    document.documentElement.dataset.platform = nextPlatform;
  }, []);

  const setPreference = useCallback((next: PlatformPreference) => {
    const resolved = resolvePlatform(next, nativePlatform());
    setPreferenceState(next);
    setPlatform(resolved);
    document.documentElement.dataset.platform = resolved;
    if (next === "auto") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { platform, preference, setPreference };
}
