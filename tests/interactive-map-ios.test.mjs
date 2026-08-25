import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("wires real 3D vehicles and all three production map modes", async () => {
  const [globe, vehicle, css] = await Promise.all([
    read("../app/FlightGlobe.tsx"),
    read("../app/Vehicle3D.tsx"),
    read("../app/globals.css"),
  ]);

  for (const mode of ["satellite", "streets", "traffic"])
    assert.match(globe, new RegExp(`id: "${mode}"`));
  assert.match(globe, /mapbox:\/\/mapbox\.mapbox-traffic-v1/);
  assert.match(globe, /"source-layer": "traffic"/);
  for (const congestion of ["low", "moderate", "heavy", "severe"])
    assert.match(globe, new RegExp(`"${congestion}"`));
  assert.match(globe, /requestAnimationFrame\(animate\)/);
  assert.match(globe, /createPortal\(/);
  assert.match(globe, /<Vehicle3D/);
  assert.match(globe, /journey-vehicle-3d-marker/);
  assert.match(vehicle, /GLTFLoader/);
  for (const model of ["legacy-plane.glb", "porsche.glb", "train.glb", "boat.glb"])
    assert.match(vehicle, new RegExp(model.replace(".", "\\.")));
  assert.match(css, /\.journey-vehicle-3d-marker/);
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

  assert.match(page, /\[0\.31, 0\.47, 0\.82\]/);
  assert.match(mobile, /\[0\.32, 0\.58, 0\.84\]/);
  assert.match(hook, /setPointerCapture/);
  assert.match(hook, /ArrowDown/);
  assert.match(hook, /prefers-reduced-motion|visualViewport/);
  assert.match(haptics, /Haptics\.impact/);
  assert.match(packageJson, /@capacitor\/haptics/);
  assert.match(css, /--sheet-height/);
  assert.match(css, /backdrop-filter: blur\(42px\)/);
});

test("persists light, dark and system appearance across the map and native shell", async () => {
  const [page, appearance, globe, css, layout] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/appearance.ts"),
    read("../app/FlightGlobe.tsx"),
    read("../app/globals.css"),
    read("../app/layout.tsx"),
  ]);

  assert.match(appearance, /flighty-everything:appearance:v1/);
  assert.match(appearance, /matchMedia\(SYSTEM_QUERY\)/);
  assert.match(appearance, /root\.dataset\.theme = resolved/);
  assert.match(page, /data-theme=\{appearance\.resolved\}/);
  assert.match(page, /theme=\{appearance\.resolved\}/);
  assert.match(page, /onAppearanceChange=\{appearance\.setMode\}/);
  assert.match(globe, /theme === "light" \? "day" : "night"/);
  assert.match(css, /\.flighty-page\[data-theme="light"\]/);
  assert.match(layout, /suppressHydrationWarning/);
});

test("packages simulator and clearly labeled device IPA while signed export stays gated", async () => {
  const [workflow, plist, scene] = await Promise.all([
    read("../.github/workflows/ios.yml"),
    read("../ios/App/App/Info.plist"),
    read("../ios/App/App/SceneDelegate.swift"),
  ]);

  assert.match(workflow, /generic\/platform=iOS Simulator/);
  assert.match(workflow, /runs-on: xcode-27/);
  assert.match(workflow, /uname -m/);
  assert.match(workflow, /show-sdk-version/);
  assert.match(workflow, /FlightyEverything-Simulator\.xcarchive/);
  assert.match(workflow, /flighty-everything-ios-simulator\.app\.zip/);
  assert.match(workflow, /flighty-everything-ios-arm64-unsigned\.ipa/);
  assert.match(workflow, /com\.wankun824\.flightyeverything/);
  assert.match(workflow, /release-testing/);
  assert.match(workflow, /if: steps\.signing\.outputs\.enabled == 'true'/);
  assert.doesNotMatch(plist, /armv7/);
  assert.match(scene, /FlightyBridgeViewController/);
  assert.match(scene, /webView\?\.isOpaque = false/);
  assert.match(scene, /#available\(iOS 27\.0/);
  assert.match(scene, /UIGlassEffect\(style: \.regular\)/);
});
