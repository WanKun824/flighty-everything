import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const python = (...args) => execFileSync(process.env.PYTHON || "python", args, { encoding: "utf8" });

test("optional source export retains build source but excludes credentials, archives and caches", () => {
  python("-c", `import runpy; m=runpy.run_path('scripts/package-source.py'); p=m['permitted']; assert p('build/sites-vite-plugin.ts'); assert p('.env.example'); assert p('docs/README.md'); assert not any(p(x) for x in ['.git/config','node_modules/x.js','native-shell/index.html','dist/index.html','build/debug.json','.env.local','ios/cert.p12','app.ipa','app.apk','app.aab','source.zip','web.tar.gz','android/local.properties','secret.mobileprovision'])`);
});

test("package workflows require explicit dispatch and build native resources before collecting them", async () => {
  const workflow = await read(".github/workflows/web-package.yml");
  assert.ok(workflow.indexOf("npm run native:build") < workflow.indexOf("tar -czf"));
  assert.match(workflow, /scripts\/package-source\.py/);
  assert.match(workflow, /REQUESTED_SOURCE_SHA/);
  assert.match(workflow, /flighty-everything-docs\.zip/);
  for (const name of ['web-package', 'ios', 'android']) {
    const text = await read(`.github/workflows/${name}.yml`);
    assert.match(text, /workflow_dispatch:/);
    assert.doesNotMatch(text, /^  push:/m);
  }
});

test("32 navigation targets remain available without automatically recording screenshots or traces", async () => {
  const pages = JSON.parse(python("ios/qa/capture-pages.py", "--list"));
  assert.equal(pages.length, 32);
  assert.equal(new Set(pages.map(page => page.key)).size, 32);
  for (const page of pages) {
    assert.ok(page.title && page.selector && page.actions.length);
    assert.doesNotMatch(page.actions.join("\n"), /publish-submit|confirmDestructive|requestPermissions|journey-delete-trip|favorite-button/);
  }
  const config = await read('playwright.config.mjs');
  assert.match(config, /screenshot: "off"/);
  assert.match(config, /trace: "off"/);
  for (const name of ['navigation-plan', 'ios-ui']) assert.doesNotMatch(await read(`tests/e2e/${name}.spec.mjs`), /page\.screenshot\(/);
});
