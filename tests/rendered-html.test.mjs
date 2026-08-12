import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Manyou travel shell and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>漫游｜地球仪旅行与朋友<\/title>/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /social-globe\.png/);
  assert.match(html, /class="app-shell"/);
  assert.match(html, />社区</);
});

test("keeps globe, real-place search and 3D vehicle capabilities wired", async () => {
  const [page, vehicle, css, workflow, handoff] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../HANDOFF.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /projection: globe \? "globe" : "mercator"/);
  assert.match(page, /searchbox\/v1\/suggest/);
  assert.match(page, /searchbox\/v1\/retrieve/);
  assert.match(page, /NEXT_PUBLIC_MAPBOX_TOKEN/);
  assert.match(vehicle, /buildPlane/);
  assert.match(vehicle, /buildCar/);
  assert.match(vehicle, /buildTrain/);
  assert.match(vehicle, /buildFerry/);
  assert.match(css, /\.journey-globe-screen/);
  assert.match(workflow, /npm run build/);
  assert.match(handoff, /Codemagic/);
});
