import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("passport and statistics use real multi-modal journey data", async () => {
  const source = await readFile(new URL("../app/JourneyPassportTarget.tsx", import.meta.url), "utf8");
  assert.match(source, /journeyStats\(segments\)/);
  assert.match(source, /Object\.keys\(MODE_META\)/);
  assert.match(source, /<JourneyModeIcon mode=\{topMode\}/);
  assert.doesNotMatch(source, /Vehicle3D/);
  assert.match(source, /行程频率/);
  assert.match(source, /旅行距离/);
  assert.match(source, /常用载具/);
  assert.match(source, /热门路线/);
});

test("vehicle models stay on the live map while every showcase uses journey icons", async () => {
  const [globe, ...showcases] = await Promise.all([
    readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/MobileJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/DesktopJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyPassportTarget.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyExperience27.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CommunityJourneyPage.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(globe, /<Vehicle3D/);
  for (const source of showcases) {
    assert.doesNotMatch(source, /<Vehicle3D/);
    assert.match(source, /JourneyModeIcon|VehicleModeIcon/);
  }
});

test("airports sheet and map use real airport identities, regions and status markers", async () => {
  const [data, globe, page, css] = await Promise.all([
    readFile(new URL("../app/flightyData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/FlightyApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const airportSource = await readFile(new URL("../app/AirportPanels.tsx", import.meta.url), "utf8");
  for (const code of ["HKG", "NRT", "SIN", "ICN", "LHR", "CDG", "ORD", "JFK", "LAX"])
    assert.match(data, new RegExp(`code: "${code}"`));
  assert.ok((data.match(/timeZone:/g) ?? []).length >= 25);
  assert.match(data, /airportStatusLevel/);
  assert.match(globe, /airportRegion/);
  assert.match(globe, /region === "All" \|\| airport\.region === region/);
  assert.match(globe, /flighty-airport-dots/);
  assert.doesNotMatch(globe, /airportMarkersRef/);
  assert.match(airportSource, /<AirportRow/);
  assert.match(airportSource, /暂无实时运行数据/);
  assert.doesNotMatch(page, /airportByCode\(selectedAirport\) \?\? AIRPORTS\[0\]/);
  assert.doesNotMatch(airportSource, /departureOnTime|Operations Normal|View Full Operational Report/);
  assert.match(airportSource, /catalog\.find\(entry => entry\.code === code\)/);
  assert.match(css, /\.airport-signal\.warning/);
  assert.match(css, /\.airport-signal\.severe/);
});

test("mobile search keeps place lookup and all four vehicle modes usable", async () => {
  const source = await readFile(new URL("../app/JourneyComposer.tsx", import.meta.url), "utf8");
  assert.match(source, /搜索城市、景点、机场或车站/);
  assert.match(source, /searchJourneyPlaces\(query/);
  assert.match(source, /retrieveJourneyPlace\(suggestion/);
  assert.match(source, /Object\.keys\(MODE_META\)/);
  assert.match(source, /addNextLeg/);
  assert.match(source, /onAddMany\(segments/);
});

test("map vehicles keep their original material rendering and omit the card-only ground shadow", async () => {
  const source = await readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8");
  assert.match(source, /renderer\.toneMappingExposure = 1\.12/);
  assert.match(source, /scene\.environmentIntensity = 1\.15/);
  assert.match(source, /shadow\.visible = view !== "map"/);
  assert.doesNotMatch(source, /copy\.roughness/);
  assert.doesNotMatch(source, /copy\.envMapIntensity/);
});

test("map airplane omits the detached double motion trail", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(
    css,
    /\.journey-vehicle-3d-marker\.flight \.journey-vehicle-3d-host::before\s*\{\s*content:\s*none;/,
  );
  assert.doesNotMatch(
    css,
    /\.journey-vehicle-3d-marker\.flight \.journey-vehicle-3d-host::before[^}]*box-shadow/,
  );
});

test("passport keeps the shared draggable sheet while mobile search stays fixed over the map", async () => {
  const [page, composer, css] = await Promise.all([
    readFile(new URL("../app/FlightyApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyComposer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /activeTab === "passport" \? "passport-panel"/);
  assert.match(page, /\.\.\.mainSheet\.sheetProps/);
  assert.doesNotMatch(composer, /拖动调整搜索面板高度/);
  assert.match(css, /\.flight-panel\.passport-panel \{ top: auto; height: var\(--sheet-height,47%\)/);
  assert.match(css, /\.journey-composer\.mobile\.journey-search-target \{ height: 86%/);
  assert.doesNotMatch(css, /search-open \.flight-globe \{ filter: brightness\(0\)/);
});
