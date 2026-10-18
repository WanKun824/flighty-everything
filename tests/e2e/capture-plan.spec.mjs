import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const pages = JSON.parse(execFileSync(process.env.PYTHON || "python", ["ios/qa/capture-pages.py", "--list"], { encoding: "utf8" }));

test("all 32 native capture selectors reach current visible pages without submitting data", async ({ page }, info) => {
  const evidence = { method: "Chrome Web screenshots / offline / NOT iOS Simulator", project: info.project.name, sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), pages: [] };
  test.setTimeout(120_000);
  await page.route(/https:\/\/(?:[^/]*mapbox\.com|[^/]*mapbox\.cn|[^/]*open-meteo\.com|[^/]*rainviewer\.com)\//, route => route.abort());
  await page.route("**/api/community/journeys**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline selector validation"}' }));
  await page.goto("/");
  await expect(page.locator(".primary-panel")).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.screenshotSession = "true"; });
  const nextFrame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(pages).toHaveLength(32);
  for (const spec of pages) {
    await test.step(spec.title, async () => {
      await page.evaluate(() => document.querySelector('dialog[open] [aria-label="关闭发布行程"]')?.click());
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("fly-screenshot-navigate", { detail: { tab: "flights", overlay: null, height: .3 } })));
      await nextFrame();
      for (const action of spec.actions) { await page.evaluate(action); await nextFrame(); }
      await expect(page.locator(spec.selector).first(), spec.key).toBeVisible();
      await page.evaluate(async () => {
        await new Promise(requestAnimationFrame);
        await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
      });
      const file = `${spec.key}.png`;
      await page.screenshot({ path: info.outputPath(file) });
      evidence.pages.push({ key: spec.key, title: spec.title, selector: spec.selector, file, theme: await page.locator("html").getAttribute("data-theme") });
    });
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("flighty-everything:journey:v2")).trips.length)).toBeGreaterThan(0);
  await writeFile(info.outputPath("web-manifest.json"), JSON.stringify(evidence, null, 2));
});
