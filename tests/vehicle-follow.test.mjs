import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createVehicleFollower } from "../app/vehicleFollow.ts";

function fixture() {
  const calls = { camera: [], pin: 0, unpin: [], marker: [] };
  const camera = { center: [0, 0], zoom: 5.75, pitch: 0, bearing: 0 };
  const update = createVehicleFollower({
    jumpTo(options) { calls.camera.push(options); Object.assign(camera, options); },
  }, {
    pin() { calls.pin += 1; },
    unpin(coordinate) { calls.unpin.push(coordinate); },
    move(coordinate) { calls.marker.push(coordinate); },
  });
  return { update, calls, camera };
}

for (const refreshRate of [60, 90, 120, 165]) {
  test(`follow advances on every ${refreshRate} Hz animation frame without a 30 Hz gate`, () => {
    const { update, calls } = fixture();
    for (let frame = 0; frame < refreshRate * 2; frame += 1)
      assert.equal(update([139 + frame * .0001, 35], true), true);
    assert.equal(calls.camera.length, refreshRate * 2);
    assert.equal(calls.pin, 1);
    assert.equal(calls.marker.length, 0, "a centered vehicle needs no geographic reprojection");
    for (const options of calls.camera) assert.deepEqual(Object.keys(options), ["center"]);
  });
}

test("follow retains user zoom, pitch and bearing, including changes made while following", () => {
  const { update, camera } = fixture();
  update([139, 35], true);
  camera.zoom = 8.25;
  camera.pitch = 24;
  camera.bearing = -12;
  update([139.001, 35.002], true);
  assert.deepEqual(camera, { center: [139.001, 35.002], zoom: 8.25, pitch: 24, bearing: -12 });
});

test("turning follow off restores one geographic marker without recentering or remounting it", () => {
  const { update, calls } = fixture();
  update([139, 35], false);
  update([139.1, 35], true);
  update([139.2, 35], true);
  update([139.3, 35], false);
  update([139.4, 35], false);
  assert.deepEqual(calls.unpin, [[139.3, 35]]);
  assert.deepEqual(calls.marker, [[139, 35], [139.4, 35]]);
  assert.equal(calls.camera.length, 2);
  update([139.4, 35], true);
  assert.equal(calls.pin, 2);
  assert.equal(calls.camera.length, 3, "re-enabling recenters even if the vehicle is paused");
});

test("paused coordinates do not request redundant camera or marker work", () => {
  const { update, calls } = fixture();
  for (let frame = 0; frame < 120; frame += 1) update([139, 35], true);
  assert.equal(calls.camera.length, 1);
  assert.equal(calls.pin, 1);
  for (let frame = 0; frame < 120; frame += 1) update([139, 35], false);
  assert.equal(calls.unpin.length, 1);
  assert.equal(calls.marker.length, 0);
});

test("the selected segment alone retains the pinned anchor and follow behavior", async () => {
  const globe = await readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8");
  assert.match(globe, /const segment = journeySegments\.find\([\s\S]*?item\.id === selectedJourneySegmentId/);
  assert.doesNotMatch(globe, /preferredSegment|playbackSegments|element\.classList\.replace\(segment\.mode/);
  assert.match(globe, /marker\.remove\(\);[\s\S]*?element\.classList\.add\("is-following"\)/);
  assert.match(globe, /marker\.setLngLat\(coordinate\)\.addTo\(map\)/);
  assert.match(globe, /if \(trail !== publishedTrail\)/);
  assert.match(globe, /followVehicleRef\.current && !map\.isZooming\(\)/);
  assert.match(globe, /map\.dragRotate\.disable\(\)/);
  assert.match(globe, /map\.touchZoomRotate\.disableRotation\(\)/);
  assert.match(globe, /onFollowInterrupted/);
});
