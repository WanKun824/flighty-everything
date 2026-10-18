import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SHEET_DETENTS, mapControlLayout } from "../app/sheetLayout.ts";
import { mergeRestoredSegments } from "../app/journeyUndo.ts";

const read = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const declarations = block => Object.fromEntries([...block.matchAll(/(--ios-[\w-]+):\s*(#[\da-f]+)\s*;/gi)].map(match => [match[1], match[2]]));
function luminance(hex) {
  const value = hex.slice(1);
  const normalized = value.length === 3 ? [...value].map(c => c + c).join("") : value;
  const channels = [0, 2, 4].map(i => parseInt(normalized.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test("both themes have accessible primary, secondary, action and destructive text", async () => {
  const css = await read("app/ios-tokens.css");
  const dark = declarations(css.match(/:root\s*{([^}]+)}/)[1]);
  const light = { ...dark, ...declarations(css.match(/:root\[data-theme="light"\]\s*{([^}]+)}/)[1]) };
  for (const [theme, tokens] of Object.entries({ light, dark })) {
    for (const foreground of ["--ios-label", "--ios-secondary-label", "--ios-link", "--ios-destructive-label"]) {
      assert.ok(ratio(tokens[foreground], tokens["--ios-grouped-card"]) >= 4.5, `${theme} ${foreground} fails WCAG AA`);
    }
    assert.ok(ratio(tokens["--ios-on-accent"], tokens["--ios-action"]) >= 4.5, `${theme} filled action fails WCAG AA`);
  }
});

test("sheet system uses one shared summary, middle and safe-area full detent", () => {
  assert.deepEqual(SHEET_DETENTS, [.3, .57, .93]);
  for (const height of [400, 667, 874]) for (const fraction of SHEET_DETENTS) {
    const layout = mapControlLayout(height, fraction, 62);
    if (!layout.hidden) {
      assert.ok(layout.top >= 74);
      assert.ok(layout.top + 148 <= height * (1 - fraction) - 16);
    }
    if (fraction > .57) assert.equal(layout.hidden, true);
  }
});

test("official native interactions are synchronized without double-counting keyboard height", async () => {
  const [native, viewport, config, swift] = await Promise.all([
    read("app/nativeInteractions.ts"), read("app/useMobileViewport.ts"), read("capacitor.config.ts"), read("ios/App/App/SceneDelegate.swift"),
  ]);
  for (const plugin of ["action-sheet", "dialog", "share", "keyboard"]) assert.ok(native.includes(`@capacitor/${plugin}`));
  assert.match(config, /Keyboard:\s*{ resize: KeyboardResize\.None }/);
  assert.match(viewport, /Math\.max\(visualInset, nativeInset\)/);
  assert.match(native, /getPlatform\(\) === "ios" \? height : 0/);
  assert.match(swift, /UIGlassEffect/);
});

test("community modal has a browser top layer and native edge-back integration", async () => {
  const [ui, panel, chrome, accessibility] = await Promise.all([
    read("app/JourneyCommunityUI.tsx"), read("app/CommunityPanel.tsx"), read("app/useNativeChrome.ts"), read("app/useSheetAccessibility.ts"),
  ]);
  assert.match(ui, /dialog\?\.showModal\(\)/);
  assert.match(ui, /onCancel=/);
  assert.match(panel, /useMobileNavigation\(/);
  assert.match(chrome, /keyboard \|\| modal \|\| zoomed/);
  assert.match(accessibility, /document\.querySelector\("dialog\[open\]"\)/);
});

test("undo does not overwrite newer edits or delete newly added segments", () => {
  const before = Object.freeze([Object.freeze({ id: "a", title: "原标题" }), Object.freeze({ id: "b", title: "已删除" })]);
  const current = Object.freeze([Object.freeze({ id: "a", title: "较新修改" }), Object.freeze({ id: "c", title: "稍后新增" })]);
  const restored = mergeRestoredSegments(before, current);
  assert.deepEqual(restored.map(segment => segment.id), ["a", "b", "c"]);
  assert.equal(restored[0].title, "较新修改");
  assert.deepEqual(mergeRestoredSegments(before, restored), restored);
});

test("map failures have explicit recoverable UI instead of an endless loading state", async () => {
  const [globe, passport] = await Promise.all([read("app/FlightGlobe.tsx"), read("app/PassportWorldMap.tsx")]);
  assert.match(globe, /map\.on\("error"/);
  assert.match(globe, /重新加载地图/);
  assert.match(passport, /统计数据仍保留/);
  assert.match(passport, /完成行程后，在这里查看世界足迹/);
  assert.doesNotMatch(passport, /#6500ee|#210063/);
});
