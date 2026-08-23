import test from "node:test";
import assert from "node:assert/strict";
import {
  DISMISS_SLACK, EDGE, MAX_W, MIN_H, MIN_W, RUBBER_CAP, SNAP, TOP_LIMIT,
  clampBox, defaultBox, detentHeight, dismissHint, dockX,
  nearestDetent, projectHeight, rubberBand, shouldDismiss, snapX, stageFromViewport,
} from "../app/panelGeometry.ts";

/**
 * 面板的拖拽边界和 sheet 停位是这一屏唯一不碰 DOM、能在没有浏览器的情况下真验的部分。
 * 交互本身测不了，至少把「算错了面板就飞出屏幕」的那几行锁住。
 */

const STAGE = { w: 1318, h: 1056 };   // 1440×1080 视口下舞台的实际尺寸

test("桌面：从视口反推的舞台尺寸和实测值一致", () => {
  // 首次渲染时还没有 ref，只能这么反推。反推公式一旦和 .app-shell 的内边距／侧栏宽度
  // 脱节，上次存的位置就会被夹到错误的范围里，所以拿常量比一遍。
  assert.deepEqual(stageFromViewport(1440, 1080), STAGE);
  // 窄到侧栏都放不下时不该返回负数以外的怪值 —— 调用方只在 >900px 时用它，
  // 但夹取逻辑要能吃下极端值不抛错。
  const tiny = stageFromViewport(100, 100);
  assert.equal(clampBox(defaultBox(tiny), tiny).w, MIN_W);
});

test("桌面：面板永远被夹在舞台内，顶边不越过顶栏那条保留带", () => {
  // 往左上角猛拖
  const topLeft = clampBox({ x: -900, y: -900, w: 378, h: 900 }, STAGE);
  assert.equal(topLeft.x, EDGE);
  assert.equal(topLeft.y, TOP_LIMIT, "顶边压到 82px 以上就会盖住搜索框");

  // 往右下角猛拖
  const bottomRight = clampBox({ x: 9999, y: 9999, w: 378, h: 400 }, STAGE);
  assert.equal(bottomRight.x, STAGE.w - 378 - EDGE);
  assert.equal(bottomRight.y, STAGE.h - 400 - EDGE);
});

test("桌面：尺寸夹在 320–560 之间，高度不会捅出舞台", () => {
  assert.equal(clampBox({ x: EDGE, y: TOP_LIMIT, w: 40, h: 500 }, STAGE).w, MIN_W);
  assert.equal(clampBox({ x: EDGE, y: TOP_LIMIT, w: 4000, h: 500 }, STAGE).w, MAX_W);
  assert.equal(clampBox({ x: EDGE, y: TOP_LIMIT, w: 378, h: 40 }, STAGE).h, MIN_H);
  assert.equal(clampBox({ x: EDGE, y: TOP_LIMIT, w: 378, h: 9999 }, STAGE).h, STAGE.h - TOP_LIMIT - EDGE);
});

test("桌面：默认停靠位贴左、占满顶栏之下的全部高度", () => {
  const box = defaultBox(STAGE);
  assert.deepEqual(box, { x: EDGE, y: TOP_LIMIT, w: 378, h: STAGE.h - TOP_LIMIT - EDGE });
  // 底边正好落在 EDGE 上，不多不少
  assert.equal(box.y + box.h, STAGE.h - EDGE);
});

test("桌面：舞台缩小后原来的位置会被夹回可见范围", () => {
  const wide = defaultBox(STAGE);
  const narrow = clampBox(wide, { w: 700, h: 500 });
  assert.ok(narrow.x + narrow.w + EDGE <= 700, `右缘 ${narrow.x + narrow.w} 超出了 700 的舞台`);
  assert.ok(narrow.y + narrow.h + EDGE <= 500 || narrow.h === MIN_H, "高度要么夹住要么退到下限");
});

test("桌面：离边缘 SNAP 以内吸附贴边，超出就自由摆", () => {
  const right = dockX("right", 378, STAGE);
  assert.deepEqual(snapX(EDGE + SNAP - 1, 378, STAGE), { x: EDGE, side: "left" });
  assert.deepEqual(snapX(right - SNAP + 1, 378, STAGE), { x: right, side: "right" });
  // 正中间不该被吸走
  const middle = Math.round((STAGE.w - 378) / 2);
  assert.deepEqual(snapX(middle, 378, STAGE), { x: middle, side: null });
});

test("窄屏：三个停位由低到高严格递增，且都装得进视口", () => {
  for (const viewportH of [568, 667, 844, 932, 1180]) {
    const small = detentHeight("small", viewportH);
    const medium = detentHeight("medium", viewportH);
    const large = detentHeight("large", viewportH);
    assert.ok(small < medium, `${viewportH}px 高的屏上 small=${small} 没有低于 medium=${medium}`);
    assert.ok(medium < large, `${viewportH}px 高的屏上 medium=${medium} 没有低于 large=${large}`);
    // 顶栏 58 + 标签栏 69 必须还留得下
    assert.ok(large <= viewportH - 127, `${viewportH}px 高的屏上 large=${large} 会顶到顶栏`);
  }
});

test("窄屏：small 停位装得下标题块和播放器", () => {
  // 标题栏 24 + 间距 10 + 标题块 83 + 间距 10 + 播放器 69 + 上下内边距 14
  assert.ok(detentHeight("small", 844) >= 210, "small 太矮，播放器会被切掉，这一档就没意义了");
});

test("窄屏：慢慢拖按位置落位，快速一甩按投影落位", () => {
  const viewportH = 844;
  const medium = detentHeight("medium", viewportH);
  const large = detentHeight("large", viewportH);

  // 手停在 medium 附近松手 → 留在 medium
  assert.equal(nearestDetent(projectHeight(medium + 20, 0), viewportH), "medium");
  // 同一个位置，但向上甩（高度变大，速度为正）→ 应该冲到 large
  const flickUp = projectHeight(medium + 20, 1.2);
  assert.ok(flickUp > medium + 20, "投影没有把甩动算进去");
  assert.equal(nearestDetent(flickUp, viewportH), "large");
  // 从 large 向下甩 → 落到更低的停位
  assert.notEqual(nearestDetent(projectHeight(large, -1.4), viewportH), "large");
});

test("窄屏：下拉过头才关闭，停在最低停位不关", () => {
  const viewportH = 844;
  const small = detentHeight("small", viewportH);
  assert.equal(shouldDismiss(small, viewportH), false, "停在最低停位不该关闭");
  assert.equal(shouldDismiss(small - DISMISS_SLACK - 1, viewportH), true);
  // 停在 small 但快速下甩 → 关闭
  assert.equal(shouldDismiss(projectHeight(small, -1.5), viewportH), true);
});

test("窄屏：拖过最高停位有阻尼且封顶", () => {
  const viewportH = 844;
  const large = detentHeight("large", viewportH);
  assert.equal(rubberBand(large - 50, viewportH), large - 50, "没超过最高停位时不该动手脚");
  const over = rubberBand(large + 100, viewportH);
  assert.ok(over > large && over < large + 100, "超出部分要打折");
  assert.ok(rubberBand(large + 10_000, viewportH) <= large + RUBBER_CAP, "阻尼没有封顶，能拉到天上去");
});

test("窄屏：临近关闭时给出淡出提示，正常高度不淡", () => {
  const viewportH = 844;
  const small = detentHeight("small", viewportH);
  assert.equal(dismissHint(small, viewportH), 1);
  assert.equal(dismissHint(small + 200, viewportH), 1);
  const hint = dismissHint(small - DISMISS_SLACK, viewportH);
  assert.ok(hint < 1 && hint >= .72, `淡出量 ${hint} 越界了`);
  assert.ok(dismissHint(small - 9999, viewportH) >= .72, "淡出有下限，不能真的淡到看不见");
});
