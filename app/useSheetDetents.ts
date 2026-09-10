"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type MouseEvent } from "react";
import { sheetSnapHaptic } from "./nativeHaptics";
import { consumeSheetDrag, projectedDetent } from "./mobileGestures";

export function nearestDetent(value: number, detents: readonly number[]) {
  return detents.reduce((nearest, detent) => Math.abs(detent - value) < Math.abs(nearest - value) ? detent : nearest);
}
export function clampSheetFraction(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

type Drag = {
  pointerId: number; startX: number; startY: number; lastX: number; lastY: number;
  lastTime: number; velocity: number; height: number; axis: "x" | "y" | null;
  scroll: HTMLElement | null; horizontal: HTMLElement | null; sheetMoved: boolean;
};

function scrollParent(target: HTMLElement, surface: HTMLElement, axis: "x" | "y") {
  for (let element: HTMLElement | null = target; element && element !== surface.parentElement; element = element.parentElement) {
    const style = getComputedStyle(element);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    if (/auto|scroll/.test(overflow) && (axis === "y" ? element.scrollHeight > element.clientHeight : element.scrollWidth > element.clientWidth)) return element;
  }
  return null;
}

export function useSheetDetents({ detents: requestedDetents, initial, minimumHeight, dismissible = false, onDismiss }: {
  detents: readonly number[]; initial: number; minimumHeight?: number; dismissible?: boolean; onDismiss?: () => void;
}) {
  const [detents, setDetents] = useState(requestedDetents);
  const [fraction, setFraction] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const fractionRef = useRef(initial);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const momentum = useRef(0);
  const previousDetents = useRef(requestedDetents);
  const minimum = Math.min(...detents);
  const maximum = Math.max(...detents);

  const commit = (next: number) => { fractionRef.current = next; setFraction(next); };
  useEffect(() => {
    const device = document.querySelector<HTMLElement>(".flighty-device");
    if (!device) return;
    const resize = () => {
      const style = getComputedStyle(document.documentElement);
      const safeTop = parseFloat(style.getPropertyValue("--native-safe-top")) || 0;
      const safeBottom = parseFloat(style.getPropertyValue("--native-safe-bottom")) || 0;
      const height = device.clientHeight || window.innerHeight;
      const min = minimumHeight ? Math.max(.32, Math.min(minimumHeight + safeBottom, height * .43) / height) : requestedDetents[0];
      const max = Math.min(.93, (height - safeTop - 12) / height);
      const next = [min, Math.max(min, Math.min(.57, max)), max];
      const old = previousDetents.current;
      const index = old.indexOf(nearestDetent(fractionRef.current, old));
      previousDetents.current = next;
      setDetents(next);
      commit(next[index]);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(device); resize();
    window.addEventListener("flighty-native-appearance-change", resize);
    return () => { observer.disconnect(); cancelAnimationFrame(momentum.current); window.removeEventListener("flighty-native-appearance-change", resize); };
    // Geometry depends on the device, not array identity on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimumHeight]);

  const snapTo = (next: number) => {
    commit(nearestDetent(clampSheetFraction(next, minimum, maximum), detents));
    void sheetSnapHaptic();
  };
  useEffect(() => {
    if (fraction > minimum + .005) return;
    for (const element of surfaceRef.current?.querySelectorAll<HTMLElement>(".panel-scroll, .mobile-detail-body, .passport-target-scroll, .friends-body, .map-sheet-scroll") ?? []) element.scrollTop = 0;
  }, [fraction, minimum]);
  const toggleExpanded = () => snapTo(fractionRef.current < maximum - .02 ? maximum : minimum);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const target = event.target instanceof HTMLElement ? event.target : (event.target as Element).parentElement;
    if (!target || target.closest("input, textarea, select, [contenteditable=true], [data-no-sheet-drag], .flight-tabbar")) return;
    cancelAnimationFrame(momentum.current);
    suppressClick.current = false;
    const surface = event.currentTarget;
    const sheet = surface.closest("section");
    dragRef.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, lastTime: event.timeStamp, velocity: 0,
      height: sheet?.parentElement?.getBoundingClientRect().height ?? window.innerHeight,
      scroll: scrollParent(target, surface, "y"), horizontal: scrollParent(target, surface, "x"),
      axis: null, sheetMoved: false,
    };
    // Capture only after a deliberate drag. A tap must still reach its button.
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.axis) {
      const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) < 7) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    const delta = event.clientY - drag.lastY;
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = .65 * delta / elapsed + .35 * drag.velocity;
    if (drag.axis === "x") {
      if (drag.horizontal) drag.horizontal.scrollLeft -= event.clientX - drag.lastX;
    } else {
      const lower = dismissible ? Math.max(.12, minimum - .2) : minimum;
      const old = fractionRef.current * drag.height;
      const result = consumeSheetDrag(old, drag.scroll?.scrollTop ?? 0, delta, lower * drag.height, maximum * drag.height,
        drag.scroll ? drag.scroll.scrollHeight - drag.scroll.clientHeight : 0);
      if (drag.scroll) drag.scroll.scrollTop = result.scroll;
      if (Math.abs(result.sheet - old) > .05) {
        drag.sheetMoved = true; setDragging(true); commit(result.sheet / drag.height);
      }
    }
    drag.lastX = event.clientX; drag.lastY = event.clientY; drag.lastTime = event.timeStamp;
  };
  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag.axis) return;
    const cancelled = event.type === "pointercancel";
    const velocity = cancelled || event.timeStamp - drag.lastTime > 100 ? 0 : drag.velocity;
    if (!cancelled && dismissible && fractionRef.current < minimum - .065) { onDismiss?.(); return; }
    if (drag.sheetMoved) snapTo(projectedDetent(fractionRef.current, velocity, drag.height, detents));
    else if (drag.axis === "y" && drag.scroll && !cancelled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const scroll = drag.scroll;
      let speed = -velocity * 16;
      const step = () => {
        const before = scroll.scrollTop;
        scroll.scrollTop += speed; speed *= .92;
        if (Math.abs(speed) > .4 && scroll.scrollTop !== before) momentum.current = requestAnimationFrame(step);
      };
      momentum.current = requestAnimationFrame(step);
    }
  };
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false; event.preventDefault(); event.stopPropagation();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    const index = detents.indexOf(nearestDetent(fractionRef.current, detents));
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault(); snapTo(detents[Math.max(0, Math.min(detents.length - 1, index + (event.key === "ArrowUp" ? 1 : -1)))]);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault(); snapTo(event.key === "Home" ? minimum : maximum);
    }
  };
  const handlers = { onPointerDownCapture: onPointerDown, onPointerMoveCapture: onPointerMove, onPointerUpCapture: finishDrag, onPointerCancelCapture: finishDrag, onClickCapture, onKeyDown };
  return {
    fraction, dragging, minimum, maximum, atMinimum: fraction <= minimum + .005, snapTo, toggleExpanded,
    sheetProps: { ...handlers, ref: (node: HTMLElement | null) => { surfaceRef.current = node; }, "data-sheet-surface": true, tabIndex: 0 },
    surfaceProps: { ...handlers, "data-sheet-drag-surface": true },
    handleProps: handlers,
  };
}
