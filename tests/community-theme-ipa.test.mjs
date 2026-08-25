import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("uses the four exact 3D assets recovered from the supplied source archive", async () => {
  const expected = {
    "legacy-plane.glb": "0e5fb6138bb5ba10693bbb3539b5c718c1f312a047ca0b04f9cf4e9d9f93af54",
    "train.glb": "b3c6457a530e848c761772bf6733c7bb11ae8d0e29ec4fb8f4238a6f73f9c044",
    "porsche.glb": "26a7ec3e8ea79855a8d0734779861ae6eaf20d2b9661908d98dd44a96589d803",
    "boat.glb": "ecd5e8135336b699c6903bcf37804419b5f5d98b0a961300d2e2b0608adf646c",
  };
  for (const [name, digest] of Object.entries(expected)) {
    const bytes = await readFile(new URL(`../public/models/${name}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), digest, name);
  }
  const vehicle = await read("../app/Vehicle3D.tsx");
  assert.match(vehicle, /DRACOLoader/);
  assert.match(vehicle, /requestAnimationFrame\(render\)/);
  assert.match(vehicle, /wheels\) wheel\.rotation\.x/);
});

test("community publishing is durable and exposes vehicle, service and stations on share pages", async () => {
  const [home, communityRoute, experience, cardUi, detail, detailRoute, client, api, schema, helper, migration, hosting, globalCss] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/community/page.tsx"),
    read("../app/JourneyExperience27.tsx"),
    read("../app/JourneyCommunityUI.tsx"),
    read("../app/CommunityJourneyPage.tsx"),
    read("../app/journey/[id]/page.tsx"),
    read("../app/communityData.ts"),
    read("../app/api/community/journeys/route.ts"),
    read("../db/schema.ts"),
    read("../db/community.ts"),
    read("../drizzle/0001_hard_starbolt.sql"),
    read("../.openai/hosting.json"),
    read("../app/globals.css"),
  ]);
  assert.match(home, /href="\/community"/);
  assert.match(home, /aria-label="打开旅行社区"/);
  assert.match(communityRoute, /JourneyExperience27/);
  assert.match(globalCss, /\.panel-titlebar \{ position: relative; z-index: 3/);
  assert.match(experience, /publishCommunityJourney/);
  assert.match(experience, /fetchCommunityJourneys/);
  assert.match(cardUi, /segment\.origin\.name/);
  assert.match(cardUi, /segment\.destination\.name/);
  assert.match(cardUi, /MODE_META\[segment\.mode\]\.label/);
  assert.match(cardUi, /segment\.service/);
  assert.match(detail, /出发站/);
  assert.match(detail, /到达站/);
  assert.match(detailRoute, /generateMetadata/);
  assert.match(detailRoute, /findCommunityJourneyRow/);
  assert.match(client, /communityJourneyHref/);
  assert.match(api, /export async function GET\(request: Request\)/);
  assert.match(api, /export async function POST/);
  assert.match(api, /export async function PATCH/);
  assert.match(schema, /communityJourneys/);
  assert.match(helper, /PRAGMA optimize/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS/);
  assert.match(hosting, /"d1": "DB"/);
});

test("follows system appearance and uses iOS 27 plus an Apple Silicon IPA runner", async () => {
  const [appearance, themeCss, globe, layout, scene, project, workflow] = await Promise.all([
    read("../app/appearance.ts"),
    read("../app/journey-theme.css"),
    read("../app/FlightGlobe.tsx"),
    read("../app/layout.tsx"),
    read("../ios/App/App/SceneDelegate.swift"),
    read("../ios/App/App.xcodeproj/project.pbxproj"),
    read("../.github/workflows/ios.yml"),
  ]);
  assert.match(appearance, /prefers-color-scheme: dark/);
  assert.match(appearance, /flighty-everything:appearance:v1/);
  assert.match(themeCss, /:root\[data-theme="light"\]/);
  assert.match(themeCss, /prefers-reduced-transparency/);
  assert.match(themeCss, /prefers-reduced-motion/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(globe, /theme === "light" \? "day" : "night"/);
  assert.match(scene, /#available\(iOS 27\.0/);
  assert.match(scene, /UIGlassEffect\(style: \.regular\)/);
  assert.match(project, /IPHONEOS_DEPLOYMENT_TARGET = 17\.0/);
  assert.match(workflow, /runs-on: xcode-27/);
  assert.match(workflow, /test "\$\(uname -m\)" = "arm64"/);
  assert.match(workflow, /iphoneos --show-sdk-version/);
  assert.match(workflow, /flighty-everything-ios-arm64-unsigned\.ipa/);
  assert.match(workflow, /unzip -t/);
  assert.match(workflow, /Export signed IPA/);
});
