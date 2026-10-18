import { test, expect } from "@playwright/test";

const key = "flighty-everything:journey:v2";
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(?:[^/]*mapbox\.com|[^/]*mapbox\.cn|[^/]*open-meteo\.com|[^/]*rainviewer\.com)\//, route => route.abort());
  await page.route("**/api/community/journeys**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline acceptance fixture"}' }));
  await page.goto("/");
  await expect.poll(async () => (await stored(page))?.trips?.length).toBeGreaterThan(0);
});

test("whole-trip deletion restores original order and active trip when undone", async ({ page }) => {
  const before = await stored(page);
  await page.locator(".primary-panel").focus(); await page.locator(".primary-panel").press("ArrowUp");
  await page.getByRole("button", { name: "编辑旅程名称", exact: true }).click();
  await page.getByRole("button", { name: "删除这趟旅程", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "取消", exact: true }).click();
  expect((await stored(page)).trips).toEqual(before.trips);
  await page.getByRole("button", { name: "删除这趟旅程", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "删除旅程", exact: true }).click();
  await expect.poll(async () => (await stored(page)).trips.length).toBe(before.trips.length - 1);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect.poll(async () => (await stored(page)).trips).toEqual(before.trips);
  expect((await stored(page)).activeTripId).toBe(before.activeTripId);
});

test("failed maps can be retried without changing saved journeys", async ({ page }) => {
  const before = await stored(page);
  await expect(page.getByText("地图暂不可用，已保存的行程仍可查看", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "重新加载地图", exact: true }).click();
  await expect(page.getByRole("button", { name: "重新加载地图", exact: true })).toBeVisible();
  expect((await stored(page)).trips).toEqual(before.trips);
});

test("native keyboard inset has one owner and does not cover form actions", async ({ page }) => {
  await page.getByRole("button", { name: "添加行程", exact: true }).click();
  const composer = page.getByRole("dialog", { name: "添加行程", exact: true });
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.nativeKeyboardOpen = "true";
    root.style.setProperty("--native-keyboard-inset", "300px");
    window.dispatchEvent(new Event("flighty-native-keyboard-change"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "true");
  await expect.poll(async () => { const box = await composer.boundingBox(); return Math.round(box.y + box.height); }).toBeLessThanOrEqual(page.viewportSize().height - 296);
  await page.evaluate(() => {
    document.documentElement.dataset.nativeKeyboardOpen = "false";
    document.documentElement.style.removeProperty("--native-keyboard-inset");
    window.dispatchEvent(new Event("flighty-native-keyboard-change"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "false");
  await expect(composer.locator(".composer-save")).toBeVisible();
});

test("four native chrome actions respect full sheets, community back and modal focus", async ({ page }) => {
  await page.addInitScript(() => {
    window.__chromeMessages = [];
    window.webkit = { messageHandlers: { flightyChrome: { postMessage: payload => window.__chromeMessages.push(payload) } } };
  });
  await page.reload();
  const last = () => page.evaluate(() => window.__chromeMessages.at(-1));
  await expect.poll(async () => (await last())?.bars.find(bar => bar.id === "tabs")?.buttons.length).toBe(4);
  await page.locator(".primary-panel").focus(); await page.locator(".primary-panel").press("End");
  await expect.poll(async () => (await last())?.bars.length).toBe(0);
  await page.locator(".primary-panel").press("Home");
  await page.getByRole("button", { name: "打开旅行社区", exact: true }).click();
  await page.locator(".community-card-actions").first().getByRole("button", { name: "详情", exact: true }).click();
  await expect.poll(async () => (await last())?.backEnabled).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("flighty-native-back", { detail: { phase: "end" } })));
  await expect(page.locator(".community-feed")).toBeVisible();
  await page.getByRole("button", { name: "发布行程", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "发布行程", exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(async () => (await last())?.bars.length).toBe(0);
  await dialog.locator(".publish-submit").focus(); await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "关闭发布行程" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator(".community-feed")).toBeVisible();
});

test("explicit clear confirmation removes journeys and drafts, including after reload", async ({ page }) => {
  const before = await stored(page);
  await page.evaluate(() => { localStorage.setItem("flighty-everything:journey-composer-draft:v1", "test-draft"); sessionStorage.setItem("flighty-everything:journey-composer-draft:v1", "test-draft"); });
  await page.getByRole("button", { name: "打开个人资料", exact: true }).click();
  await page.getByRole("button", { name: "清除本地数据", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "清除本地数据", exact: true }).click();
  await expect.poll(async () => (await stored(page)).segments.length).toBe(0);
  expect((await stored(page)).trips.some(trip => before.trips.some(old => old.id === trip.id))).toBe(false);
  expect(await page.evaluate(() => [localStorage, sessionStorage].map(store => store.getItem("flighty-everything:journey-composer-draft:v1")))).toEqual([null, null]);
  await page.reload();
  await expect(page.locator(".primary-panel")).toBeVisible();
  await expect.poll(async () => (await stored(page)).segments.length).toBe(0);
  await expect(page.locator(".journey-mode-badge")).toHaveCount(0);
});
