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

test("map vehicles soften reflections without mutating shared hero materials", async () => {
  const source = await readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8");
  assert.match(source, /view === "map" \? 0\.38 : 0\.9/);
  assert.match(source, /const copy = material\.clone\(\)/);
  assert.match(source, /copy\.roughness = Math\.max\(copy\.roughness, 0\.72\)/);
  assert.match(source, /copy\.envMapIntensity = Math\.min\(copy\.envMapIntensity, 0\.28\)/);
  assert.match(source, /localMaterials\.forEach\(\(material\) => material\.dispose\(\)\)/);
});
