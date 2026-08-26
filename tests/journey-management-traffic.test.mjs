import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createJourneySegmentBetween } from "../app/journeyData.ts";
import { roadTrafficLabel } from "../app/roadTraffic.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("custom route builder connects searched places without teleporting between legs", async () => {
  const [composer, search, store] = await Promise.all([
    read("../app/JourneyComposer.tsx"),
    read("../app/journeyPlaceSearch.ts"),
    read("../app/journeyStorage.ts"),
  ]);
  assert.match(search, /search\/searchbox\/v1\/suggest/);
  assert.match(search, /search\/searchbox\/v1\/retrieve/);
  assert.match(composer, /setOrigin\(segment\.destination\)/);
  assert.match(composer, /onAddMany/);
  assert.match(composer, /保存整个行程/);
  assert.match(store, /flighty-everything:journey:v2/);
  assert.match(store, /selectTrip/);
  assert.match(store, /createTrip/);
  assert.match(store, /updateTripAppearance/);
});

test("custom place segments preserve exact endpoint continuity and naming", () => {
  const origin = { code: "POI", name: "浅草寺", city: "东京", coordinate: [139.7967, 35.7148], kind: "place" };
  const node = { code: "STN", name: "东京站", city: "东京", coordinate: [139.7671, 35.6812], kind: "station" };
  const first = createJourneySegmentBetween({ mode: "car", origin, destination: node, date: "2026-09-18", title: "寺院到车站" });
  const second = createJourneySegmentBetween({ mode: "train", origin: first.destination, destination: { ...node, code: "KYO", name: "京都站", city: "京都", coordinate: [135.7588, 34.9858] }, date: "2026-09-18" });
  assert.equal(first.title, "寺院到车站");
  assert.deepEqual(first.destination, second.origin);
});

test("car routes use live traffic while train status remains explicitly provider-scoped", async () => {
  const [traffic, globe, cards] = await Promise.all([
    read("../app/roadTraffic.ts"),
    read("../app/FlightGlobe.tsx"),
    read("../app/JourneyCommunityUI.tsx"),
  ]);
  assert.match(traffic, /mapbox\/driving-traffic/);
  assert.match(traffic, /congestion,duration,distance,closure/);
  assert.match(traffic, /depart_at: "now"/);
  assert.match(globe, /roadTraffic\[item\.id\]\?\.coordinates/);
  assert.match(globe, /zoom: map\.getZoom\(\)/);
  assert.match(globe, /bearing: point\.bearing/);
  assert.match(cards, /运营方 GTFS-RT/);
  assert.equal(roadTrafficLabel({ delayMinutes: 12, incidentCount: 0 }), "拥堵 · 预计多 12 分钟");
});

test("passport cards provide per-trip color and landmark motifs", async () => {
  const [passport, css] = await Promise.all([
    read("../app/JourneyPassportUI.tsx"),
    read("../app/journey-theme.css"),
  ]);
  assert.match(passport, /TRIP_COLORS/);
  assert.match(passport, /TRIP_MOTIFS/);
  for (const motif of ["torii", "mountain", "skyline", "pagoda"])
    assert.match(css, new RegExp(`motif-${motif}`));
});
