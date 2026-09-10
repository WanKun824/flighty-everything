import type { JourneySegment } from "./journeyData.ts";
import { geodesic, measure, unwrap, type LatLon } from "./routeGeometry.ts";
import { validRailCoordinates } from "./railGeometry.ts";

/** Line drawing and vehicle movement must use the exact same measured geometry. */
export function journeySegmentPath(segment: JourneySegment, road?: LatLon[]) {
  if (segment.mode === "train" && segment.railGeometry?.source === "transitous"
    && validRailCoordinates(segment.railGeometry.coordinates, segment.origin.coordinate, segment.destination.coordinate)) {
    return measure("train", unwrap(segment.railGeometry.coordinates), "rail");
  }
  if (segment.mode === "car" && road?.length) return measure("car", unwrap(road), "road");
  return measure(segment.mode, unwrap(geodesic(segment.origin.coordinate, segment.destination.coordinate, 128)), "geodesic");
}

export function railRouteLabel(segment: JourneySegment) {
  return journeySegmentPath(segment).source === "rail"
    ? "列车线路 · Transitous"
    : "线路示意 · 暂无铁路轨迹，请查询有线路覆盖的真实列车";
}
