"use client";

import { useEffect, useRef, useState } from "react";
import type { JourneySegment } from "./journeyData";
import { arrivalEvidence, freshLocation, type LocationFix } from "./realJourney";
import { watchJourneyLocation } from "./locationProvider";

export function useRealJourney(segment: JourneySegment | null, onArrive: (id: string, at: string) => void) {
  const [enabled, setEnabled] = useState(false);
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [message, setMessage] = useState("定位未开启");
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  const real = segment?.travelPlan?.mode === "real";
  useEffect(() => { setEnabled(false); setFix(null); setMessage("定位未开启"); }, [segment?.id, real]);
  useEffect(() => {
    if (!enabled || !real || !segment || segment.status === "complete") return;
    let watch: (() => void) | null = null, disposed = false, generation = 0;
    let evidence: { since: number; last: number } | null = null;
    let last: LocationFix | null = null;
    const stop = () => { generation += 1; watch?.(); watch = null; evidence = null; last = null; setFix(null); };
    const start = () => {
      stop();
      const currentGeneration = generation;
      if (document.hidden) { setMessage("已暂停定位 · 返回应用后继续"); return; }
      setMessage("正在获取位置…");
      watch = watchJourneyLocation(next => {
        if (disposed || currentGeneration !== generation || document.hidden) return;
        const now = Date.now();
        if (!freshLocation(next, now)) { evidence = null; last = null; setFix(null); setMessage("定位精度不足，暂不判断到达"); return; }
        last = next; setFix(next);
        const check = arrivalEvidence(segment, next, now, evidence); evidence = check;
        setMessage(check ? "已在终点附近，正在确认停留…" : `位置已更新 · 精度约 ${Math.round(next.accuracy)} 米`);
        if (check?.arrived) {
          arriveRef.current(segment.id, new Date(next.timestamp).toISOString());
          stop(); setEnabled(false); setMessage("已根据定位确认到达");
        }
      }, error => {
        if (disposed || currentGeneration !== generation) return;
        evidence = null; last = null; setFix(null);
        setMessage(error === 1 ? "定位权限被拒绝，可在系统设置中开启或手动确认到达" : "暂时无法定位，请稍后重试；不会自动标记到达");
        if (error === 1) { stop(); setEnabled(false); }
      });
    };
    start(); document.addEventListener("visibilitychange", start);
    const timer = window.setInterval(() => { if (last && !freshLocation(last, Date.now())) { evidence = null; last = null; setFix(null); setMessage("位置已过期，等待更新…"); } }, 5000);
    return () => { disposed = true; stop(); clearInterval(timer); document.removeEventListener("visibilitychange", start); };
  }, [enabled, real, segment?.id, segment?.status, segment?.travelPlan?.departureAt, segment?.travelPlan?.arrivalAt]);
  return { enabled, fix, message, toggle: () => { setEnabled(value => !value); setFix(null); if (enabled) setMessage("定位已暂停"); } };
}
