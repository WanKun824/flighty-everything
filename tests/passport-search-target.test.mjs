import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("passport and statistics use real multi-modal journey data", async () => {
  const source = await readFile(new URL("../app/JourneyPassportTarget.tsx", import.meta.url), "utf8");
  assert.match(source, /journeyStats\(segments\)/);
  assert.match(source, /Object\.keys\(MODE_META\)/);
  assert.match(source, /<Vehicle3D kind=\{topMode\}/);
  assert.match(source, /行程频率/);
  assert.match(source, /旅行距离/);
  assert.match(source, /常用载具/);
  assert.match(source, /热门路线/);
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

test("passport keeps the shared draggable sheet while mobile search stays fixed over the map", async () => {
  const [page, composer, css] = await Promise.all([
    readFile(new URL("../app/FlightyApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyComposer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /activeTab === "passport" \? "passport-panel"/);
  assert.match(page, /\.\.\.mainSheet\.handleProps/);
  assert.doesNotMatch(composer, /拖动调整搜索面板高度/);
  assert.match(css, /\.flight-panel\.passport-panel \{ top: auto; height: var\(--sheet-height,47%\)/);
  assert.match(css, /\.journey-composer\.mobile\.journey-search-target \{ height: 86%/);
  assert.doesNotMatch(css, /search-open \.flight-globe \{ filter: brightness\(0\)/);
});
