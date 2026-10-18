import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Chinese journey shell and own-brand social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>fly everything — 飞机、火车、汽车与轮船旅行规划<\/title>/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /og\.png/);
  assert.match(html, /class="flighty-page"/);
  assert.match(html, /class="flighty-device"/);
  assert.match(html, />我的行程</);
  assert.match(html, /aria-label="打开机场资料与收藏"/);
});

test("keeps the live globe, radar, Apple symbols and existing storage keys wired", async () => {
  const [app, community, globe, storage, journeys, data, interactions, css, workflow] = await Promise.all([
    read("../app/FlightyApp.tsx"), read("../app/CommunityPanel.tsx"), read("../app/FlightGlobe.tsx"),
    read("../app/flightyStorage.ts"), read("../app/journeyStorage.ts"), read("../app/journeyData.ts"),
    read("../app/nativeInteractions.ts"), read("../app/globals.css"), read("../.github/workflows/ci.yml"),
  ]);
  for (const pattern of [/projection: "globe"/, /standard-satellite/, /api\.rainviewer\.com\/public\/weather-maps\.json/, /flighty-radar/, /flighty-journey-lines/, /createPortal\(/, /<Vehicle3D/]) assert.match(globe, pattern);
  assert.match(app, /sf-symbols-lib\/monochrome/);
  assert.doesNotMatch(app, /DesktopJourney/);
  assert.match(community, /fetchCommunityJourneys/);
  assert.match(community, /JourneyModeIcon/);
  assert.match(app, /calendarFlightNumbers/);
  assert.match(app, /shareContent/);
  assert.match(interactions, /navigator\.share/);
  assert.match(storage, /window\.localStorage/);
  assert.match(storage, /flighty-everything:state:v1/);
  assert.match(journeys, /flighty-everything:journey:v1/);
  assert.match(journeys, /flighty-everything:journey:v2/);
  for (const mode of ["flight", "train", "car", "ferry"]) assert.match(data, new RegExp(mode));
  assert.match(css, /\.flighty-device/);
  assert.match(css, /\.weather-legend/);
  assert.match(workflow, /npm test/);
});

test("every product class used in active JSX has a CSS rule", async () => {
  const files = ["page", "FlightyApp", "MobileJourney", "JourneyComposer", "JourneyPassportTarget", "FlightGlobe", "Vehicle3D", "CommunityPanel", "SheetHeader"];
  const sources = await Promise.all(files.map(file => read(`../app/${file}.tsx`)));
  const cssNames = (await readdir(new URL("../app/", import.meta.url))).filter(file => file.endsWith(".css"));
  const css = (await Promise.all(cssNames.map(file => read(`../app/${file}`)))).join("\n");
  const used = new Set();
  for (const source of sources) {
    let clean = source;
    for (let pass = 0; pass < 3; pass++) clean = clean.replace(/\$\{[^{}]*\}/g, " ");
    for (const match of clean.matchAll(/className\s*[=:]\s*\{?[`"]([^`"]*)[`"]|className\s*=\s*"([^"]*)"/g)) {
      for (const token of (match[1] ?? match[2] ?? "").split(/\s+/)) {
        if (/^[a-z][\w-]*$/.test(token) && !token.endsWith("-")) used.add(token);
      }
    }
  }
  assert.ok(used.size > 100, `Only extracted ${used.size} product classes; guard no longer effective.`);
  const declared = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(match => match[1]));
  const missing = [...used].filter(name => !declared.has(name)).sort();
  assert.deepEqual(missing, [], `Missing CSS rules: ${missing.join(", ")}`);
});
