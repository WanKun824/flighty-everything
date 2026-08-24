import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_JOURNEY_SEGMENTS,
  createJourneySegment,
  formatJourneyDuration,
  journeyStats,
  segmentFromFlight,
} from "../app/journeyData.ts";
import { SAMPLE_FLIGHTS } from "../app/flightyData.ts";

test("sample itinerary includes all four requested transport modes", () => {
  assert.deepEqual(
    new Set(INITIAL_JOURNEY_SEGMENTS.map((segment) => segment.mode)),
    new Set(["flight", "train", "car", "ferry"]),
  );
  assert.equal(INITIAL_JOURNEY_SEGMENTS.length, 5);
});

test("journey builder derives a usable route, service, duration and arrival", () => {
  const segment = createJourneySegment({
    mode: "ferry",
    from: "UNO",
    to: "NAO",
    date: "2026-09-23",
    departure: "10:40",
    note: "1号码头",
  });
  assert.equal(segment.mode, "ferry");
  assert.equal(segment.origin.code, "UNO");
  assert.equal(segment.destination.code, "NAO");
  assert.match(segment.service, /渡轮/);
  assert.ok(segment.durationMinutes >= 12);
  assert.match(segment.arrival, /^\d{2}:\d{2}$/);
  assert.equal(segment.note, "1号码头");
});

test("multi-transport statistics aggregate distance, time and completion", () => {
  const completed = INITIAL_JOURNEY_SEGMENTS.map((segment, index) =>
    index === 0 ? { ...segment, status: "complete" } : segment,
  );
  const stats = journeyStats(completed);
  assert.equal(stats.segments, 5);
  assert.equal(stats.modes, 4);
  assert.equal(stats.completed, 1);
  assert.equal(stats.distanceKm, 3619);
  assert.equal(stats.durationMinutes, 640);
  assert.equal(formatJourneyDuration(stats.durationMinutes), "10小时40分");
});

test("legacy flight records bridge into the unified journey model", () => {
  const segment = segmentFromFlight(SAMPLE_FLIGHTS[0]);
  assert.equal(segment.mode, "flight");
  assert.equal(segment.origin.code, SAMPLE_FLIGHTS[0].from);
  assert.equal(segment.destination.code, SAMPLE_FLIGHTS[0].to);
  assert.equal(segment.service, SAMPLE_FLIGHTS[0].number);
});
