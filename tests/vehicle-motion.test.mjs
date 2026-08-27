import assert from "node:assert/strict";
import test from "node:test";
import { motionStageForProgress, vehicleStageMotion } from "../app/vehicleMotion.ts";

test("all four vehicles expose departure, cruise and arrival motion segments", () => {
  assert.equal(motionStageForProgress(0.05), "departing");
  assert.equal(motionStageForProgress(0.5), "cruising");
  assert.equal(motionStageForProgress(0.95), "arriving");

  for (const kind of ["flight", "car", "train", "ferry"]) {
    const departure = vehicleStageMotion(kind, 0.05);
    const cruise = vehicleStageMotion(kind, 0.5);
    const arrival = vehicleStageMotion(kind, 0.95);
    assert.equal(departure.stage, "departing", kind);
    assert.equal(cruise.stage, "cruising", kind);
    assert.equal(arrival.stage, "arriving", kind);
    if (kind !== "car") {
      assert.ok(cruise.velocity > departure.velocity, `${kind} accelerates into cruise`);
      assert.ok(cruise.velocity > arrival.velocity, `${kind} slows for arrival`);
      assert.ok(cruise.trail > departure.trail, `${kind} trail builds during cruise`);
    }
  }
  assert.ok(vehicleStageMotion("flight", 0.5).lift > vehicleStageMotion("car", 0.5).lift);
  assert.ok(vehicleStageMotion("ferry", 0.5).lift > 0);
});

test("car keeps a constant body and wheel speed through departures, bends and arrivals", () => {
  const samples = [0, 0.05, 0.25, 0.5, 0.82, 0.98, 1].map((progress) => vehicleStageMotion("car", progress));
  assert.ok(samples.every((motion) => motion.lift === 0));
  assert.ok(samples.every((motion) => motion.pitch === 0));
  assert.ok(samples.every((motion) => motion.velocity === 1));
  assert.ok(samples.every((motion) => motion.trail === 0.52));
});

test("vehicle renderer does not force-loss the shared GPU context during mode changes", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
  );
  assert.doesNotMatch(source, /forceContextLoss/);
  assert.match(source, /kind === "car"/);
  assert.match(source, /presentation\.rotation\.set\(0, 0, 0\)/);
});
