import type { JourneyMode, JourneySegment } from "./journeyData.ts";

/** Map-preview time, not a claim about the vehicle's real-world speed. */
export const VEHICLE_PLAYBACK_MS: Readonly<Record<JourneyMode, number>> = {
  flight: 18_000,
  train: 25_000,
  car: 31_000,
  ferry: 36_000,
};

export function animationDuration(mode: JourneyMode, speed = 1) {
  return VEHICLE_PLAYBACK_MS[mode] / Math.max(0.25, Number.isFinite(speed) ? speed : 1);
}

/** A cold model must not consume the segment's playback while it is invisible. */
export function createPlaybackClock(initialProgress: number) {
  let progress = Math.max(0, Math.min(1, initialProgress));
  let previous: number | null = null;
  let wasPlaying = false;
  return (now: number, duration: number, playing: boolean) => {
    const elapsed = previous === null ? 0 : Math.max(0, now - previous);
    previous = now;
    if (playing && wasPlaying) progress = Math.min(1, progress + elapsed / Math.max(1, duration));
    wasPlaying = playing;
    return progress;
  };
}

/** Only warm the next different model, not every model on application startup. */
export function nextVehicleKind(segments: JourneySegment[], selectedId: string | null) {
  const index = segments.findIndex(segment => segment.id === selectedId);
  if (index < 0) return null;
  return segments.slice(index + 1).find(segment => segment.mode !== segments[index].mode)?.mode ?? null;
}
