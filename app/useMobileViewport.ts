"use client";

import { useEffect } from "react";

// The keyboard reduces the visual viewport, not the map's layout viewport.
// Never lock page zoom: only compensate for a keyboard at the normal scale.
export function keyboardInset(layoutHeight: number, visibleHeight: number, offsetTop: number, scale: number, editing: boolean) {
  const inset = Math.max(0, layoutHeight - visibleHeight - offsetTop);
  return editing && Math.abs(scale - 1) < 0.05 && inset > 100 ? Math.round(inset) : 0;
}

export function useMobileViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const update = () => {
      const editing = document.activeElement?.matches("input, textarea, select, [contenteditable=true]") ?? false;
      const visualInset = keyboardInset(window.innerHeight, viewport?.height ?? window.innerHeight, viewport?.offsetTop ?? 0, viewport?.scale ?? 1, editing);
      const nativeOpen = root.dataset.nativeKeyboardOpen === "true";
      const nativeInset = nativeOpen ? parseFloat(root.style.getPropertyValue("--native-keyboard-inset")) || 0 : 0;
      const inset = Math.max(visualInset, nativeInset);
      root.style.setProperty("--keyboard-inset", `${inset}px`);
      root.dataset.keyboardOpen = String(nativeOpen || inset > 0);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("flighty-native-keyboard-change", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("flighty-native-keyboard-change", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.style.removeProperty("--keyboard-inset");
      delete root.dataset.keyboardOpen;
    };
  }, []);
}
