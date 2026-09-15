import test from 'node:test';
import assert from 'node:assert/strict';
import { arrivalEvidence, freshLocation, journeyPhase, realScheduleProblem, zonedPlanTime } from '../app/realJourney.ts';

const segment = { id: 'test', mode: 'flight', status: 'upcoming', destination: { kind: 'airport', coordinate: [114, 22] },
  travelPlan: { mode: 'real', departureAt: '2026-09-15T01:00:00Z', arrivalAt: '2026-09-15T05:00:00Z', timeZone: 'Asia/Hong_Kong' } };
const now = Date.parse('2026-09-15T05:00:00Z');
const fix = { longitude: 114, latitude: 22, accuracy: 15, timestamp: now, speed: 0 };

test('explicit zone and next-day time resolve independently of the device zone', () => {
  assert.equal(zonedPlanTime('2026-09-15', '09:00', 'Asia/Hong_Kong'), '2026-09-15T01:00:00.000Z');
  assert.equal(zonedPlanTime('2026-09-15', '09:00', 'America/Los_Angeles'), '2026-09-15T16:00:00.000Z');
  assert.equal(realScheduleProblem('2026-09-15', '23:00', '2026-09-16', '02:00', 'Asia/Tokyo'), null);
  assert.ok(realScheduleProblem('2026-09-15', '23:00', '2026-09-15', '02:00', 'Asia/Tokyo'));
});
test('invalid dates, zones, DST gaps and repeated wall times are rejected', () => {
  for (const args of [['2026-02-30','09:00','UTC'], ['2026-09-15','09:00','bad/zone'], ['2026-03-08','02:30','America/New_York'], ['2026-11-01','01:30','America/New_York']]) assert.equal(zonedPlanTime(...args), null);
});
test('schedule expiry is not evidence of arrival; simulation is labelled explicitly', () => {
  assert.equal(journeyPhase(segment, now + 86400000).label, '计划已到时 · 待确认到达');
  assert.equal(journeyPhase({...segment, travelPlan: undefined}, now).label, '模拟预览');
  assert.equal(journeyPhase({...segment, status:'complete'}, now).label, '已到达');
});
test('arrival needs repeated fresh accurate fixes and a 45-second stop', () => {
  let evidence = arrivalEvidence(segment, fix, now, null);
  assert.equal(evidence.arrived, false);
  for (const seconds of [15, 30, 45]) evidence = arrivalEvidence(segment, {...fix,timestamp:now+seconds*1000}, now+seconds*1000,evidence);
  assert.equal(evidence.arrived, true);
  assert.equal(arrivalEvidence(segment, {...fix, speed: 90}, now, evidence), null);
  assert.equal(arrivalEvidence(segment, {...fix, accuracy: 500}, now, evidence), null);
  assert.equal(arrivalEvidence(segment, {...fix, longitude: 115}, now, evidence), null);
  assert.equal(arrivalEvidence({...segment, travelPlan:{...segment.travelPlan,mode:'simulation'}}, fix, now, evidence), null);
  assert.equal(arrivalEvidence(segment, {...fix,timestamp:now-60000},now,evidence), null);
  assert.equal(arrivalEvidence(segment, {...fix,timestamp:now+90000},now+90000,evidence).arrived, false);
});
test('old or inaccurate position is never shown as live', () => {
  assert.equal(freshLocation(fix,now),true);
  assert.equal(freshLocation(fix,now+31000),false);
  assert.equal(freshLocation({...fix,accuracy:101},now),false);
  assert.equal(freshLocation({...fix,latitude:NaN},now),false);
});
