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
  assert.match(html, /og\.png/);
  assert.match(html, /class="app-shell\b/);
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
  assert.match(vehicle, /GLTFLoader/);
  assert.match(vehicle, /DRACOLoader/);
  assert.match(vehicle, /\/models\/plane\.glb/);
  assert.match(vehicle, /\/models\/car\.glb/);
  assert.match(vehicle, /\/models\/train\.glb/);
  assert.match(vehicle, /\/models\/ferry\.glb/);
  assert.match(css, /\.journey-globe-screen/);
  assert.match(workflow, /npm test/);
  assert.match(handoff, /Codemagic/);
});

/**
 * 改结构时最容易漏的一步是样式：JSX 换了类名、CSS 还挂在旧选择器上，
 * 编译和类型检查都不会报，界面直接裸奔。这里把两边的类名对一遍。
 */
test("每个 JSX 里用到的类名在样式表里都有规则", async () => {
  const [page, panel, vehicle, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/JourneyPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Vehicle3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const used = new Set();
  for (const source of [page, panel, vehicle]) {
    // 先整段抹掉 ${...} 插值再取字面量：插值里常带引号（`${a ? "x" : ""}`），
    // 不先抹掉的话字符串匹配会在那个引号上断开，抠出半截表达式当类名。
    let clean = source;
    for (let pass = 0; pass < 3; pass += 1) clean = clean.replace(/\$\{[^{}]*\}/g, " ");
    // className="a b"、className={`a b`}、element.className = "a" 三种写法都收。
    for (const match of clean.matchAll(/className\s*[=:]\s*\{?[`"]([^`"]*)[`"]/g)) {
      for (const token of match[1].split(/\s+/)) {
        if (/^[a-z][\w-]*$/.test(token) && !token.endsWith("-")) used.add(token);
      }
    }
  }
  assert.ok(used.size > 60, `只提取到 ${used.size} 个类名，正则大概失效了`);

  const declared = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]));
  const missing = [...used].filter((name) => !declared.has(name)).sort();
  assert.deepEqual(missing, [], `这些类名只在 JSX 里出现，globals.css 没有对应规则：${missing.join(", ")}`);
});
