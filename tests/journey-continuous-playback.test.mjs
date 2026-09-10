import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { matchAirportCatalog } from "../app/airportCatalog.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("playback completes once, advances in order and preserves completion through rerenders", async () => {
  const [globe, store, app] = await Promise.all([read("../app/FlightGlobe.tsx"), read("../app/journeyStorage.ts"), read("../app/FlightyApp.tsx")]);
  assert.doesNotMatch(globe, /elapsed % duration/);
  assert.match(globe, /previousPlayback\?\.key === playbackKey \? previousPlayback\.progress/);
  assert.match(globe, /playback\.completed = true/);
  assert.match(store, /nextPlaybackSelection\(current\.segments, id\)/);
  assert.doesNotMatch(store.slice(store.indexOf("const restartTrip"), store.indexOf("const reset")), /status:|progress:/);
  assert.match(app, /journeyStore\.advanceSegment\(id\)/);
  assert.match(app, /journeyStore\.restartTrip\(\)/);
});

test("journey creation is explicit and map airplanes do not wobble", async () => {
  const [composer, vehicle, app] = await Promise.all([read("../app/JourneyComposer.tsx"), read("../app/Vehicle3D.tsx"), read("../app/FlightyApp.tsx")]);
  assert.match(composer, /role="radiogroup" aria-label="选择保存到哪个旅程"/);
  assert.match(composer, /JOURNEY_PLACES\.slice\(4, 7\)/);
  assert.match(composer, /const validOrigin = originQuery\.trim\(\) === origin\.name/);
  assert.match(composer, /if \(!drafts\.length\) setOriginQuery\(""\)/);
  assert.match(composer, /disabled=\{stagedCount === 0 \|\| Boolean\(destination && !validOrigin\)\}/);
  assert.match(vehicle, /view === "map" && kind === "flight"/);
  assert.match(app, /createTripWithSegments\(tripName, segments\)/);
  assert.match(app, /title="天气图层"/);
  const weather = app.slice(app.indexOf("function WeatherSheet"), app.indexOf("function", app.indexOf("function WeatherSheet") + 20));
  assert.doesNotMatch(weather, /PRO|Enable Global Weather/);
});

test("global airport data has accurate coded locations and code search wins over text matches", async () => {
  const { entries } = JSON.parse(await read("../public/data/airports.json"));
  assert.ok(entries.length > 40000);
  const airports = entries.map(([code, icao, name, city, country, continent, lon, lat, minZoom]) => ({code, icao, name, city, country, continent, coordinate:[lon,lat], minZoom, kind:"airport"}));
  for (const code of ["HKG", "DXB", "KEF", "SCL", "AKL", "CPT"]) {
    const result = matchAirportCatalog(airports, code)[0];
    assert.equal(result.code, code);
    assert.ok(Math.abs(result.coordinate[0]) <= 180 && Math.abs(result.coordinate[1]) <= 90);
  }
  assert.ok(matchAirportCatalog(airports, "Reykjav").some(item => item.country === "IS"));
});
