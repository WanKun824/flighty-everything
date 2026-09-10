import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function provider(name) {
  const source = await readFile(new URL(`../app/api/transport/${name}/route.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace('"../../../flightyData"', JSON.stringify(new URL("../app/flightyData.ts", import.meta.url).href))
    .replace('"../../../railGeometry.ts"', JSON.stringify(new URL("../app/railGeometry.ts", import.meta.url).href));
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("native flight lookup reuses verified public-provider parsing without a hosted website", async () => {
  const { lookupFlight } = await provider("flight");
  const requested = [];
  const response = await lookupFlight(new Request("https://flighty.invalid/?number=CX548&date=2028-09-18&departure=09:00"), async url => {
    requested.push(String(url));
    return Response.json({ response: { flightroute: {
      callsign_iata: "CX548", airline: { name: "Cathay Pacific" },
      origin: { iata_code: "HKG" }, destination: { iata_code: "HND", name: "Tokyo Haneda", municipality: "Tokyo", longitude: 139.78, latitude: 35.55 },
    } } });
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.segment.origin.code, "HKG");
  assert.equal(result.segment.destination.code, "HND");
  assert.equal(result.segment.operational.quality, "verified-route");
  assert.equal(result.live, false);
  assert.deepEqual(requested, ["https://api.adsbdb.com/v0/callsign/CX548"]);
});

test("verified rail lookup requests, validates and retains curved provider geometry", async () => {
  const { lookupRail } = await provider("rail");
  let requestUrl;
  const response = await lookupRail(new Request("https://flighty.invalid/?fromLon=8.5&fromLat=47.3&toLon=8.54&toLat=47.31&departAt=2028-09-18T09:00:00Z"), async url => {
    requestUrl = new URL(url);
    return Response.json({ itineraries: [{ legs: [{
      mode: "RAIL", displayName: "Test IC",
      startTime: "2028-09-18T09:00:00Z", endTime: "2028-09-18T09:15:00Z",
      from: { lon: 8.5, lat: 47.3, name: "Fixture A" }, to: { lon: 8.54, lat: 47.31, name: "Fixture B" },
      legGeometry: { points: "_y}eyA_qxeO_pR_pRowH_pRnwH_af@", precision: 6 },
    }] }] });
  });
  const { segments } = await response.json();
  assert.equal(requestUrl.searchParams.get("detailedLegs"), "true");
  assert.equal(response.status, 200);
  assert.equal(segments[0].railGeometry.source, "transitous");
  assert.equal(segments[0].railGeometry.coordinates.length, 4);
  assert.equal(segments[0].operational.realtime, false);
  assert.deepEqual(segments[0].railGeometry.coordinates[2], [8.52, 47.315]);
});

test("rail provider rejects missing coordinates instead of searching at zero", async () => {
  const { lookupRail } = await provider("rail");
  const response = await lookupRail(new Request("https://flighty.invalid/?departAt=2028-09-18T09:00:00Z"), async () => { throw Error("must not fetch"); });
  assert.equal(response.status, 400);
});

test("native rail lookup reports no coverage instead of inventing a train", async () => {
  const { lookupRail } = await provider("rail");
  let requested;
  const response = await lookupRail(new Request("https://flighty.invalid/?fromLon=139.76&fromLat=35.68&toLon=135.76&toLat=35.01&departAt=2028-09-18T09:00:00Z"), async url => {
    requested = String(url);
    return Response.json({ itineraries: [] });
  });
  assert.equal(response.status, 404);
  assert.match(requested, /^https:\/\/api\.transitous\.org\/api\/v6\/plan\?/);
  assert.ok((await response.json()).error);
});

test("native entry includes calibrated styles and direct native HTTP bridge", async () => {
  const main = await readFile(new URL("../native/main.tsx", import.meta.url), "utf8");
  const bridge = await readFile(new URL("../native/transportBridge.ts", import.meta.url), "utf8");
  assert.match(main, /journey-refinement\.css/);
  assert.match(main, /import "\.\/transportBridge"/);
  assert.match(bridge, /CapacitorHttp\.get/);
  assert.match(bridge, /Capacitor\.isNativePlatform\(\)/);
  assert.doesNotMatch(bridge, /chatgpt\.site/);
});
