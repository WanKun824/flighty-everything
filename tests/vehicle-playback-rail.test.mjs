import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { animationDuration, createPlaybackClock, nextVehicleKind } from "../app/vehiclePlayback.ts";
import { selectedSegmentCamera, createVehicleFollower } from "../app/vehicleFollow.ts";
import { decodeRailPolyline, railGeometryFromLegs } from "../app/railGeometry.ts";
import { journeySegmentPath } from "../app/journeyPath.ts";
import { pointAt } from "../app/routeGeometry.ts";

// Synthetic curved fixture, never presented to the user as real rail data.
const curve = [[8.5, 47.3], [8.51, 47.31], [8.52, 47.315], [8.54, 47.31]];
export function encode(points, precision = 6) {
  let lat = 0, lon = 0;
  return points.map(([x, y]) => {
    const nextLat = Math.round(y * 10 ** precision), nextLon = Math.round(x * 10 ** precision);
    const result = [nextLat - lat, nextLon - lon].map(value => {
      let n = value < 0 ? -value * 2 - 1 : value * 2, encoded = "";
      while (n >= 32) { encoded += String.fromCharCode((n % 32) + 95); n = Math.floor(n / 32); }
      return encoded + String.fromCharCode(n + 63);
    }).join("");
    lat = nextLat; lon = nextLon;
    return result;
  }).join("");
}
const segment = { id: "rail", mode: "train", origin: { coordinate: curve[0] }, destination: { coordinate: curve.at(-1) } };

test("a loading model does not invisibly consume segment time; airplane speed is 85% and other durations stay unchanged", () => {
  const tick = createPlaybackClock(0);
  assert.equal(tick(0, 31000, false), 0);
  assert.equal(tick(10000, 31000, false), 0);
  assert.equal(tick(11000, 31000, true), 0);
  assert.equal(tick(12000, 31000, true), 1 / 31);
  assert.equal(tick(20000, 31000, false), 1 / 31);
  assert.equal(tick(21000, 31000, true), 1 / 31);
  assert.equal(tick(22000, 31000, true), 2 / 31);
  assert.equal(tick(80000, 31000, true), 1);
  assert.deepEqual(["flight", "train", "car", "ferry"].map(mode => animationDuration(mode)), [18000 / .85, 25000, 31000, 36000]);
  assert.equal(animationDuration("car", 2), 15500);
  assert.equal(animationDuration("car", NaN), 31000);
});

test("prewarming prioritizes the next different model without downloading all models", () => {
  const segments = ["flight", "flight", "car", "train"].map((mode, index) => ({ id: String(index), mode }));
  assert.equal(nextVehicleKind(segments, "0"), "car");
  assert.equal(nextVehicleKind(segments, "2"), "train");
  assert.equal(nextVehicleKind(segments, "3"), null);
  assert.equal(nextVehicleKind(segments, null), null);
});

test("segment selections, following and next-segment transitions preserve current user zoom", () => {
  const state = { zoom: 6.75, pitch: 20, bearing: -18, center: [0, 0] };
  const follow = createVehicleFollower({ jumpTo: options => Object.assign(state, options) }, { pin() {}, unpin() {}, move() {} });
  for (const center of curve) {
    Object.assign(state, selectedSegmentCamera(center));
    follow(center, true);
    assert.equal(state.zoom, 6.75);
    assert.equal(state.pitch, 20);
    assert.equal(state.bearing, -18);
  }
  state.zoom = 9.25;
  Object.assign(state, selectedSegmentCamera([139.7, 35.6]));
  assert.equal(state.zoom, 9.25);
});

test("MOTIS precision-6 geometry preserves curves, including eastern longitudes", () => {
  assert.deepEqual(decodeRailPolyline({ points: encode(curve), precision: 6 }), curve);
  const japan = curve.map(([x, y]) => [x + 131, y - 12]);
  const decoded = decodeRailPolyline({ points: encode(japan), precision: 6 });
  decoded.forEach((p, i) => p.forEach((v, axis) => assert.ok(Math.abs(v - japan[i][axis]) < .000001)));
  assert.equal(decodeRailPolyline({ points: "~~~~" }), null);
  assert.equal(decodeRailPolyline({ points: "!!" }), null);
});

test("map line and train use provider geometry and arc length, not endpoint interpolation", () => {
  const railGeometry = railGeometryFromLegs([{ legGeometry: { points: encode(curve) } }], curve[0], curve.at(-1));
  const path = journeySegmentPath({ ...segment, railGeometry });
  assert.equal(path.source, "rail");
  assert.deepEqual(path.coordinates, curve);
  const halfway = pointAt(path, .5);
  assert.ok(halfway.coordinate[1] > 47.31, "train must follow the bend, not the endpoint chord");
  for (let p = 0; p <= 1; p += .01) assert.ok(pointAt(path, p).coordinate.every(Number.isFinite));
  assert.deepEqual(pointAt(path, 0).coordinate, curve[0]);
  assert.deepEqual(pointAt(path, 1).coordinate, curve.at(-1));
});

test("missing, sparse, invalid and disconnected rail geometry is not advertised as a real railway", () => {
  assert.equal(journeySegmentPath(segment).source, "geodesic");
  assert.equal(railGeometryFromLegs([{}], curve[0], curve.at(-1)), undefined);
  assert.equal(railGeometryFromLegs([{ legGeometry: { points: encode([curve[0], curve.at(-1)]) } }], curve[0], curve.at(-1)), undefined);
  assert.equal(railGeometryFromLegs([{ legGeometry: { points: encode(curve.slice(0, 2)) } }, { legGeometry: { points: encode(curve.slice(2)) } }], curve[0], curve.at(-1)), undefined);
  assert.equal(journeySegmentPath({ ...segment, railGeometry: { source: "transitous", coordinates: [[NaN, 4], ...curve] } }).source, "geodesic");
});

test("traffic refresh reuses the vehicle portal target and selection no longer fits bounds", async () => {
  const globe = await readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8");
  assert.match(globe, /if \(!riderElementsRef\.current\)/);
  assert.match(globe, /host: modelHost \} = riderElementsRef\.current/);
  assert.match(globe, /ready && !reduceMotion.matches && motionEnabled/);
  assert.doesNotMatch(globe, /map\.fitBounds/);
  assert.match(globe, /onReady=\{handleVehicleReady\}/);
  assert.match(globe, /coordinates: journeySegmentPath\(segment, traffic\?\.coordinates\)\.coordinates/);
});
