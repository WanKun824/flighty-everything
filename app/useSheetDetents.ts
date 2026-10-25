"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { sheetSnapHaptic } from "./nativeHaptics";
import { projectedDetent } from "./mobileGestures";

export function nearestDetent(value: number, detents: readonly number[]) {
  return detents.reduce((nearest, detent) =>
    Math.abs(detent - value) < Math.abs(nearest - value) ? detent : nearest,
  );
}

export function clampSheetFraction(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function useSheetDetents({
  detents: requestedDetents,
  initial,
  minimumHeight,
  dismissible = false,
  onDismiss,
}: {
  detents: readonly number[];
  initial: number;
  minimumHeight?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const [phoneDetents, setPhoneDetents] = useState<readonly number[] | null>(null);
  const detents = phoneDetents ?? requestedDetents;
  const [fraction, setFraction] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const fractionRef = useRef(initial);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startFraction: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    height: number;
  } | null>(null);
  const minimum = Math.min(...detents);
  const maximum = Math.max(...detents);
  const previousDetents = useRef(requestedDetents);

  useEffect(() => {
    if (!minimumHeight) return;
    const resize = () => {
      const device = document.querySelector<HTMLElement>(".flighty-device");
      if (!device) return;
      const style = getComputedStyle(document.documentElement);
      const safeTop = parseFloat(style.getPropertyValue("--native-safe-top")) || 0;
      const safeBottom = parseFloat(style.getPropertyValue("--native-safe-bottom")) || 0;
      const height = device.clientHeight || window.visualViewport?.height || window.innerHeight;
      const min = Math.min(minimumHeight + safeBottom, height - safeTop - 110) / height;
      const max = Math.min(.82, (height - safeTop - 66) / height);
      const next = [min, (min + max) / 2, max];
      const previous = previousDetents.current;
      const index = previous.indexOf(nearestDetent(fractionRef.current, previous));
      previousDetents.current = next;
      fractionRef.current = next[index];
      setPhoneDetents(next);
      setFraction(next[index]);
    };
    const observer = new ResizeObserver(resize);
    const device = document.querySelector(".flighty-device");
    if (device) observer.observe(device);
    window.addEventListener("flighty-native-appearance-change", resize);
    resize();
    return () => { observer.disconnect(); window.removeEventListener("flighty-native-appearance-change", resize); };
  }, [minimumHeight]);

  const commit = (next: number) => {
    fractionRef.current = next;
    setFraction(next);
  };

  const snapTo = (next: number) => {
    commit(clampSheetFraction(next, minimum, maximum));
    void sheetSnapHaptic();
  };

  const toggleExpanded = () => {
    const next = fractionRef.current < maximum - 0.02 ? maximum : initial;
    snapTo(next);
  };

  const moveByKeyboard = (direction: -1 | 1) => {
    const ordered = [...detents].sort((a, b) => a - b);
    const current = ordered.indexOf(nearestDetent(fractionRef.current, ordered));
    snapTo(ordered[clampSheetFraction(current + direction, 0, ordered.length - 1)]);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (event.target !== event.currentTarget && (event.target as Element).closest("button, input, select, textarea, a")) {
      if (!event.currentTarget.classList.contains("sheet-drag-handle")) return;
    }
    const sheet = event.currentTarget.closest("section");
    const height = sheet?.parentElement?.getBoundingClientRect().height ?? window.innerHeight;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startFraction: sheet ? sheet.getBoundingClientRect().height / height : fractionRef.current,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      height,
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const viewportHeight = Math.max(1, drag.height);
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = .65 * ((event.clientY - drag.lastY) / elapsed) + .35 * drag.velocity;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    const lowerBound = dismissible ? Math.max(0.12, minimum - 0.2) : minimum;
    commit(
      clampSheetFraction(
        drag.startFraction - (event.clientY - drag.startY) / viewportHeight,
        lowerBound,
        maximum,
      ),
    );
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.type !== "pointercancel" && dismissible && fractionRef.current < minimum - 0.065) {
      void sheetSnapHaptic();
      onDismiss?.();
      return;
    }
    const velocity = event.type === "pointercancel" || event.timeStamp - drag.lastTime > 100 ? 0 : drag.velocity;
    snapTo(projectedDetent(fractionRef.current, velocity, drag.height, detents));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveByKeyboard(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveByKeyboard(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      snapTo(minimum);
    } else if (event.key === "End") {
      event.preventDefault();
      snapTo(maximum);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpanded();
    }
  };

  return {
    fraction,
    dragging,
    minimum,
    maximum,
    atMinimum: fraction <= minimum + 0.005,
    snapTo,
    toggleExpanded,
    surfaceProps: {
      "data-sheet-drag-surface": true,
      onPointerDown, onPointerMove, onPointerUp: finishDrag, onPointerCancel: finishDrag,
    },
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onKeyDown,
    },
  };
}
