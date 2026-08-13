export type JourneyClockMode = "preview" | "live";

export function timelineProgressAt(nowMs: number, startMs: number, endMs: number): number {
  if (![nowMs, startMs, endMs].every(Number.isFinite) || endMs <= startMs) return 0;
  return Math.max(0, Math.min(1, (nowMs - startMs) / (endMs - startMs)));
}

export function parseJourneyWindow(start: string, end: string): { startMs: number; endMs: number } | null {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? { startMs, endMs } : null;
}

export function liveJourneyStatus(progress: number): "waiting" | "travelling" | "arrived" {
  if (progress <= 0) return "waiting";
  if (progress >= 1) return "arrived";
  return "travelling";
}
