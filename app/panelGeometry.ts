/**
 * 行程面板的几何规则：桌面浮动窗口的边界与吸附，移动端 sheet 的停位。
 *
 * 单独拆成一个文件是因为这两套规则里差一个符号面板就会飞出舞台，而它们又恰好是
 * 这一屏里唯一不依赖 DOM、能在没有浏览器的情况下真验的部分 —— 交互本身没法自动测，
 * 至少把算错了会出事的算术锁住。
 */

/** 顶栏那条保留带的下沿：top 14 + 顶栏 56 + 12 的呼吸 = 82。面板顶边最高只到这儿。 */
export const TOP_LIMIT = 82;
/** 面板离舞台左右下三边的间距，跟顶栏的 14px 对齐。 */
export const EDGE = 14;
/** 离左右沿多近开始吸附贴边。 */
export const SNAP = 24;

export const MIN_W = 320;
export const MAX_W = 560;
export const MIN_H = 260;
/** 桌面默认宽度，跟顶栏同宽 —— 这个比例是定过的，改之前先看一眼截图。 */
export const DEFAULT_W = 378;

export type Box = { x: number; y: number; w: number; h: number };
export type Stage = { w: number; h: number };

/**
 * 舞台尺寸可以直接从视口算：.app-shell 是 12px 内边距 ×2 + 86px 侧栏 + 12px 间隙 = 122，
 * 高度是 100dvh 减上下内边距 24。
 *
 * 有这个函数才能在第一次 render 里就把上次存的位置夹回可见范围 —— 那时候还没有 ref，
 * 量不到真的元素。手势期间仍然量真实的 offsetParent，那是精确值。
 */
export const stageFromViewport = (viewportW: number, viewportH: number): Stage =>
  ({ w: viewportW - 122, h: viewportH - 24 });

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));

/**
 * 把面板夹回合法范围。
 *
 * 不允许拖出舞台：舞台是一张 30px 圆角的卡片而不是桌面，露出去的部分会被圆角切掉，
 * 看起来像渲染坏了。所以四边都留 EDGE，顶边额外让给顶栏。
 */
export function clampBox(box: Box, stage: Stage): Box {
  // 上限是 MAX_W 和「舞台减两边间距」里的小值：只写后者的话大屏上能拖到一千多宽，
  // 面板会把地图挤没；只写前者的话小屏上又会捅出舞台。
  const w = clamp(box.w, MIN_W, Math.max(MIN_W, Math.min(MAX_W, stage.w - EDGE * 2)));
  const h = clamp(box.h, MIN_H, Math.max(MIN_H, stage.h - TOP_LIMIT - EDGE));
  return {
    w, h,
    x: clamp(box.x, EDGE, stage.w - w - EDGE),
    y: clamp(box.y, TOP_LIMIT, stage.h - h - EDGE),
  };
}

/** 默认停靠位：左侧贴边，顶栏之下占满剩余高度。 */
export const defaultBox = (stage: Stage): Box =>
  clampBox({ x: EDGE, y: TOP_LIMIT, w: DEFAULT_W, h: stage.h - TOP_LIMIT - EDGE }, stage);

/** 面板贴住某侧时的 x。 */
export const dockX = (side: "left" | "right", w: number, stage: Stage) =>
  side === "left" ? EDGE : Math.max(EDGE, stage.w - w - EDGE);

/** 拖到离左/右沿 SNAP 以内就吸附；返回吸附后的 x 和吸住的是哪侧（吸住时给个视觉反馈）。 */
export function snapX(x: number, w: number, stage: Stage): { x: number; side: "left" | "right" | null } {
  const right = dockX("right", w, stage);
  if (Math.abs(x - EDGE) <= SNAP) return { x: EDGE, side: "left" };
  if (Math.abs(x - right) <= SNAP) return { x: right, side: "right" };
  return { x, side: null };
}

/* ---------- 移动端 sheet ---------- */

export type Detent = "small" | "medium" | "large";
/** 由低到高，nearestDetent 依赖这个顺序做遍历。 */
export const DETENTS: readonly Detent[] = ["small", "medium", "large"];

/**
 * 三个停位的像素高度。
 *
 * large 不写成 88dvh：机身顶栏 58 + 标签栏 69 + 呼吸一共要留 148，
 * 在 844 高的机子上 88dvh 是 743，会顶到顶栏底下去，所以取两者的小值。
 *
 * small 的 216 是量出来的，不是随手取的整数：标题栏 24 + 标题块 83 + 播放器 69
 * 加上间距和内边距刚好 210，取 216 留点余量。这一档要露出当前段和进度条 ——
 * 播放中收起面板还能看见走到哪儿了，是它存在的全部理由，切掉播放器就没意义了。
 * 算错也不会崩：面板 overflow: hidden，多出来的部分被切掉而已。
 */
export function detentHeight(detent: Detent, viewportH: number): number {
  if (detent === "small") return 216;
  if (detent === "medium") return Math.round(viewportH * .52);
  return Math.max(MIN_H, Math.min(Math.round(viewportH * .88), viewportH - 148));
}

/** 拖过最高停位后加阻尼：多出来的位移只吃 35%，且封顶 40px。 */
export const RUBBER = .35;
export const RUBBER_CAP = 40;
export function rubberBand(height: number, viewportH: number): number {
  const max = detentHeight("large", viewportH);
  if (height <= max) return height;
  return max + Math.min(RUBBER_CAP, (height - max) * RUBBER);
}

/**
 * 松手后的落点：不看松手那一刻的高度，看按当前速度再滑 250ms 会到哪儿。
 * UIKit 的 sheet 就是这么判的 —— 慢慢拖到一半和快速往上一甩必须落在不同停位，
 * 只按当前高度取最近值的话，甩再快也只会回到手指停下的那一档。
 *
 * velocity 是高度的变化率（px/ms），向下甩为负。
 */
export const PROJECTION_MS = 250;
export const projectHeight = (height: number, velocity: number) => height + velocity * PROJECTION_MS;

/** 落点最近的停位。 */
export function nearestDetent(height: number, viewportH: number): Detent {
  return DETENTS.reduce((best, detent) =>
    Math.abs(detentHeight(detent, viewportH) - height) < Math.abs(detentHeight(best, viewportH) - height)
      ? detent : best);
}

/** 比最小停位再低这么多就判为关闭，对应 iOS 的「下拉过头即关闭」。 */
export const DISMISS_SLACK = 64;
export const shouldDismiss = (projected: number, viewportH: number) =>
  projected < detentHeight("small", viewportH) - DISMISS_SLACK;

/** 下拉临近关闭时整块淡一点，提前告诉用户「再拉就关了」。 */
export function dismissHint(height: number, viewportH: number): number {
  const floor = detentHeight("small", viewportH);
  if (height >= floor) return 1;
  return Math.max(.72, 1 - (floor - height) / (DISMISS_SLACK * 2) * .28);
}
