import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { keyboardInset } from "../app/useMobileViewport.ts";
import { finishBackGesture, projectedDetent } from "../app/mobileGestures.ts";
const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("keyboard avoidance does not mistake pinch zoom or browser chrome for a keyboard", () => {
  assert.equal(keyboardInset(844, 510, 0, 1, true), 334);
  assert.equal(keyboardInset(844, 420, 0, 2, true), 0);
  assert.equal(keyboardInset(844, 790, 0, 1, true), 0);
  assert.equal(keyboardInset(844, 510, 0, 1, false), 0);
});
test("edge back cancels short drags, commits deliberate drags and respects velocity", () => {
  assert.equal(finishBackGesture(15, 1000, 390), false);
  assert.equal(finishBackGesture(35, 650, 390), true);
  assert.equal(finishBackGesture(115, 80, 390), true);
  assert.equal(finishBackGesture(60, 90, 390), false);
});
test("sheet flicks have momentum without crossing the minimum or maximum", () => {
  for (const height of [568, 667, 844, 932, 1180]) {
    assert.equal(projectedDetent(.32, 5, height, [.32,.58,.84]), .32);
    assert.equal(projectedDetent(.84, -5, height, [.32,.58,.84]), .84);
  }
  assert.equal(projectedDetent(.58, 0, 844, [.32,.58,.84]), .58);
  assert.equal(projectedDetent(.58, -2, 844, [.32,.58,.84]), .84);
});
test("all primary tabs share typography, glass and geometry; readable input sizes preserve zoom", async () => {
  const [css, app, base, html] = await Promise.all([read("../app/native-layout.css"),read("../app/FlightyApp.tsx"),read("../app/globals.css"),read("../native/index.html")]);
  assert.match(app, /flight-panel primary-panel/);
  assert.match(app, /minimumHeight: 304/);
  assert.match(css, /primary-panel \.panel-titlebar h1/);
  assert.match(css, /primary-panel \.passport-target-scroll/);
  assert.match(css, /primary-panel \.friends-body/);
  assert.match(css, /--sheet-material: rgba\(246,249,253,\.56\)/);
  assert.match(css, /blur\(34px\) saturate\(1\.55\)/);
  assert.match(css, /map-sheet\.mobile-journey-detail-target[\s\S]*border-radius: 34px 34px 0 0/);
  assert.match(css, /font-size: 16px !important/);
  assert.match(base, /-webkit-text-size-adjust: 100%/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
});
test("native controls use UIKit glass and Apple symbols with a guarded, state-based bridge", async () => {
  const [scene, bridge, app, nav] = await Promise.all([read("../ios/App/App/SceneDelegate.swift"),read("../app/useNativeChrome.ts"),read("../app/FlightyApp.tsx"),read("../app/useMobileNavigation.ts")]);
  assert.match(scene, /UIGlassEffect\(style: \.clear\)/);
  assert.match(scene, /UIImage\(systemName: symbol/);
  assert.match(scene, /UIScreenEdgePanGestureRecognizer/);
  assert.match(scene, /message.frameInfo.isMainFrame/);
  assert.match(scene, /webView\?\.url\?\.scheme == "capacitor"/);
  assert.match(scene, /accessibilityIdentifier = "flighty-native-chrome"/);
  assert.match(bridge, /ResizeObserver/);
  assert.match(bridge, /detailDetent/);
  assert.doesNotMatch(bridge, /setInterval/);
  assert.match(app, /composerCloseRequestRef.current\?\.\(\)/);
  assert.match(nav, /keyboardOpen === "true"/);
  assert.match(nav, /add-journey.*add-flight.*journey-detail/);
});
