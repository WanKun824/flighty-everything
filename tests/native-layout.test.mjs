import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("native map fills the viewport and safe areas only inset controls", async () => {
  const [css, html, scene, capacitor] = await Promise.all([
    read("../app/native-layout.css"), read("../native/index.html"),
    read("../ios/App/App/SceneDelegate.swift"), read("../capacitor.config.ts"),
  ]);
  assert.match(html, /data-native-shell="true"/);
  assert.match(css, /width: 100%; height: 100%; min-height: 0; max-height: none/);
  assert.match(css, /\.ios-status \{ display: none; \}/);
  assert.match(css, /bottom: calc\(var\(--native-safe-bottom\) \+ 8px\)/);
  assert.match(css, /\.map-controls-compact \.map-follow-button/);
  assert.match(scene, /webView\?\.scrollView\.bounces = false/);
  assert.match(capacitor, /contentInset: "never"/);
  assert.doesNotMatch(scene, /topSystemChrome|bottomSystemChrome/);
});

test("light itinerary rows have no legacy white tiles and touch focus is not a square", async () => {
  const [base, refinement] = await Promise.all([read("../app/globals.css"), read("../app/journey-refinement.css")]);
  assert.doesNotMatch(base, /\.flighty-page\[data-theme="light"\] \.mobile-segment-card,/);
  assert.match(refinement, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(refinement, /\.mobile-segment-card\.selected::before/);
});

test("IPA packaging pins source, embeds provenance and validates a running Simulator", async () => {
  const [vite, workflow] = await Promise.all([read("../vite.native.config.ts"), read("../.github/workflows/ios.yml")]);
  assert.match(vite, /native-shell\/build-info\.json/);
  assert.match(vite, /sourceCommit: execFileSync/);
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /b.sourceCommit!==process.env.GITHUB_SHA/);
  assert.match(workflow, /Verify Simulator full-screen layout in light and dark mode/);
  assert.match(workflow, /systemChromeDuplicates/);
  assert.match(workflow, /verifyScreenshot.swift build\/ui-qa\/iphone-dark.png dark/);
});

test("native system appearance changes reach the React theme without overriding user choice", async () => {
  const [appearance, scene, workflow] = await Promise.all([
    read("../app/appearance.ts"), read("../ios/App/App/SceneDelegate.swift"), read("../.github/workflows/ios.yml"),
  ]);
  assert.match(appearance, /dataset.nativeSystemTheme/);
  assert.match(appearance, /flighty-native-appearance-change/);
  assert.match(appearance, /mode === "system" \? \(systemDark \? "dark" : "light"\) : mode/);
  assert.match(scene, /registerForTraitChanges\(\[UITraitUserInterfaceStyle.self\]/);
  assert.match(workflow, /a\["nativeTheme"\]=="dark" and a\["pageTheme"\]=="dark"/);
});
