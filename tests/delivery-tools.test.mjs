import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const python = (...args) => execFileSync(process.env.PYTHON || "python", args, { encoding: "utf8" });

test("source export keeps build source and excludes credentials, installers and caches", () => {
  python("-c", `import runpy; m=runpy.run_path('scripts/package-source.py'); p=m['permitted']; assert p('build/sites-vite-plugin.ts'); assert p('.env.example'); assert p('docs/runtime-current/images/page.png'); assert not any(p(x) for x in ['.git/config','node_modules/x.js','native-shell/index.html','dist/index.html','build/debug.json','.env.local','ios/cert.p12','app.ipa','android/local.properties','secret.mobileprovision'])`);
});

test("GitHub package build generates native-shell before collecting it and verifies source", async () => {
  const workflow = await read(".github/workflows/web-package.yml");
  assert.ok(workflow.indexOf("npm run native:build") < workflow.indexOf("tar -czf"));
  assert.match(workflow, /scripts\/package-source\.py/);
  assert.match(workflow, /REQUESTED_SOURCE_SHA/);
  assert.match(workflow, /docs-screenshots\.zip/);
});

test("native capture plan has 32 current states, separate appearances and no submit actions", async () => {
  const pages = JSON.parse(python("ios/qa/capture-pages.py", "--list"));
  assert.equal(pages.length, 32);
  assert.equal(new Set(pages.map(page => page.key)).size, 32);
  for (const page of pages) {
    assert.ok(page.title && page.selector && page.actions.length);
    assert.doesNotMatch(page.actions.join("\n"), /publish-submit|confirmDestructive|requestPermissions|journey-delete-trip|favorite-button/);
  }
  const workflow = await read(".github/workflows/ios-screenshots.yml");
  assert.match(workflow, /fail-fast: false/);
  assert.match(workflow, /--theme/);
  assert.match(workflow, /matrix\.appearance/);
});
