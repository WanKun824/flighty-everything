import { test, expect } from "@playwright/test";

const key = "flighty-everything:journey:v2";
const primary = page => page.locator(".primary-panel");
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const middle = async page => { await primary(page).focus(); await primary(page).press("ArrowUp"); };
const snapshot = async (page, testInfo, name) => {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
  });
  return page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
};

test.beforeEach(async ({ page }) => {
  // Tests use isolated browser profiles, never the user's loaded data. Public
  // network services are deliberately offline; no external API is required.
  await page.route(/https:\/\/(?:[^/]*mapbox\.com|[^/]*mapbox\.cn|[^/]*open-meteo\.com|[^/]*rainviewer\.com)\//, route => route.abort());
  await page.route("**/api/community/journeys**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline acceptance fixture"}' }));
  await page.goto("/");
  await expect(primary(page)).toBeVisible();
  await expect.poll(async () => (await stored(page))?.trips?.length).toBeGreaterThan(0);
});

test("Chinese tabs, detents, safe controls and no clipped viewport", async ({ page }, info) => {
  await expect(page.locator(".flight-tabbar nav button")).toHaveCount(4);
  await expect(page.locator(".flight-tabbar nav")).toHaveText("行程同行旅迹社区");
  const control = await page.locator(".map-tools").boundingBox();
  const panel = await primary(page).boundingBox();
  expect(control.y + control.height).toBeLessThanOrEqual(panel.y - 8);
  await snapshot(page, info, "01-home");
  await middle(page);
  await expect(primary(page)).toHaveAttribute("data-minimum", "false");
  await snapshot(page, info, "02-itinerary");
  await primary(page).focus(); await primary(page).press("End");
  await expect(page.locator(".flight-tabbar")).toBeHidden();
  await expect(page.locator(".map-tools")).toBeHidden();
  await snapshot(page, info, "03-full-sheet");
  await primary(page).press("Home");
  await expect(page.locator(".flight-tabbar")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const copy = await page.locator("body").innerText();
  expect(copy).not.toMatch(/FLIGHTY PASSPORT|Flighty Friends|Add Flight|My Flights|Your Profile|Continue|TRIP BUILDER/);
});

test("only one visible sheet; segment deletion requires confirmation and supports undo", async ({ page }, info) => {
  const before = await stored(page);
  await page.locator(".mobile-segment-detail-button").first().click();
  const detail = page.getByRole("dialog", { name: /详情$/ });
  await expect(detail).toBeVisible();
  await expect(primary(page)).toBeHidden();
  await expect(page.locator('.flighty-device > [role="dialog"]:visible')).toHaveCount(1);
  await detail.focus(); await detail.press("End");
  await expect(detail.locator(".journey-time-hero")).toBeVisible();
  await snapshot(page, info, "04-detail");
  await page.getByRole("button", { name: "删除这段行程", exact: true }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toBeVisible();
  await snapshot(page, info, "05-delete-confirm");
  await confirmation.getByRole("button", { name: "取消", exact: true }).click();
  expect((await stored(page)).segments).toHaveLength(before.segments.length);
  await page.getByRole("button", { name: "删除这段行程", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "删除路段", exact: true }).click();
  await expect.poll(async () => (await stored(page)).segments.length).toBe(before.segments.length - 1);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect.poll(async () => (await stored(page)).segments.map(item => item.id)).toEqual(before.segments.map(item => item.id));
  await page.reload(); await expect(primary(page)).toBeVisible();
  await expect.poll(async () => (await stored(page)).segments.length).toBe(before.segments.length);
});

test("one add flow keeps draft and dates across flight-search push and reload", async ({ page }, info) => {
  const before = await stored(page);
  await page.getByRole("button", { name: "添加行程", exact: true }).click();
  const composer = page.getByRole("dialog", { name: "添加行程", exact: true });
  await expect(composer).toBeVisible();
  await expect(primary(page)).toBeHidden();
  await expect(composer.locator(".composer-save")).toBeDisabled();
  await composer.locator('input[aria-label="出发日期"]').fill("2027-02-03");
  for (const [field, code] of [["起点", "HKG"], ["终点", "NRT"]]) {
    await composer.getByRole("button", { name: `选择${field}`, exact: true }).click();
    await page.getByRole("searchbox", { name: `搜索${field}` }).fill(code);
    await page.locator(".composer-place-row > button:first-child").first().click();
  }
  await expect(composer.locator(".composer-save")).toBeEnabled();
  await snapshot(page, info, "06-composer");
  await page.getByRole("button", { name: "通过航班号或日历添加" }).click();
  const flights = page.getByRole("dialog", { name: "航班工具", exact: true });
  await expect(flights).toBeVisible();
  await expect(page.locator('.flighty-device > [role="dialog"]:visible')).toHaveCount(1);
  await snapshot(page, info, "07-flight-search");
  await flights.getByRole("button", { name: "返回", exact: true }).click();
  await expect(composer.locator('input[aria-label="出发日期"]')).toHaveValue("2027-02-03");
  await expect(composer.locator(".composer-save")).toBeEnabled();
  await composer.locator(".composer-save").click();
  await expect(primary(page)).toBeVisible();
  await expect.poll(async () => (await stored(page)).trips.length).toBe(before.trips.length + 1);
  const saved = await stored(page);
  expect(saved.trips.map(trip => trip.id)).toEqual(expect.arrayContaining(before.trips.map(trip => trip.id)));
  expect(saved.segments[0].departure).toBe("09:00");
  await page.reload(); await expect(primary(page)).toBeVisible();
  await expect.poll(async () => (await stored(page)).activeTripId).toBe(saved.activeTripId);
});

test("airport search stays above the list; favorites survive a reload", async ({ page }, info) => {
  await page.getByRole("button", { name: "打开机场资料与收藏" }).click();
  await page.getByRole("searchbox", { name: "搜索所有机场" }).fill("HKG");
  await expect(page.locator(".airport-row")).toHaveCount(1);
  expect(await page.locator(".airport-search-orb").count()).toBe(0);
  await page.locator(".airport-row .favorite-button").click();
  await expect(page.locator(".airport-row .favorite-button")).toHaveAttribute("aria-pressed", "true");
  await snapshot(page, info, "08-airport-search");
  await page.locator(".airport-main").click();
  await expect(page.getByRole("button", { name: "返回机场列表" })).toBeVisible();
  await page.getByRole("button", { name: "返回机场列表" }).click();
  await page.getByRole("button", { name: "关闭机场", exact: true }).click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("flighty-everything:state:v1"))?.favorites)).toContain("HKG");
});

test("passport and community are readable main-app surfaces with pushed pages", async ({ page }, info) => {
  await page.getByRole("button", { name: "旅迹", exact: true }).click();
  await expect(page.locator(".passport-summary-card")).toBeVisible();
  await snapshot(page, info, "09-passport");
  await page.getByRole("button", { name: "全部旅迹统计", exact: true }).click();
  const header = await page.locator(".passport-detail-header").boundingBox();
  const filter = await page.locator(".passport-detail-period").boundingBox();
  expect(header.y + header.height).toBeLessThanOrEqual(filter.y);
  await snapshot(page, info, "10-statistics");
  await page.getByRole("button", { name: "返回旅迹" }).click();
  await page.getByRole("button", { name: "打开旅行社区" }).click();
  await expect(page.locator(".community-feed")).toBeVisible();
  await expect(page.locator(".community-sync-status")).toContainText("离线精选");
  await snapshot(page, info, "11-community");
  await page.locator(".community-card-actions").first().getByRole("button", { name: "详情", exact: true }).click();
  await expect(page.locator(".community-detail-card")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "发布行程", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "发布行程", exact: true })).toBeVisible();
  await snapshot(page, info, "12-publish");
  await page.getByRole("button", { name: "关闭发布行程" }).click();
  await expect(page.locator(".community-feed")).toBeVisible();
});

test("profile theme switching and clear-data cancellation preserve all loaded journeys", async ({ page }, info) => {
  const before = await stored(page);
  await page.getByRole("button", { name: "打开个人资料" }).click();
  expect(await page.locator(".profile-sheet").evaluate(element => getComputedStyle(element).backgroundColor)).toMatch(/^rgb\(/);
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "浅色", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await snapshot(page, info, "13-profile");
  await page.getByRole("button", { name: "清除本地数据", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "取消", exact: true }).click();
  expect((await stored(page)).trips).toEqual(before.trips);
  await page.getByRole("button", { name: "关闭个人资料", exact: true }).click();
  await page.reload(); await expect(primary(page)).toBeVisible();
  expect((await stored(page)).trips).toEqual(before.trips);
});
