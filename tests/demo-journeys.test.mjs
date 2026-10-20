import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_JOURNEY_TRIPS } from '../app/demoJourneys.ts';
import { journeyStats } from '../app/journeyData.ts';
import { passportTrips, passportYears, sameJourneyPlace } from '../app/journeyLifecycle.ts';

const segments = DEMO_JOURNEY_TRIPS.flatMap(trip => trip.segments);
test('first-run examples contain three explicit demo trips and all four transport modes', () => {
  assert.equal(DEMO_JOURNEY_TRIPS.length, 3);
  assert.equal(segments.length, 8);
  assert.equal(new Set(segments.map(s => s.id)).size, 8);
  assert.deepEqual([...new Set(segments.map(s => s.mode))].sort(), ['car', 'ferry', 'flight', 'train']);
  for (const trip of DEMO_JOURNEY_TRIPS) {
    assert.match(trip.name, /演示/);
    for (let i = 1; i < trip.segments.length; i++) assert.ok(sameJourneyPlace(trip.segments[i - 1].destination, trip.segments[i].origin));
  }
});
test('completed demo data produces nonzero reproducible year and travel statistics', () => {
  const stats = journeyStats(segments);
  assert.equal(stats.segments, 8);
  assert.equal(stats.distanceKm, 7160);
  assert.equal(stats.durationMinutes, 1500);
  assert.equal(stats.modes, 4);
  assert.deepEqual(passportYears(DEMO_JOURNEY_TRIPS), ['2026', '2025']);
  assert.equal(passportTrips(DEMO_JOURNEY_TRIPS, '2025').flatMap(t => t.segments).length, 2);
});
test('fictional records do not masquerade as live operational data', () => {
  for (const s of segments) {
    assert.equal(s.operational.source, 'manual');
    assert.equal(s.operational.realtime, false);
    assert.match(s.operational.sourceLabel, /非真实出行/);
    assert.ok(!s.operational.position && !s.railGeometry);
    assert.ok(s.distanceKm > 0 && s.durationMinutes > 0);
    assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const p of [s.origin, s.destination]) assert.ok(p.coordinate.every(Number.isFinite));
  }
});
