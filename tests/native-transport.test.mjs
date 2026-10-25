import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function provider(name) {
  const source = await readFile(new URL(`../app/api/transport/${name}/route.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace('"../../../flightyData"', JSON.stringify(new URL("../app/flightyData.ts", import.meta.url).href));
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
