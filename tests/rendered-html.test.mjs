import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(process.pid) + "-" + String(Date.now()));
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the ORBIT animation-first shell and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>ORBIT｜让整个旅程，在地球上发生<\/title>/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /og\.png/);
  assert.match(html, /class="orbit-app\b/);
  assert.match(html, />ORBIT</);
  assert.match(html, />地球行程</);
  assert.match(html, /日本行程动画预览/);
  assert.match(html, /TRAVELERS ON ORBIT/);
});

test("keeps globe, real-place search, community, account and 3D vehicles wired", async () => {
  const [legacy, experience, vehicle, css, workflow, handoff] = await Promise.all([
    readFile(new URL("../app/LegacyApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/StreamExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../HANDOFF.md", import.meta.url), "utf8"),
  ]);
  assert.match(legacy, /projection: globe \? "globe" : "mercator"/);
  assert.match(legacy, /searchbox\/v1\/suggest/);
  assert.match(legacy, /searchbox\/v1\/retrieve/);
  assert.match(legacy, /NEXT_PUBLIC_MAPBOX_TOKEN/);
  assert.match(legacy, /className="immersive-button"/);
  assert.match(legacy, /is-immersive/);
  assert.match(experience, /JOURNEYS IN MOTION/);
  assert.match(experience, /addComment/);
  assert.match(experience, /submitAccount/);
  assert.match(experience, /createJourney/);
  assert.match(experience, /localStorage\.setItem\("orbit-journeys"/);
  assert.match(vehicle, /GLTFLoader/);
  assert.match(vehicle, /DRACOLoader/);
  assert.match(vehicle, /\/models\/legacy-plane\.glb/);
  assert.match(vehicle, /\/models\/porsche\.glb/);
  assert.match(vehicle, /\/models\/train\.glb/);
  assert.match(vehicle, /\/models\/boat\.glb/);
  assert.match(css, /\.journey-globe-screen/);
  assert.match(workflow, /npm test/);
  assert.match(handoff, /Codemagic/);
});

test("all static JSX class names have stylesheet rules", async () => {
  const [experience, legacy, panel, vehicle, globalCss, streamCss] = await Promise.all([
    readFile(new URL("../app/StreamExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LegacyApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/stream-ui.css", import.meta.url), "utf8"),
  ]);
  const used = new Set();
  for (const source of [experience, legacy, panel, vehicle]) {
    let clean = source;
    for (let pass = 0; pass < 3; pass += 1) clean = clean.replace(/\$\{[^{}]*\}/g, " ");
    for (const match of clean.matchAll(/className\s*[=:]\s*\{?[\x60"]([^\x60"]*)[\x60"]/g)) {
      for (const token of match[1].split(/\s+/)) {
        if (/^[a-z][\w-]*$/.test(token) && !token.endsWith("-")) used.add(token);
      }
    }
  }
  assert.ok(used.size > 100, "class extraction should cover the full journey and community UI");
  const css = globalCss + "\n" + streamCss;
  const declared = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]));
  const missing = [...used].filter((name) => !declared.has(name)).sort();
  assert.deepEqual(missing, [], "Missing CSS rules: " + missing.join(", "));
});
