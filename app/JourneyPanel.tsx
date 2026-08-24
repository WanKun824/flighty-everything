"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import {
  DETENTS, MAX_W, MIN_W, clampBox, defaultBox, detentHeight, dismissHint,
  nearestDetent, projectHeight, rubberBand, shouldDismiss, snapX, stageFromViewport,
  type Box, type Detent, type Stage,
} from "./panelGeometry";

const STORE_KEY = "manyou:journey-panel";
/** 用户自己钉下来的默认位置，和「上次离开时的位置」分开存：复位要回的是前者。 */
const HOME_KEY = "manyou:journey-panel-home";
/** 拖了多少像素才算「拖过」，用来吃掉拉杆上的误触点击。 */
const DRAG_SLOP = 4;

type Mode = "move" | "e" | "s" | "se" | "sheet";

type Gesture = {
  mode: Mode;
  pointerId: number;
  originX: number;
  originY: number;
  /** 按下那一刻的盒子，位移全都相对它算，避免逐帧累加误差。 */
  from: Box;
  live: Box;
  /** 窄屏 sheet 用：上一帧的高度和时间戳，用来算甩动速度。 */
  lastH: number;
  lastT: number;
  velocity: number;
};

const measure = (el: HTMLElement): Box => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });

/** 读一份存下来的盒子；存储被禁、内容坏了、或者数字里有 NaN 都算没有。 */
function readBox(key: string, stage: Stage): Box | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Box | null;
    if (saved && [saved.x, saved.y, saved.w, saved.h].every((value) => Number.isFinite(value))) return clampBox(saved, stage);
  } catch { /* 用默认停靠位 */ }
  return null;
}

type Props = {
  hidden: boolean;
  onHide: () => void;
  onShow: () => void;
  children: ReactNode;
};

/**
 * 行程面板的外壳：桌面是可拖可缩的浮动窗口，窄屏是带停位的 sheet。
 *
 * 位置和尺寸逐帧只写 el.style，不进 React —— 面板里挂着 WebGL 载具和整张行程列表，
 * 每帧重渲染这棵子树的话拖起来必然掉帧。松手才 setState 落库，写进去的数值和
 * 手里那一帧完全相同，所以交回 React 时画面不会跳。
 */
export default function JourneyPanel({ hidden, onHide, onShow, children }: Props) {
  const elRef = useRef<HTMLElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const snapRef = useRef<"left" | "right" | null>(null);
  const dragged = useRef(false);

  const [wide, setWide] = useState(() => typeof window === "undefined" || window.innerWidth > 900);
  /**
   * null = 还没动过，位置交给 CSS 的默认停靠位。
   *
   * 上次存的位置在初始化函数里读，不在 effect 里读：effect 里 setState 会多走一轮渲染，
   * 而这时候面板里挂着 WebGL 载具和整张列表，白渲染一次不划算。代价是这一次读不到
   * 真实元素、只能按视口反推舞台尺寸 —— 够用了，手势一开始就会按真实尺寸重新夹一遍。
   *
   * 优先级：上次离开时的位置 → 用户钉下的默认位 → CSS 停靠位。
   */
  const [box, setBox] = useState<Box | null>(() => {
    if (typeof window === "undefined" || window.innerWidth <= 900) return null;
    const stage = stageFromViewport(window.innerWidth, window.innerHeight);
    return readBox(STORE_KEY, stage) ?? readBox(HOME_KEY, stage);
  });
  const [detent, setDetent] = useState<Detent>("medium");
  const [snapped, setSnapped] = useState<"left" | "right" | null>(null);
  const [interacting, setInteracting] = useState(false);

  /** 拖拽边界相对面板的定位父级（.screen）算，也就是舞台那张圆角卡片。 */
  const stageOf = useCallback(() => {
    const parent = elRef.current?.offsetParent as HTMLElement | null;
    return { w: parent?.clientWidth ?? 0, h: parent?.clientHeight ?? 0 };
  }, []);

  const commit = useCallback((next: Box) => {
    setBox(next);
    // 写不进去（无痕模式、存储被禁）就只是位置不跨会话保留，不值得打扰用户。
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 901px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // 窗口变小时把面板夹回舞台内，否则缩窗口会把它留在看不见的地方。
  useEffect(() => {
    if (!wide) return;
    const onResize = () => setBox((prev) => (prev ? clampBox(prev, stageOf()) : prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [wide, stageOf]);

  /**
   * 窄屏的 sheet 高度和 Mapbox 版权条的偏移都由停位决定，这里直接写 DOM。
   *
   * 不再多存一份高度进 state：停位本身已经是唯一真相，存两份就会有对不上的时候。
   * 桌面态只在 box 还没建立时清掉内联高度 —— box 建立之后高度由 React 的 style 管，
   * 两边同时写同一个属性会打架。跨过 900px 断点缩窗口时，这一句负责擦掉窄屏留下的高度。
   */
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const el = elRef.current;
      const height = wide ? 0 : detentHeight(detent, window.innerHeight);
      if (el) {
        if (!wide) el.style.height = `${height}px`;
        else if (!box) el.style.height = "";
      }
      root.style.setProperty("--sheet-h", `${hidden ? 0 : height}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--sheet-h");
    };
  }, [wide, hidden, detent, box]);

  const startDrag = (event: ReactPointerEvent, mode: Mode) => {
    const el = elRef.current;
    if (!el) return;
    // 拖标题栏和拉杆时要挡掉文字选中；缩放把手里没有文字，留着默认行为让它能拿到焦点。
    if (mode === "move" || mode === "sheet") event.preventDefault();
    event.stopPropagation();
    el.setPointerCapture(event.pointerId);
    // 过渡在手势期间必须关掉，否则每帧写高度都会被 .35s 的曲线拖住，跟不上手指。
    el.style.transition = "none";
    const from = measure(el);
    gesture.current = { mode, pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, from, live: from, lastH: from.h, lastT: 0, velocity: 0 };
    dragged.current = false;
    setInteracting(true);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const state = gesture.current;
    const el = elRef.current;
    if (!state || !el || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.originX;
    const dy = event.clientY - state.originY;
    if (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP) dragged.current = true;

    if (state.mode === "sheet") {
      const viewportH = window.innerHeight;
      // 往下拖 dy 为正，高度变小。下限留 60px：拖到比这更矮就没必要再跟手了。
      const height = rubberBand(Math.max(60, state.from.h - dy), viewportH);
      if (state.lastT) state.velocity = (height - state.lastH) / Math.max(1, event.timeStamp - state.lastT);
      state.lastH = height;
      state.lastT = event.timeStamp;
      el.style.height = `${height}px`;
      el.style.opacity = `${dismissHint(height, viewportH)}`;
      return;
    }

    const stage = stageOf();
    const next = clampBox(state.mode === "move"
      ? { ...state.from, x: state.from.x + dx, y: state.from.y + dy }
      : {
        ...state.from,
        w: state.mode === "s" ? state.from.w : state.from.w + dx,
        h: state.mode === "e" ? state.from.h : state.from.h + dy,
      }, stage);

    if (state.mode === "move") {
      const snap = snapX(next.x, next.w, stage);
      next.x = snap.x;
      // 只在吸附状态真的变了时候进 React，否则一帧一次 setState 就白省了。
      if (snap.side !== snapRef.current) { snapRef.current = snap.side; setSnapped(snap.side); }
    }

    state.live = next;
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
    el.style.width = `${next.w}px`;
    el.style.height = `${next.h}px`;
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    const state = gesture.current;
    const el = elRef.current;
    if (!state || !el || state.pointerId !== event.pointerId) return;
    gesture.current = null;
    setInteracting(false);
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);

    if (state.mode === "sheet") {
      const viewportH = window.innerHeight;
      el.style.opacity = "";
      // 先把过渡放回来，再写目标高度 —— 顺序反了的话高度会硬跳过去，弹不起来。
      el.style.transition = "";
      const projected = projectHeight(state.lastH, state.velocity);
      if (shouldDismiss(projected, viewportH)) { onHide(); return; }
      const target = nearestDetent(projected, viewportH);
      // 直接写目标高度让过渡从手里那一帧插值过去；setDetent 之后 effect 会写同一个值。
      el.style.height = `${detentHeight(target, viewportH)}px`;
      setDetent(target);
      return;
    }

    el.style.transition = "";
    snapRef.current = null;
    setSnapped(null);
    commit(state.live);
  };

  const onPanelPointerDown = (event: ReactPointerEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest(".panel-close, .panel-resize")) return;
    // 标题栏那条是整块可拖的，包括里面那颗拉杆按钮，所以要先认它 ——
    // 否则会被下一行「按钮不拖」的规则挡掉。
    const chrome = target.closest(".panel-chrome");
    if (!chrome && target.closest("button, input, a, [role=slider], .panel-body")) return;
    if (!chrome && !target.closest(".panel-head")) return;
    startDrag(event, wide ? "move" : "sheet");
  };

  /** 键盘缩放：把手是 ARIA 的 window-splitter，方向键细调、Shift 加速。 */
  const resizeByKey = (event: React.KeyboardEvent, mode: "e" | "s") => {
    const el = elRef.current;
    if (!el) return;
    const step = event.shiftKey ? 48 : 16;
    const forward = mode === "e" ? "ArrowRight" : "ArrowDown";
    const back = mode === "e" ? "ArrowLeft" : "ArrowUp";
    const delta = event.key === forward ? step : event.key === back ? -step : 0;
    if (!delta) return;
    event.preventDefault();
    // 不拦的话左右键会冒到窗口那层去切换行程段落。
    event.stopPropagation();
    const current = box ?? measure(el);
    commit(clampBox(mode === "e" ? { ...current, w: current.w + delta } : { ...current, h: current.h + delta }, stageOf()));
  };

  const cycleDetent = () => {
    if (dragged.current) return;
    setDetent(DETENTS[(DETENTS.indexOf(detent) + 1) % DETENTS.length]);
  };

  /**
   * 双击标题栏 = 回到默认位（macOS 窗口双击标题栏 zoom 的语义）。
   * Alt 双击 = 把当前位置大小钉成默认位 —— 摆好一次就不用每次重摆。
   * 反馈用 WAAPI 弹一下：不碰内联样式、不用计时器、动完自己清干净。
   */
  const onChromeDoubleClick = (event: React.MouseEvent) => {
    const el = elRef.current;
    if (!wide || !el || dragged.current) return;
    const stage = stageOf();
    if (event.altKey) {
      const here = box ?? measure(el);
      try { localStorage.setItem(HOME_KEY, JSON.stringify(here)); } catch { /* 存不进就只在本次会话有效 */ }
      el.animate([{ transform: "scale(1)" }, { transform: "scale(.985)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
      return;
    }
    commit(readBox(HOME_KEY, stage) ?? defaultBox(stage));
  };

  // 窄屏的高度由上面那个 effect 直接写 DOM，所以这里只在桌面态给内联样式。
  const style: CSSProperties = wide && box ? { left: box.x, top: box.y, width: box.w, height: box.h } : {};

  return (
    <>
      {/* 状态走 data-*、结构走 class：CSS 里 .journey-panel[data-hidden] 这种写法比
          再拼三个条件类名好读，className 也能保持成一个静态字面量 ——
          tests/rendered-html 的类名漂移检查只认得静态字面量，条件类它扫不到。

          inert 一次管住三件事：隐藏后不可点、不可 Tab、读屏跳过。
          子树保持挂载是为了让滑出动画有东西可动，代价是那颗 WebGL 载具还在跑，
          跟面板可见时是一样的开销，没有变差。 */}
      <aside
        ref={elRef} className="journey-panel frosted-panel" style={style} inert={hidden}
        data-hidden={hidden || undefined} data-interacting={interacting || undefined} data-snapped={snapped ?? undefined}
        onPointerDown={onPanelPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        <div className="panel-chrome" title={wide ? "拖动移动面板 · 双击回到默认位 · Alt+双击把当前位置存为默认" : undefined} onDoubleClick={onChromeDoubleClick}>
          {wide
            ? <span className="panel-grabber" aria-hidden="true"><i /></span>
            : <button type="button" className="panel-grabber" aria-label={`面板高度：${detent === "large" ? "最高" : detent === "medium" ? "中等" : "最低"}，点击切换下一档`} aria-expanded={detent !== "small"} onClick={cycleDetent}><i /></button>}
          <button type="button" className="panel-close" aria-label="隐藏行程面板（J）" title="隐藏行程面板（J）" onClick={onHide}><SFXmark size="xs" /></button>
        </div>

        {children}

        {wide && <>
          {/* 缩放把手。role="separator" + tabIndex + aria-valuenow 是 ARIA 的 window-splitter：
              可聚焦的 separator 按规范就是可交互控件，方向键调值是它的必备行为。
              规则判不出这一点，而它没有角色白名单可配，所以在这两处局部豁免。 */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <span
            className="panel-resize panel-resize-e" role="separator" tabIndex={0}
            aria-orientation="vertical" aria-label="调整面板宽度" aria-valuemin={MIN_W} aria-valuemax={MAX_W}
            aria-valuenow={box?.w ?? 0} onPointerDown={(event) => startDrag(event, "e")} onKeyDown={(event) => resizeByKey(event, "e")}
          />
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <span
            className="panel-resize panel-resize-s" role="separator" tabIndex={0}
            aria-orientation="horizontal" aria-label="调整面板高度"
            onPointerDown={(event) => startDrag(event, "s")} onKeyDown={(event) => resizeByKey(event, "s")}
          />
          <span className="panel-resize panel-resize-se" aria-hidden="true" onPointerDown={(event) => startDrag(event, "se")} />
        </>}
      </aside>

      {hidden && <button type="button" className="panel-restore frosted-panel" aria-label="显示行程面板（J）" title="显示行程面板（J）" onClick={onShow}><SFChevronRight size="sm" /></button>}
    </>
  );
}
