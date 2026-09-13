import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { localInputDate, recentJourneyPlaces, routeInputProblem, suggestedJourneyName } from '../app/composerLogic.ts';

const hkg = { code: 'HKG', city: '香港', coordinate: [113.918, 22.308] };
const hnd = { code: 'HND', city: '东京', coordinate: [139.78, 35.55] };
const ord = { code: 'ORD', city: '芝加哥', coordinate: [-87.9, 41.97] };
const lhr = { code: 'LHR', city: '伦敦', coordinate: [-.45, 51.47] };
const leg = (origin, destination) => ({ origin, destination });

test('composer validates both selected endpoints and real local calendar values', () => {
  assert.equal(localInputDate(new Date(2028, 1, 29, 0, 10)), '2028-02-29');
  assert.equal(routeInputProblem(null, hnd, '2028-02-29', '09:00'), '请选择起点');
  assert.equal(routeInputProblem(hkg, null, '2028-02-29', '09:00'), '请选择终点');
  assert.ok(routeInputProblem(hkg, { ...hkg }, '2028-02-29', '09:00'));
  assert.ok(routeInputProblem(hkg, hnd, '2026-02-29', '09:00'));
  assert.ok(routeInputProblem(hkg, hnd, '2028-02-29', '24:00'));
  assert.ok(routeInputProblem(hkg, hnd, '', '09:00'));
  assert.equal(routeInputProblem(hkg, hnd, '2028-02-29', '23:59'), null);
});

test('recent places use actual saved trips, deduplicate and stop at three', () => {
  assert.deepEqual(recentJourneyPlaces([]), []);
  assert.deepEqual(recentJourneyPlaces([{segments:[leg(hkg,hnd),leg(hnd,ord),leg(ord,lhr)]}]).map(p=>p.code), ['LHR','ORD','HND']);
});

test('new trip names are derived from the whole route, without a forced title', () => {
  assert.equal(suggestedJourneyName([leg(hkg,hnd),leg(hnd,ord)]), '香港 → 芝加哥');
  assert.equal(suggestedJourneyName([leg(hkg,hnd),leg(hnd,hkg)]), '香港之旅');
});

test('airport favorites and planning actions share the application store; unavailable live status is removed', async () => {
  const app = await readFile(new URL('../app/FlightyApp.tsx',import.meta.url),'utf8');
  const airports = await readFile(new URL('../app/AirportPanels.tsx',import.meta.url),'utf8');
  const composer = await readFile(new URL('../app/JourneyComposer.tsx',import.meta.url),'utf8');
  assert.match(app, /favoriteCodes=\{state.favorites\}/);
  assert.match(app, /onFavorite=\{store.toggleFavorite\}/);
  assert.match(airports, /onPlan\(airport, "origin"\)/);
  assert.match(airports, /onPlan\(airport, "destination"\)/);
  assert.doesNotMatch(airports, /Operations Normal|实时运行状态暂不可用|暂无实时运行数据/);
  assert.match(composer, /if \(!persistComposerDraft\(\)\) return/);
  assert.match(composer, /window.localStorage.setItem/);
  assert.match(composer, /window.sessionStorage.getItem/);
});
