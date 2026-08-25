"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type AppearanceMode = "system" | "light" | "dark";
export type ResolvedAppearance = "light" | "dark";

const STORAGE_KEY = "flighty-everything:appearance:v1";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function validMode(value: unknown): value is AppearanceMode {
  return value === "system" || value === "light" || value === "dark";
}

function systemMode(): ResolvedAppearance {
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}

function resolveMode(mode: AppearanceMode): ResolvedAppearance {
  return mode === "system" ? systemMode() : mode;
}

function applyMode(mode: AppearanceMode) {
  const resolved = resolveMode(mode);
  const root = document.documentElement;
  root.dataset.appearance = mode;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#05070a" : "#eef4fb");
  return resolved;
}

function modeSnapshot(): AppearanceMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (validMode(stored)) return stored;
  const value = document.documentElement.dataset.appearance;
  return validMode(value) ? value : "system";
}

function subscribeMode(onChange: () => void) {
  window.addEventListener("flighty-appearance-change", onChange);
  return () => window.removeEventListener("flighty-appearance-change", onChange);
}

function systemSnapshot() {
  return window.matchMedia(SYSTEM_QUERY).matches;
}

function subscribeSystem(onChange: () => void) {
  const query = window.matchMedia(SYSTEM_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useAppearance() {
  const mode = useSyncExternalStore(
    subscribeMode,
    modeSnapshot,
    () => "system" as AppearanceMode,
  );
  const systemDark = useSyncExternalStore(subscribeSystem, systemSnapshot, () => true);
  const resolved: ResolvedAppearance =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    applyMode(mode);
  }, [mode, resolved]);

  const setMode = useCallback((next: AppearanceMode) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    applyMode(next);
    window.dispatchEvent(new Event("flighty-appearance-change"));
  }, []);

  const cycle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  return { mode, resolved, setMode, cycle };
}

export const appearanceLabel: Record<AppearanceMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};
