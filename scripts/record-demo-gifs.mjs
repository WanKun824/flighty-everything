import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const out = path.join(root, 'docs/demos');
const scratch = path.join(root, 'build/gif-capture');
const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3007';
const fps = 7;
await mkdir(out, { recursive: true });
execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], { stdio: 'ignore' });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const report = {
  method: 'Actual Chrome Web screenshots encoded as GIF, not iOS Simulator or physical-device video',
  capturedAt: new Date().toISOString(), sourceCommit: git('rev-parse', 'HEAD'),
  applicationTree: git('rev-parse', 'HEAD:app'), worktreeHadChanges: Boolean(git('status', '--porcelain', '--untracked-files=no')),
  viewport: { width: 402, height: 874 }, fps, data: 'Fresh isolated profile; built-in fictional demo trips; live Mapbox basemap',
  clips: [],
};
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}),
  args: ['--enable-webgl', '--enable-unsafe-swiftshader'],
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function snapshot(page) {
  return page.evaluate(() => ({
    title: document.querySelector('.primary-panel h1')?.textContent,
    mapReady: document.querySelector('.flight-globe-map')?.dataset.mapReady,
    vehicle: document.querySelector('.journey-vehicle-3d-marker')?.getAttribute('aria-label'),
    vehiclePosition: (() => { const r = document.querySelector('.journey-vehicle-3d-marker')?.getBoundingClientRect(); return r ? [r.x, r.y] : null; })(),
    selected: JSON.parse(localStorage.getItem('flighty-everything:journey:v2'))?.selectedSegmentId,
    tripCount: JSON.parse(localStorage.getItem('flighty-everything:journey:v2'))?.trips.length,
  }));
}
async function navigate(page, detail) {
  await page.evaluate(detail => {
    document.documentElement.dataset.screenshotSession = 'true';
    window.dispatchEvent(new CustomEvent('fly-screenshot-navigate', { detail }));
  }, detail);
  await delay(600);
}
async function openPage() {
  const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1, colorScheme: 'light', locale: 'zh-CN', timezoneId: 'Asia/Hong_Kong', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.locator('.primary-panel').waitFor();
  await page.waitForFunction(() => document.querySelector('.flight-globe-map')?.dataset.mapReady === 'true', null, { timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('.journey-vehicle-3d-marker canvas'), null, { timeout: 30000 });
  return { context, page };
}
async function clip(id, title, prepare, actions) {
  const { context, page } = await openPage();
  const directory = path.join(scratch, id);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await prepare(page);
    const before = await snapshot(page), frames = [];
    let done = false;
    const started = performance.now();
    const recording = (async () => {
      while (!done) {
        const tick = performance.now();
        const name = `${String(frames.length).padStart(5, '0')}.png`;
        const bytes = await page.screenshot({ path: path.join(directory, name), animations: 'allow' });
        frames.push({ file: name, milliseconds: performance.now() - started, sha256: hash(bytes) });
        await delay(Math.max(0, 1000 / fps - (performance.now() - tick)));
      }
    })();
    try { await actions(page); } finally { done = true; await recording; }
    const durationMs = performance.now() - started;
    const after = await snapshot(page);
    await context.close();
    if (frames.length < 10) throw new Error('Too few captured frames');
    let concat = 'ffconcat version 1.0\n';
    for (let i = 0; i < frames.length; i++) {
      const duration = i + 1 < frames.length ? (frames[i + 1].milliseconds - frames[i].milliseconds) / 1000 : 1 / fps;
      concat += `file '${frames[i].file}'\nduration ${duration.toFixed(6)}\n`;
    }
    concat += `file '${frames.at(-1).file}'\n`;
    await writeFile(path.join(directory, 'frames.ffconcat'), concat);
    const destination = path.join(out, `${id}.gif`);
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(directory, 'frames.ffconcat'),
      '-filter_complex', `fps=${fps},split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`, '-loop', '0', destination], { timeout: 120000, stdio: 'pipe' });
    const bytes = await readFile(destination);
    if ((await stat(destination)).size > 10 * 1024 * 1024) throw new Error('GIF exceeds 10 MiB; reduce clip length before publishing');
    report.clips.push({ id, title, file: `${id}.gif`, frames: frames.length, durationMs: Math.round(durationMs), bytes: bytes.length, sha256: hash(bytes), before, after, pageErrors: errors });
    await writeFile(path.join(directory, 'frames.json'), JSON.stringify(frames, null, 2));
    await writeFile(path.join(out, 'manifest.json'), JSON.stringify(report, null, 2));
    console.log(`${id}: ${frames.length} frames, ${(bytes.length / 1048576).toFixed(2)} MiB`);
  } catch (error) { await context.close().catch(() => {}); throw error; }
}
try {
  await clip('flight', '飞机飞行与跟随', async page => {
    await navigate(page, { tab: 'flights', height: .57 });
    await page.getByRole('button', { name: '从头播放整趟旅程', exact: true }).click();
    await navigate(page, { tab: 'flights', height: .3 });
    await page.getByRole('button', { name: '跟随当前选中路段', exact: true }).click();
    await delay(600);
  }, async () => { await delay(10000); });

  await clip('airports', '全球机场浏览、搜索与定位', async page => {
    await page.getByRole('button', { name: '打开机场资料与收藏', exact: true }).click();
    await page.getByRole('searchbox', { name: '搜索所有机场' }).waitFor();
    await delay(600);
  }, async page => {
    await delay(1400);
    await page.getByRole('button', { name: '欧洲', exact: true }).click();
    await page.getByRole('searchbox', { name: '搜索所有机场' }).fill('LHR');
    await delay(1500);
    await page.locator('.airport-main').first().click();
    await delay(2800);
    await page.getByRole('button', { name: '返回机场列表', exact: true }).click();
    await page.getByRole('button', { name: '北美洲', exact: true }).click();
    await page.getByRole('searchbox', { name: '搜索所有机场' }).fill('JFK');
    await delay(1400);
    await page.locator('.airport-main').first().click();
    await delay(2800);
  });

  await clip('statistics', '三段演示旅行与统计筛选', async page => {
    await navigate(page, { tab: 'passport', height: .93 });
    await page.getByRole('button', { name: '全部旅迹统计', exact: true }).click();
    await page.locator('.passport-detail').waitFor();
    await delay(1200);
  }, async page => {
    await delay(1800);
    await page.getByRole('tab', { name: '2025', exact: true }).click();
    await delay(1700);
    await page.getByRole('tab', { name: '全部', exact: true }).click();
    await delay(1200);
    const pane = page.locator('.passport-detail-scroll');
    await pane.evaluate(el => el.scrollTo({ top: 500, behavior: 'smooth' }));
    await delay(1800);
    await page.getByRole('button', { name: '月份', exact: true }).click();
    await delay(1300);
    await pane.evaluate(el => el.scrollTo({ top: 1600, behavior: 'smooth' }));
    await delay(2500);
  });

  await clip('journeys', '飞机、火车、汽车、轮船的行程切换', async page => {
    await navigate(page, { tab: 'flights', height: .57 });
  }, async page => {
    await delay(1700);
    await page.getByRole('combobox', { name: '切换旅程' }).selectOption('demo-japan-coast');
    await delay(2400);
    await page.locator('.mobile-segment-select').filter({ hasText: '京都到神户' }).click();
    await delay(2800);
    await page.locator('.mobile-segment-select').filter({ hasText: '神户到高松' }).click();
    await delay(3000);
    await page.getByRole('combobox', { name: '切换旅程' }).selectOption('demo-asia-hops');
    await delay(2300);
  });
} finally { await browser.close(); }
