import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Chinese flighty Everything journey shell and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>flighty Everything — 飞机、火车、汽车与轮船旅行规划<\/title>/,
  );
  assert.match(html, /property="og:image"/);
  assert.match(html, /og\.png/);
  assert.match(html, /class="flighty-page"/);
  assert.match(html, /class="flighty-device"/);
  assert.match(html, />我的行程</);
  assert.match(html, /aria-label="打开机场动态"/);
});

test("keeps the live globe, radar, Apple icons and multi-transport persistence wired", async () => {
  const [
    page,
    desktop,
    globe,
    storage,
    journeyStorage,
    journeyData,
    css,
    workflow,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/DesktopJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/flightyStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/journeyStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/journeyData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
  ]);

  assert.match(globe, /projection: "globe"/);
  assert.match(globe, /standard-satellite/);
  assert.match(globe, /api\.rainviewer\.com\/public\/weather-maps\.json/);
  assert.match(globe, /flighty-radar/);
  assert.match(globe, /flighty-journey-lines/);
  assert.match(globe, /createPortal\(/);
  assert.match(globe, /<Vehicle3D/);
  assert.match(page, /sf-symbols-lib\/monochrome/);
  assert.doesNotMatch(page, /DesktopJourney/);
  assert.match(desktop, /旅程总览/);
  assert.match(desktop, /DesktopStats/);
  assert.match(page, /calendarFlightNumbers/);
  assert.match(page, /navigator\.share/);
  assert.match(storage, /window\.localStorage/);
  assert.match(storage, /flighty-everything:state:v1/);
  assert.match(journeyStorage, /flighty-everything:journey:v1/);
  for (const mode of ["flight", "train", "car", "ferry"])
    assert.match(journeyData, new RegExp(mode));
  assert.match(css, /\.flighty-device/);
  assert.match(css, /\.weather-legend/);
  assert.match(workflow, /npm test/);
});

test("every product class used in active JSX has a CSS rule", async () => {
  const [page, desktop, mobile, composer, globe, vehicle, css] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/DesktopJourney.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/MobileJourney.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/JourneyComposer.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

  const used = new Set();
  for (const source of [page, desktop, mobile, composer, globe, vehicle]) {
    let clean = source;
    for (let pass = 0; pass < 3; pass += 1)
      clean = clean.replace(/\$\{[^{}]*\}/g, " ");
    for (const match of clean.matchAll(
      /className\s*[=:]\s*\{?[`"]([^`"]*)[`"]|className\s*=\s*"([^"]*)"/g,
    )) {
      for (const token of (match[1] ?? match[2] ?? "").split(/\s+/)) {
        if (/^[a-z][\w-]*$/.test(token) && !token.endsWith("-"))
          used.add(token);
      }
    }
  }
  assert.ok(
    used.size > 100,
    `Only extracted ${used.size} product classes; the guard is no longer effective.`,
  );

  const declared = new Set(
    [...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]),
  );
  const missing = [...used].filter((name) => !declared.has(name)).sort();
  assert.deepEqual(missing, [], `Missing CSS rules: ${missing.join(", ")}`);
});
