import assert from "node:assert/strict";
import test from "node:test";
import { liveJourneyStatus, parseJourneyWindow, timelineProgressAt } from "../app/timeSync.ts";

test("真实时间映射到 0–1 行程时间轴并在两端钳制", () => {
  assert.equal(timelineProgressAt(0, 10, 20), 0);
  assert.equal(timelineProgressAt(15, 10, 20), 0.5);
  assert.equal(timelineProgressAt(30, 10, 20), 1);
});

test("无效时间段不会启动同步", () => {
  assert.equal(parseJourneyWindow("2026-08-14T10:00", "2026-08-14T09:00"), null);
  assert.ok(parseJourneyWindow("2026-08-14T09:00", "2026-08-14T10:00"));
});

test("同步状态覆盖等待、旅行中和到达", () => {
  assert.equal(liveJourneyStatus(0), "waiting");
  assert.equal(liveJourneyStatus(0.4), "travelling");
  assert.equal(liveJourneyStatus(1), "arrived");
});
