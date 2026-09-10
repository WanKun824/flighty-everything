// Kept dependency-free so the same parser runs in the server and native HTTP bridge.
function haversineKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * rad / 2) ** 2
    + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function railDistanceKm(coordinates: [number, number][]) {
  return coordinates.slice(1).reduce((km, point, index) => km + haversineKm(coordinates[index], point), 0);
}

export type RailGeometry = {
  source: "transitous";
  coordinates: [number, number][];
  fetchedAt: string;
};

export type EncodedRailPolyline = { points?: string; precision?: number };

/** MOTIS v6 uses Google polyline, precision 6 (lat/lon -> Mapbox lon/lat). */
export function decodeRailPolyline(geometry?: EncodedRailPolyline): [number, number][] | null {
  if (!geometry?.points || geometry.points.length > 1_000_000) return null;
  const precision = geometry.precision ?? 6;
  if (!Number.isInteger(precision) || precision < 5 || precision > 7) return null;
  const scale = 10 ** precision;
  const points: [number, number][] = [];
  let cursor = 0;
  let latitude = 0;
  let longitude = 0;
  const read = () => {
    let value = 0;
    let shift = 0;
    while (cursor < geometry.points!.length && shift < 40) {
      const byte = geometry.points!.charCodeAt(cursor++) - 63;
      if (byte < 0 || byte > 63) throw new Error("Invalid polyline");
      value += (byte & 31) * 2 ** shift;
      if (byte < 32) return value % 2 ? -(value + 1) / 2 : value / 2;
      shift += 5;
    }
    throw new Error("Truncated polyline");
  };
  try {
    while (cursor < geometry.points.length) {
      latitude += read();
      longitude += read();
      const point: [number, number] = [longitude / scale, latitude / scale];
      if (Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90 || points.length >= 100_000) return null;
      const previous = points.at(-1);
      if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) points.push(point);
    }
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
}

export function validRailCoordinates(points: unknown, from: [number, number], to: [number, number]): points is [number, number][] {
  if (!Array.isArray(points) || points.length < 3 || points.length > 100_000) return false;
  if (!points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) return false;
  if (haversineKm(points[0], from) > 2 || haversineKm(points.at(-1), to) > 2) return false;
  // Reject sparse stop-to-stop chords as well as corrupt/disconnected geometry.
  return points.slice(1).every((p, index) => haversineKm(points[index], p) <= 25);
}

export function railGeometryFromLegs(
  legs: Array<{ legGeometry?: EncodedRailPolyline }>,
  from: [number, number],
  to: [number, number],
): RailGeometry | undefined {
  const coordinates: [number, number][] = [];
  for (const leg of legs) {
    const part = decodeRailPolyline(leg.legGeometry);
    if (!part) return undefined;
    // Never send a train across an unmapped walking transfer between stations.
    if (coordinates.length && haversineKm(coordinates.at(-1)!, part[0]) > 0.05) return undefined;
    coordinates.push(...(coordinates.length ? part.slice(1) : part));
  }
  if (!validRailCoordinates(coordinates, from, to)) return undefined;
  return { source: "transitous", coordinates, fetchedAt: new Date().toISOString() };
}
