import type { JourneySegment } from "./journeyData";

/** Restore removed items at their original positions, keeping newer edits/adds. */
export function mergeRestoredSegments(before: JourneySegment[], current: JourneySegment[]) {
  const live = new Map(current.map(segment => [segment.id, segment]));
  const previousIds = new Set(before.map(segment => segment.id));
  return [...before.map(segment => live.get(segment.id) ?? segment), ...current.filter(segment => !previousIds.has(segment.id))];
}
