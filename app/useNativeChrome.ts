"use client";

import { useEffect } from "react";

type ChromeHandler = { postMessage: (value: unknown) => void };
export function useNativeChrome(screenKey: string, backEnabled: boolean) {
  useEffect(() => {
    const handler = (window as Window & { webkit?: { messageHandlers?: { flightyChrome?: ChromeHandler } } }).webkit?.messageHandlers?.flightyChrome;
    if (!handler) return;
    let frame = 0;
    let lastPayload = "";
    const actions = new Map<string, HTMLButtonElement>();
    const rect = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    const publish = () => {
      frame = 0;
      actions.clear();
      const keyboard = document.documentElement.dataset.keyboardOpen === "true";
      const zoomed = Math.abs((window.visualViewport?.scale ?? 1) - 1) > .05;
      const definitions = [
        { id: "tabs", selector: ".flight-tabbar nav", symbols: ["airplane.circle.fill", "person.2.fill", "book.closed.fill"], labels: true },
        { id: "search", selector: ".search-orb", symbols: ["magnifyingglass"], labels: false },
        { id: "map", selector: ".map-tools", symbols: ["map.fill", "cloud.fill"], labels: false },
        { id: "follow", selector: ".map-follow-button", symbols: ["location.fill"], labels: false },
      ];
      const bars = definitions.flatMap(def => {
        const element = document.querySelector<HTMLElement>(def.selector);
        if (!element || keyboard || zoomed || !element.getClientRects().length) return [];
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return [];
        const buttons = element instanceof HTMLButtonElement ? [element] : [...element.querySelectorAll<HTMLButtonElement>("button")];
        return [{ id: def.id, rect: rect(bounds), buttons: buttons.map((button, index) => {
          const id = `${def.id}-${index}`;
          actions.set(id, button);
          const b = button.getBoundingClientRect();
          return {
            id, symbol: def.symbols[index], title: def.labels ? button.textContent?.trim() : "",
            label: button.getAttribute("aria-label") ?? button.textContent?.trim(),
            active: button.classList.contains("active"), enabled: !button.disabled,
            rect: { x: b.x - bounds.x, y: b.y - bounds.y, width: b.width, height: b.height },
          };
        }) }];
      });
      const payload = { bars, backEnabled, theme: document.querySelector<HTMLElement>(".flighty-page")?.dataset.theme ?? "dark" };
      const serialized = JSON.stringify(payload);
      if (serialized !== lastPayload) { lastPayload = serialized; handler.postMessage(payload); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(publish); };
    const action = (event: Event) => actions.get((event as CustomEvent<string>).detail)?.click();
    const observer = new ResizeObserver(schedule);
    for (const element of document.querySelectorAll(".flighty-device, .flight-tabbar, .map-tools, .map-follow-button")) observer.observe(element);
    const settings = new MutationObserver(schedule);
    settings.observe(document.documentElement, { attributes: true, attributeFilter: ["data-keyboard-open", "data-native-system-theme", "data-theme"] });
    window.addEventListener("flighty-native-chrome-action", action);
    window.addEventListener("flighty-native-ready", schedule);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); settings.disconnect();
      window.removeEventListener("flighty-native-chrome-action", action);
      window.removeEventListener("flighty-native-ready", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      handler.postMessage({ bars: [], backEnabled: false });
    };
  }, [screenKey, backEnabled]);
}
