import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("wires animated vehicles and all three production map modes", async () => {
  const [globe, css] = await Promise.all([
    read("../app/FlightGlobe.tsx"),
    read("../app/globals.css"),
  ]);

  for (const mode of ["satellite", "streets", "traffic"])
    assert.match(globe, new RegExp(`id: "${mode}"`));
  assert.match(globe, /mapbox:\/\/mapbox\.mapbox-traffic-v1/);
  assert.match(globe, /"source-layer": "traffic"/);
  for (const congestion of ["low", "moderate", "heavy", "severe"])
    assert.match(globe, new RegExp(`"${congestion}"`));
  assert.match(globe, /requestAnimationFrame\(animate\)/);
  assert.match(globe, /journey-vehicle-marker/);
  assert.match(css, /\.journey-vehicle-marker/);
  assert.match(css, /\.map-layer-switcher/);
});

test("keeps mobile sheets draggable, keyboard accessible and haptic", async () => {
  const [page, mobile, hook, haptics, css, packageJson] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/MobileJourney.tsx"),
    read("../app/useSheetDetents.ts"),
    read("../app/nativeHaptics.ts"),
    read("../app/globals.css"),
    read("../package.json"),
  ]);

  assert.match(page, /\[0\.31, 0\.535, 0\.82\]/);
  assert.match(mobile, /\[0\.32, 0\.58, 0\.84\]/);
  assert.match(hook, /setPointerCapture/);
  assert.match(hook, /ArrowDown/);
  assert.match(hook, /prefers-reduced-motion|visualViewport/);
  assert.match(haptics, /Haptics\.impact/);
  assert.match(packageJson, /@capacitor\/haptics/);
  assert.match(css, /--sheet-height/);
  assert.match(css, /backdrop-filter: blur\(42px\)/);
});

test("packages a simulator app and only exports a correctly signed IPA", async () => {
  const [workflow, plist, scene] = await Promise.all([
    read("../.github/workflows/ios.yml"),
    read("../ios/App/App/Info.plist"),
    read("../ios/App/App/SceneDelegate.swift"),
  ]);

  assert.match(workflow, /generic\/platform=iOS Simulator/);
  assert.match(workflow, /FlightyEverything-Simulator\.xcarchive/);
  assert.match(workflow, /flighty-everything-ios-simulator\.app\.zip/);
  assert.match(workflow, /com\.wankun824\.flightyeverything/);
  assert.match(workflow, /release-testing/);
  assert.doesNotMatch(workflow, /unsigned.*\.ipa/i);
  assert.doesNotMatch(plist, /armv7/);
  assert.match(scene, /FlightyBridgeViewController/);
  assert.match(scene, /webView\?\.isOpaque = false/);
});
