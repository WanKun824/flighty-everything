"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { sheetSnapHaptic } from "./nativeHaptics";

export function nearestDetent(value: number, detents: readonly number[]) {
  return detents.reduce((nearest, detent) =>
    Math.abs(detent - value) < Math.abs(nearest - value) ? detent : nearest,
  );
}

export function clampSheetFraction(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function useSheetDetents({
  detents,
  initial,
  dismissible = false,
  onDismiss,
}: {
  detents: readonly number[];
  initial: number;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const [fraction, setFraction] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const fractionRef = useRef(initial);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startFraction: number;
  } | null>(null);
  const minimum = Math.min(...detents);
  const maximum = Math.max(...detents);

  const commit = (next: number) => {
    fractionRef.current = next;
    setFraction(next);
  };

  const snapTo = (next: number) => {
    commit(next);
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

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startFraction: fractionRef.current,
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const viewportHeight = Math.max(1, window.visualViewport?.height ?? window.innerHeight);
    const lowerBound = dismissible ? Math.max(0.12, minimum - 0.2) : minimum;
    commit(
      clampSheetFraction(
        drag.startFraction - (event.clientY - drag.startY) / viewportHeight,
        lowerBound,
        maximum,
      ),
    );
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dismissible && fractionRef.current < minimum - 0.065) {
      void sheetSnapHaptic();
      onDismiss?.();
      return;
    }
    snapTo(nearestDetent(fractionRef.current, detents));
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
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onKeyDown,
    },
  };
}
