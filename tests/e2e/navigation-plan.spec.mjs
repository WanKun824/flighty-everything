import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";

const pages = JSON.parse(execFileSync(process.env.PYTHON || "python", ["ios/qa/capture-pages.py", "--list"], { encoding: "utf8" }));

test("all 32 navigation targets remain reachable without submitting data or recording images", async ({ page }) => {
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
    });
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("flighty-everything:journey:v2")).trips.length)).toBeGreaterThan(0);
});
