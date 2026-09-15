import type { LocationFix } from "./realJourney";

/** The native app uses Core Location, never a remote website's geolocation context. */
export function watchJourneyLocation(onFix: (fix: LocationFix) => void, onError: (code: number) => void): () => void {
  const handler = (window as Window & { webkit?: { messageHandlers?: { flightyLocation?: { postMessage: (value: unknown) => void } } } }).webkit?.messageHandlers?.flightyLocation;
  if (handler) {
    const id = crypto.randomUUID();
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; fix?: LocationFix; error?: number }>).detail;
      if (detail?.id !== id) return;
      if (detail.fix) onFix(detail.fix);
      else if (detail.error) onError(detail.error);
    };
    window.addEventListener("flighty-location", listener);
    handler.postMessage({ action: "start", id });
    return () => { window.removeEventListener("flighty-location", listener); handler.postMessage({ action: "stop", id }); };
  }
  if (!navigator.geolocation || !window.isSecureContext) { queueMicrotask(() => onError(2)); return () => {}; }
  const id = navigator.geolocation.watchPosition(position => onFix({ longitude: position.coords.longitude, latitude: position.coords.latitude, accuracy: position.coords.accuracy, speed: position.coords.speed, timestamp: position.timestamp }), error => onError(error.code), { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
  return () => navigator.geolocation.clearWatch(id);
}
