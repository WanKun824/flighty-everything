"use client";

import { useEffect, useRef } from "react";

export function useSheetAccessibility(screen: string | null, onBack: () => void) {
  const callback = useRef(onBack);
  useEffect(() => { callback.current = onBack; }, [onBack]);
  useEffect(() => {
    if (!screen) return;
    const previous = document.activeElement as HTMLElement | null;
    const surface = [...document.querySelectorAll<HTMLElement>('.flighty-device [role="dialog"], .flighty-device dialog')].find(element => !element.hidden && element.getClientRects().length > 0);
    if (!surface) return;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    const focusable = () => [...surface.querySelectorAll<HTMLElement>(selector)].filter(element => !!element.getClientRects().length);
    const frame = requestAnimationFrame(() => focusable()[0]?.focus({ preventScroll: true }));
    const key = (event: KeyboardEvent) => {
      // A child confirmation owns its focus. For the publishing dialog itself,
      // keep Tab in the form while allowing the browser's native cancel event.
      const dialog = document.querySelector("dialog[open]");
      if (dialog && dialog !== surface) return;
      if (event.key === "Escape") { if (dialog === surface) return; event.preventDefault(); callback.current(); }
      if (event.key !== "Tab" || (!dialog && surface.getAttribute("aria-modal") !== "true")) return;
      const elements = focusable(), first = elements[0], last = elements.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [screen]);
}
