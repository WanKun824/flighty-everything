import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { consumeSheetDrag } from '../app/mobileGestures.ts';
import { appendUniqueSegments, nextPlaybackSelection, passportTrips, passportYears, travelDate } from '../app/journeyLifecycle.ts';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const segment = (id, status = 'upcoming', date = '2026-12-31T23:40:00-08:00') => ({
  id, status, mode: 'flight', service: id, origin: {code:'HKG',coordinate:[114,22]}, destination:{code:'NRT',coordinate:[140,35]},
  date: '12月31日', departure:'23:40',arrival:'05:00',progress:status==='complete'?1:0,
  distanceKm:100,durationMinutes:60,operational:{scheduledDepartureAt:date},
});

test('undo stays attached to its original trip even after switching journeys',async()=>{
  const app=await read('../app/FlightyApp.tsx'), store=await read('../app/journeyStorage.ts');
  assert.match(app,/restoreSegments\(snapshot, deletedId, tripId\)/);
  assert.match(app,/restoreSegment\(tripId, selectedJourney\)/);
  assert.match(store,/targetId !== current.activeTripId/);
  assert.match(store,/tripId === current.activeTripId \? activePatch/);
});

test('whole-surface upward drag expands before scrolling, then transfers the remainder',()=>{
  assert.deepEqual(consumeSheetDrag(300,0,-100,300,800,1000),{sheet:400,scroll:0});
  assert.deepEqual(consumeSheetDrag(760,0,-100,300,800,1000),{sheet:800,scroll:60});
});
test('downward drag scrolls to top before collapsing; minimum and maximum are hard limits',()=>{
  assert.deepEqual(consumeSheetDrag(800,90,120,300,800,1000),{sheet:770,scroll:0});
  assert.deepEqual(consumeSheetDrag(300,0,200,300,800,1000),{sheet:300,scroll:0});
  assert.deepEqual(consumeSheetDrag(800,990,-80,300,800,1000),{sheet:800,scroll:1000});
});
test('drag segmentation does not change the resulting position',()=>{
  const whole = consumeSheetDrag(800,90,160,300,800,1000);
  let steps={sheet:800,scroll:90};
  for(let i=0;i<16;i++) steps=consumeSheetDrag(steps.sheet,steps.scroll,10,300,800,1000);
  assert.deepEqual(steps,whole);
});
test('playback selection advances without mutating a completed or planned segment',()=>{
  const legs=[segment('A','complete'),segment('B')];
  const original=structuredClone(legs);
  assert.equal(nextPlaybackSelection(legs,'A'),'B');
  assert.equal(nextPlaybackSelection(legs,'B'),'B');
  assert.equal(nextPlaybackSelection(legs,'missing'),'missing');
  assert.deepEqual(legs,original);
});
test('adding deduplicates but does not split the explicitly chosen journey at a gap',()=>{
  const a=segment('A'),b=segment('B');
  b.origin={code:'LHR',coordinate:[0,51]};
  const result=appendUniqueSegments([a],[a,b,b]);
  assert.deepEqual(result.segments,[a,b]); assert.deepEqual(result.additions,[b]);
});
test('passport includes only completed legs, without a separate save operation',()=>{
  const a=segment('A','complete'),b=segment('B');
  const trips=[{id:'trip',savedToPassportAt:null,segments:[a,b]}];
  assert.deepEqual(passportTrips(trips)[0].segments,[a]);
  assert.equal(trips[0].segments.length,2);
  assert.deepEqual(passportTrips([{segments:[b]}]),[]);
});
test('year uses local travel date, not save year or UTC conversion; cross-year trips split statistics',()=>{
  const a=segment('A','complete'),b=segment('B','complete','2027-01-02T01:00:00+09:00');
  const trips=[{createdAt:'2028-01-01',savedToPassportAt:'2029-01-01',segments:[a,b]}];
  assert.equal(travelDate(a),'2026-12-31');
  assert.deepEqual(passportYears(trips),['2027','2026']);
  assert.deepEqual(passportTrips(trips,'2026')[0].segments,[a]);
  assert.deepEqual(passportTrips(trips,'2027')[0].segments,[b]);
});
test('undated completed routes are retained without inventing a year; removal updates totals',()=>{
  const a=segment('A','complete'); delete a.operational;
  assert.equal(travelDate(a),null);
  assert.deepEqual(passportYears([{segments:[a]}]),['unknown']);
  assert.equal(passportTrips([{segments:[a]}],'unknown').length,1);
  assert.deepEqual(passportTrips([{segments:[]}]),[]);
});
test('active detail has no grab bar; entire section owns gesture arbitration and preserves clicks',async()=>{
  const mobile=await read('../app/MobileJourney.tsx');
  const detail=mobile.slice(mobile.indexOf('export function MobileJourneyDetail('),mobile.indexOf('export function MobileJourneyDetailLegacy'));
  assert.match(detail,/\.\.\.detailSheet.sheetProps/);
  assert.doesNotMatch(detail,/sheet-drag-handle|handleProps|surfaceProps/);
  const hook=await read('../app/useSheetDetents.ts');
  assert.match(hook,/Math.hypot\(dx, dy\) < 7/);
  assert.match(hook,/onClickCapture/);
  assert.match(hook,/consumeSheetDrag/);
  assert.match(hook,/scrollTop = 0/);
});
test('main panel remembers each tab separately, detail inherits height and never changes during reading',async()=>{
  const app=await read('../app/FlightyApp.tsx');
  assert.match(app,/const flightSheet = useSheetDetents/);
  assert.match(app,/const friendsSheet = useSheetDetents/);
  assert.match(app,/const passportSheet = useSheetDetents/);
  assert.match(app,/setDetailInitial\(mainSheet.fraction\)/);
  assert.match(app,/if \(overlay\) return; \/\/ Never replace/);
  assert.doesNotMatch(app,/setPlaybackProgress/);
  assert.match(app,/onScrollCapture/);
  assert.match(app,/tabScrollPositions.current\[activeTab\] = element.scrollTop/);
});

test('passport travel dates sort newest first, undated years come last',()=>{
  const older=segment('old','complete','2025-06-01T09:00:00+08:00');
  const newer=segment('new','complete','2027-01-02T09:00:00+08:00');
  const unknown=segment('unknown','complete'); delete unknown.operational;
  assert.deepEqual(passportTrips([{id:'old',segments:[older]},{id:'new',segments:[newer]}]).map(trip=>trip.id),['new','old']);
  assert.deepEqual(passportYears([{segments:[older,newer,unknown]}]),['2027','2025','unknown']);
});
test('editing removes the unused collection name and confirms whole-trip deletion',async()=>{
  const app=await read('../app/FlightyApp.tsx');
  const editor=app.slice(app.indexOf('function JourneyNamesSheet('),app.indexOf('function StatusBar('));
  assert.doesNotMatch(editor,/collectionName|sheet-drag-handle|onSaveToPassport/);
  assert.match(editor,/sheet.sheetProps/);
  assert.match(editor,/role="alertdialog"/);
  assert.match(app,/operational\?\.actualArrivalAt \? "已到达" : "待确认到达"/);
});
