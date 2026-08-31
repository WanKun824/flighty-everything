import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("journey selection has one source of truth and separates map focus from details", async () => {
  const [app, mobile] = await Promise.all([
    read("../app/FlightyApp.tsx"),
    read("../app/MobileJourney.tsx"),
  ]);

  assert.match(app, /const selectedJourneyId = journeyStore\.state\.selectedSegmentId \|\| null/);
  assert.doesNotMatch(app, /setSelectedJourneyId/);
  assert.match(app, /onSelect=\{\(segment\) => selectJourneySegment\(segment\.id\)\}/);
  assert.match(app, /onOpenDetails=\{\(segment\) => openJourneyDetails\(segment\.id\)\}/);
  assert.match(mobile, /className="mobile-segment-select"[\s\S]*?onClick=\{\(\) => selected \? onOpenDetails\(segment\) : onSelect\(segment\)\}/);
  assert.match(mobile, /className="mobile-segment-detail-button"[\s\S]*?onClick=\{\(\) => onOpenDetails\(segment\)\}/);
  assert.match(mobile, /onClick=\{onToggleOverview\}[\s\S]*?aria-expanded=\{overviewExpanded\}/);
  assert.match(app, /mainSheet\.fraction > 0\.5 \? mainSheet\.minimum : mainSheet\.maximum/);
});

test("journey details stop at their minimum height and destructive actions can be undone", async () => {
  const [app, mobile, storage] = await Promise.all([
    read("../app/FlightyApp.tsx"),
    read("../app/MobileJourney.tsx"),
    read("../app/journeyStorage.ts"),
  ]);

  assert.match(mobile, /detents: \[0\.32, 0\.58, 0\.84\][\s\S]*?dismissible: false/);
  assert.doesNotMatch(mobile, /onDismiss: onClose/);
  assert.match(app, /notify\("已删除这段行程", "撤销"/);
  assert.match(app, /journeyStore\.restoreSegments\(snapshot, deletedId\)/);
  assert.match(storage, /const restoreSegments = useCallback/);
});

test("map playback and follow stay scoped to the selected segment", async () => {
  const globe = await read("../app/FlightGlobe.tsx");

  assert.match(globe, /const segment = journeySegments\.find\([\s\S]*?item\.id === selectedJourneySegmentId/);
  assert.doesNotMatch(globe, /preferredSegment|playbackSegments|playbackIndex/);
  assert.match(globe, /journeySelectionToken/);
  assert.match(globe, /map\.dragRotate\.disable\(\)/);
  assert.match(globe, /map\.touchZoomRotate\.disableRotation\(\)/);
  assert.match(globe, /callbacksRef\.current\.onFollowInterrupted\?\.\(\)/);
});

test("mobile planning preserves drafts across flight tools and guards discarding", async () => {
  const [app, composer] = await Promise.all([
    read("../app/FlightyApp.tsx"),
    read("../app/JourneyComposer.tsx"),
  ]);

  assert.match(composer, /MOBILE_DRAFT_KEY/);
  assert.match(composer, /window\.sessionStorage\.setItem/);
  assert.match(composer, /role="alertdialog"/);
  assert.match(composer, /已暂存 \{stagedCount\} 段/);
  assert.match(composer, /保存这次规划草稿？/);
  assert.match(composer, /保存草稿并退出/);
  assert.match(composer, /importedSegments/);
  assert.match(app, /stageFlightsForComposer/);
  assert.match(app, /onClose=\{\(\) => setOverlay\("add-journey"\)\}/);
  assert.match(app, /onImportedSegmentsConsumed/);
  assert.match(app, /overlay === "add-journey" \|\| overlay === "add-flight"/);
  assert.match(app, /chooseTab=\{chooseBottomTab\}/);
  assert.match(app, /onCloseRequestReady=\{registerComposerCloseRequest\}/);
  assert.match(composer, /onCloseCancelled\?\.\(\)/);
});
