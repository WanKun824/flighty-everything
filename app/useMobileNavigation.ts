"use client";

import { useEffect, useRef } from "react";
import { finishBackGesture } from "./mobileGestures";

export function useMobileNavigation(screen: string | null, onBack: () => void) {
  const callback = useRef(onBack);
  useEffect(() => { callback.current = onBack; }, [onBack]);
  useEffect(() => {
    if (!screen) return;
    const device = document.querySelector<HTMLElement>(".flighty-device");
    if (!device) return;
    const surfaces = [...device.querySelectorAll<HTMLElement>(":scope > .map-sheet, :scope > .full-sheet, :scope > .stats-sheet, :scope > .journey-composer, :scope > .passport-detail, .community-panel-scroll.community-push, .community-panel-scroll dialog[open]")].filter(element => element.getClientRects().length > 0);
    const surface = surfaces.at(-1);
    if (!surface) return;
    surface.classList.add("mobile-back-surface");
    let start: { x: number; y: number; time: number; id: number } | null = null;
    let vertical: { y: number; id: number; header: HTMLElement } | null = null;
    const animate = (distance: number, moving: boolean) => {
      surface.classList.toggle("is-back-swiping", moving);
      surface.style.setProperty("--back-swipe-x", `${Math.max(0, distance)}px`);
      surface.style.removeProperty("--back-swipe-y");
    };
    const back = () => {
      // A focused form first dismisses its keyboard. A second back leaves the form.
      if (document.documentElement.dataset.keyboardOpen === "true") {
        (document.activeElement as HTMLElement | null)?.blur();
      } else callback.current();
      animate(0, false);
    };
    const native = (event: Event) => {
      const { phase, distance = 0 } = (event as CustomEvent<{ phase: string; distance?: number }>).detail;
      if (phase === "end") back();
      else animate(phase === "cancel" ? 0 : distance, phase === "change");
    };
    const down = (event: PointerEvent) => {
      const header = (event.target as HTMLElement).closest<HTMLElement>(".sheet-header, .stats-header, .passport-detail-header");
      if (header && !["add-journey", "add-flight", "journey-detail", "journey-names"].includes(screen)
          && !(event.target as HTMLElement).closest("button, a, input, select")) {
        vertical = { y: event.clientY, id: event.pointerId, header };
        header.setPointerCapture(event.pointerId);
        return;
      }
      if (document.documentElement.dataset.nativeChrome === "true" || event.pointerType !== "touch") return;
      if (event.clientX - device.getBoundingClientRect().left > 22) return;
      start = { x: event.clientX, y: event.clientY, time: event.timeStamp, id: event.pointerId };
    };
    const move = (event: PointerEvent) => {
      if (vertical?.id === event.pointerId) {
        surface.classList.add("is-back-swiping");
        surface.style.setProperty("--back-swipe-y", `${Math.max(0, event.clientY - vertical.y)}px`);
        return;
      }
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dy) > 12 && Math.abs(dy) > dx) { start = null; return; }
      if (dx > 8) { event.preventDefault(); animate(dx, true); }
    };
    const up = (event: PointerEvent) => {
      if (vertical?.id === event.pointerId) {
        const commit = event.type !== "pointercancel" && event.clientY - vertical.y > 96;
        if (vertical.header.hasPointerCapture(event.pointerId)) vertical.header.releasePointerCapture(event.pointerId);
        vertical = null;
        if (commit) back(); else animate(0, false);
        return;
      }
      if (!start || start.id !== event.pointerId) return;
      const distance = event.clientX - start.x;
      const velocity = distance / Math.max(1, event.timeStamp - start.time) * 1000;
      const commit = event.type !== "pointercancel" && finishBackGesture(distance, velocity, device.clientWidth);
      start = null;
      if (commit) back(); else animate(0, false);
    };
    window.addEventListener("flighty-native-back", native);
    device.addEventListener("pointerdown", down);
    device.addEventListener("pointermove", move, { passive: false });
    device.addEventListener("pointerup", up);
    device.addEventListener("pointercancel", up);
    return () => {
      surface.classList.remove("mobile-back-surface", "is-back-swiping"); surface.style.removeProperty("--back-swipe-x"); surface.style.removeProperty("--back-swipe-y");
      window.removeEventListener("flighty-native-back", native);
      device.removeEventListener("pointerdown", down); device.removeEventListener("pointermove", move);
      device.removeEventListener("pointerup", up); device.removeEventListener("pointercancel", up);
    };
  }, [screen]);
}
