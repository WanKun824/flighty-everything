"use client";

import { useEffect, useState } from "react";
import { mapControlLayout } from "./sheetLayout";

/** Use the real map surface, not a guessed phone/window height. */
export function useMapControlLayout(fraction: number) {
  const [geometry, setGeometry] = useState({ height: 874, safeTop: 0 });
  useEffect(() => {
    const device = document.querySelector<HTMLElement>(".flighty-device");
    if (!device) return;
    const update = () => {
      const height = device.clientHeight;
      const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--native-safe-top")) || 0;
      setGeometry(current => current.height === height && current.safeTop === safeTop ? current : { height, safeTop });
    };
    const observer = new ResizeObserver(update);
    observer.observe(device);
    window.addEventListener("flighty-native-appearance-change", update);
    return () => { observer.disconnect(); window.removeEventListener("flighty-native-appearance-change", update); };
  }, []);
  return mapControlLayout(geometry.height, fraction, geometry.safeTop);
}
