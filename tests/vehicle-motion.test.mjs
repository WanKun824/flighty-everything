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
    assert.ok(cruise.velocity > departure.velocity, `${kind} accelerates into cruise`);
    assert.ok(cruise.velocity > arrival.velocity, `${kind} slows for arrival`);
    assert.ok(cruise.trail > departure.trail, `${kind} trail builds during cruise`);
  }
  assert.ok(vehicleStageMotion("flight", 0.5).lift > vehicleStageMotion("car", 0.5).lift);
  assert.ok(vehicleStageMotion("ferry", 0.5).lift > 0);
});
