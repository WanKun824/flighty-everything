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
  assert.match(html, /<title>flighty Everything[^<]*旅行规划<\/title>/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /og\.png/);
  assert.match(html, /class="journey-experience/);
  assert.match(html, />你的行程</);
  assert.match(html, />发现</);
  assert.match(html, /aria-label="进入沉浸模式"/);
});

test("keeps the globe, Apple icons, controls and durable community wired", async () => {
  const [
    page,
    experience,
    globe,
    journeyStorage,
    journeyData,
    preferences,
    community,
    communityRoute,
    schema,
    hosting,
    css,
    workflow,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/journeyStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/journeyData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/journeyPreferences.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/communityData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/journeys/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
  ]);

  assert.match(globe, /projection: "globe"/);
  assert.match(globe, /standard-satellite/);
  assert.match(globe, /flighty-journey-lines/);
  assert.match(globe, /vehicleScale/);
  assert.match(globe, /animationSpeed/);
  assert.match(experience, /sf-symbols-lib\/monochrome/);
  assert.match(experience, /navigator\.share/);
  assert.match(experience, /JourneyComposer/);
  assert.match(experience, /Vehicle3D/);
  assert.match(experience, /PublishJourneyDialog/);
  assert.match(page, /JourneyExperience/);
  assert.match(journeyStorage, /flighty-everything:journey:v1/);
  assert.match(preferences, /window\.localStorage/);
  assert.match(preferences, /vehicleScale/);
  assert.match(preferences, /animationSpeed/);
  assert.match(community, /fetch\("\/api\/community\/journeys"/);
  assert.match(communityRoute, /export async function GET/);
  assert.match(communityRoute, /export async function POST/);
  assert.match(communityRoute, /export async function PATCH/);
  assert.match(schema, /communityJourneys/);
  assert.match(hosting, /"d1": "DB"/);
  for (const mode of ["flight", "train", "car", "ferry"])
    assert.match(journeyData, new RegExp(mode));
  assert.match(css, /\.journey-experience/);
  assert.match(css, /\.publish-journey-dialog/);
  assert.match(css, /\.journey-live-preview/);
  assert.match(workflow, /npm test/);
});

test("every product class used in active JSX has a CSS rule", async () => {
  const [page, experience, composer, globe, vehicle, css] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/JourneyExperience.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/JourneyComposer.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/FlightGlobe.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

  const used = new Set();
  for (const source of [page, experience, composer, globe, vehicle]) {
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
    used.size > 50,
    `Only extracted ${used.size} product classes; the guard is no longer effective.`,
  );

  const declared = new Set(
    [...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]),
  );
  const missing = [...used].filter((name) => !declared.has(name)).sort();
  assert.deepEqual(missing, [], `Missing CSS rules: ${missing.join(", ")}`);
});
