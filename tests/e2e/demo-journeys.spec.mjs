import { test, expect } from '@playwright/test';
const key = 'flighty-everything:journey:v2';
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(?:[^/]*mapbox\.com|[^/]*mapbox\.cn|[^/]*open-meteo\.com|[^/]*rainviewer\.com)\//, route => route.abort());
});

test('new isolated store contains all demo modes and nonzero year-filtered statistics', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await stored(page))?.trips.length).toBe(5);
  const state = await stored(page);
  expect(state.trips.filter(trip => trip.id.startsWith('demo-'))).toHaveLength(3);
  await page.evaluate(() => {
    document.documentElement.dataset.screenshotSession = 'true';
    window.dispatchEvent(new CustomEvent('fly-screenshot-navigate', { detail: { tab: 'passport', height: .93 } }));
  });
  await expect(page.locator('.passport-summary-grid > span').first().locator('strong')).toHaveText('8');
  await page.getByRole('button', { name: '全部旅迹统计', exact: true }).click();
  await expect(page.locator('.passport-hero-summary')).toContainText('7,160');
  await page.getByRole('tab', { name: '2025', exact: true }).click();
  await expect(page.locator('.passport-hero-summary')).toContainText('809');
  await page.reload();
  await expect.poll(async () => (await stored(page))?.trips.length).toBe(5);
});

test('existing saved journeys are neither replaced nor populated with demo history', async ({ page }) => {
  const trip = { id: 'existing-user-trip', name: '保留我的旅行', color: '#0a84ff', motif: 'skyline', segments: [], createdAt: '2026-01-01T00:00:00Z', savedToPassportAt: null };
  await page.addInitScript(({ key, trip }) => {
    localStorage.setItem(key, JSON.stringify({ trips: [trip], activeTripId: trip.id, collectionName: '我的行程', tripName: trip.name, segments: [], selectedSegmentId: '', weatherMode: 'none' }));
  }, { key, trip });
  await page.goto('/');
  await expect.poll(async () => (await stored(page))?.activeTripId).toBe(trip.id);
  await expect(page.locator('.primary-panel')).toBeVisible();
  await expect.poll(async () => (await stored(page))?.trips).toEqual([trip]);
  await page.reload();
  await expect.poll(async () => (await stored(page))?.trips).toEqual([trip]);
});
