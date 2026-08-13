"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * 行程几何层：把站点列表变成「以真实基准」的线形、里程和时间轴。
 *
 * 各交通方式的基准：
 * - 飞机：大圆航线（球面 slerp）。民航的计划航路就是以大圆为基准再按航路点修正，
 *   所以大圆是这里能本地算出的最接近真实的形状，不需要联网。
 * - 轮船：同样走大圆。近海直航航线基本贴大圆，港到港的短程更是如此。
 * - 汽车：Mapbox Directions 的 driving 折线，是真实路网几何。
 * - 火车：Mapbox 没有铁路 profile（见 RAIL_NOTE）。这里用 driving 拿到真实陆路走廊
 *   来近似轨道走向 —— 形状仍来自真实基础设施，但不是真实轨道中心线。
 *
 * 任何一段取不到路网（跨海、超距、离线、限流、令牌无 directions 权限）都退回大圆，
 * 线不会断，里程也仍然是球面真值。
 */

export type LatLon = [number, number];
export type Mode = "flight" | "car" | "train" | "ferry";

export const RAIL_NOTE = "铁路段按真实陆路走廊近似：Mapbox Directions 没有 rail profile";

const EARTH_KM = 6371.0088;
const RAD = Math.PI / 180;

/** 球面距离。行程里程、动画配速、路网合理性校验都用它。 */
export function haversineKm(a: LatLon, b: LatLon) {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return EARTH_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 起点到终点的初始方位角（0=正北，顺时针）。用来把 3D 载具转到航向上。 */
export function bearingDeg(a: LatLon, b: LatLon) {
  const lat1 = a[1] * RAD;
  const lat2 = b[1] * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/**
 * 大圆插值。用三维球面 slerp，而不是对经纬度做线性插值 —— 后者在地图上是条直线，
 * 跨纬度时和真实航线偏差可达几百公里。
 */
export function geodesic(a: LatLon, b: LatLon, steps = 96): LatLon[] {
  const lat1 = a[1] * RAD;
  const lon1 = a[0] * RAD;
  const lat2 = b[1] * RAD;
  const lon2 = b[0] * RAD;
  const delta = 2 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
  )));
  // 两点重合或极近时 slerp 的分母趋零，直接给两端，避免除零抖动。
  if (delta < 1e-9) return [a, b];
  const path: LatLon[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const f = index / steps;
    const A = Math.sin((1 - f) * delta) / Math.sin(delta);
    const B = Math.sin(f * delta) / Math.sin(delta);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    path.push([Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD]);
  }
  return path;
}

/**
 * 把经度展成连续序列。跨 ±180 的线在 Mapbox 上会横穿整张地图，
 * 逐点补 ±360 之后才画在正确的一侧。
 */
export function unwrap(path: LatLon[]): LatLon[] {
  if (path.length < 2) return path;
  const out: LatLon[] = [path[0]];
  for (let index = 1; index < path.length; index += 1) {
    const previous = out[index - 1][0];
    let lon = path[index][0];
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    out.push([lon, path[index][1]]);
  }
  return out;
}

export type LegPath = {
  mode: Mode;
  coordinates: LatLon[];
  /** 各顶点的累计里程，长度与 coordinates 一致，[0] 恒为 0。 */
  cumulativeKm: number[];
  km: number;
  /** road 表示来自 Directions 真实路网，geodesic 表示大圆。 */
  source: "geodesic" | "road";
  /** 按巡航速度折算的小时数，动画时间轴按它分配。 */
  hours: number;
};

/** 巡航速度，只用于给动画分配时长，不参与里程计算。 */
export const cruiseKmh: Record<Mode, number> = { flight: 820, car: 78, train: 235, ferry: 34 };

/** 沿折线做弧长参数化。真实路网顶点疏密不均，不按弧长走载具会一顿一顿。 */
export function measure(mode: Mode, coordinates: LatLon[], source: LegPath["source"]): LegPath {
  const points = coordinates.length > 1 ? coordinates : [coordinates[0] ?? [0, 0], coordinates[0] ?? [0, 0]];
  const cumulativeKm = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulativeKm.push(cumulativeKm[index - 1] + haversineKm(points[index - 1], points[index]));
  }
  const km = cumulativeKm[cumulativeKm.length - 1];
  return { mode, coordinates: points, cumulativeKm, km, source, hours: km / cruiseKmh[mode] };
}

/** 取折线上进度 t（0..1，按弧长）处的位置和航向。 */
export function pointAt(path: LegPath, t: number): { coordinate: LatLon; bearing: number } {
  const { coordinates, cumulativeKm, km } = path;
  if (km <= 0) return { coordinate: coordinates[0], bearing: bearingDeg(coordinates[0], coordinates[coordinates.length - 1]) };
  const target = Math.min(1, Math.max(0, t)) * km;
  // 二分找到目标弧长所在的那一小段，顶点上千时比线性扫描稳定得多。
  let low = 0;
  let high = cumulativeKm.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (cumulativeKm[mid] <= target) low = mid;
    else high = mid;
  }
  const spanKm = cumulativeKm[high] - cumulativeKm[low];
  const f = spanKm > 0 ? (target - cumulativeKm[low]) / spanKm : 0;
  const from = coordinates[low];
  const to = coordinates[high];
  return {
    coordinate: [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f],
    bearing: bearingDeg(from, to),
  };
}

/**
 * Directions 结果缓存。键里带模式和四舍五入到 5 位小数的端点，
 * 于是重排行程、删站再加回来都不会重复请求。
 */
const roadCache = new Map<string, Promise<LatLon[] | null>>();
const key = (mode: Mode, a: LatLon, b: LatLon) =>
  `${mode}:${a[0].toFixed(5)},${a[1].toFixed(5)}>${b[0].toFixed(5)},${b[1].toFixed(5)}`;

async function requestRoad(a: LatLon, b: LatLon, token: string, signal: AbortSignal): Promise<LatLon[] | null> {
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${a[0]},${a[1]};${b[0]},${b[1]}`);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  const data = await response.json() as { routes?: Array<{ distance?: number; geometry?: { coordinates?: LatLon[] } }> };
  const coordinates = data.routes?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;
  // 合理性闸门：跨海或路网不通时 Directions 会绕出离谱的大弯，
  // 超过大圆 3.2 倍就当它不可用，退回大圆而不是画一条明显错误的线。
  const straight = haversineKm(a, b);
  const routed = (data.routes?.[0]?.distance ?? 0) / 1000;
  if (straight > 0 && routed > straight * 3.2) return null;
  return coordinates;
}

/** 取一段的真实路网折线；失败、超时、无权限都返回 null 由调用方退回大圆。 */
export function roadPath(mode: Mode, a: LatLon, b: LatLon, token: string): Promise<LatLon[] | null> {
  const cacheKey = key(mode, a, b);
  const hit = roadCache.get(cacheKey);
  if (hit) return hit;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  const pending = requestRoad(a, b, token, controller.signal)
    .catch(() => null)
    .finally(() => clearTimeout(timer));
  roadCache.set(cacheKey, pending);
  return pending;
}

/** 每段在 0..1 全程进度上的起止位置，按巡航时长加权。 */
export type Timeline = { legs: Array<{ from: number; to: number }>; hours: number };

/**
 * 时长权重用 hours^0.6 而不是 hours 本身。等比分配的话 2,900 公里的航段
 * 会占掉九成时间，5 公里的轮渡一帧就过去了；0.6 次幂压缩量级但保住顺序，
 * 「飞机每公里更快」的直觉还在。这是观感上的压缩，不是物理声明。
 */
const COMPRESSION = .6;

export function buildTimeline(paths: LegPath[]): Timeline {
  const weights = paths.map((path) => Math.max(1e-4, path.hours) ** COMPRESSION);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;
  const legs = weights.map((weight) => {
    const from = cursor;
    cursor += weight / total;
    return { from, to: cursor };
  });
  if (legs.length) legs[legs.length - 1].to = 1;
  return { legs, hours: paths.reduce((sum, path) => sum + path.hours, 0) };
}

/**
 * 站点 → 每段线形。大圆先算出来保证首帧就有线，
 * 汽车和火车的真实路网异步到达后再替换，取不到就一直留着大圆。
 */
export function useJourneyPaths(stops: Array<{ coordinate: LatLon; type: Mode }>, token: string) {
  const legs = useMemo(
    () => stops.slice(0, -1).map((stop, index) => ({ mode: stop.type, a: stop.coordinate, b: stops[index + 1].coordinate })),
    [stops],
  );
  // null 表示「问过路网但拿不到」，与「还没问」区分开，
  // 于是待办数量可以纯派生，不必再存一份 state（也就绕开了 effect 里同步 setState）。
  const [roads, setRoads] = useState<Record<string, LatLon[] | null>>({});

  useEffect(() => {
    let alive = true;
    for (const leg of legs) {
      if (leg.mode !== "car" && leg.mode !== "train") continue;
      // roadPath 缓存的是 promise，所以重排或删站再加回来都命中缓存、不再发请求。
      void roadPath(leg.mode, leg.a, leg.b, token).then((coordinates) => {
        if (!alive) return;
        const cacheKey = key(leg.mode, leg.a, leg.b);
        setRoads((current) => cacheKey in current ? current : { ...current, [cacheKey]: coordinates });
      });
    }
    return () => { alive = false; };
  }, [legs, token]);

  const paths = useMemo(() => legs.map((leg) => {
    const road = roads[key(leg.mode, leg.a, leg.b)];
    return road
      ? measure(leg.mode, unwrap(road), "road")
      : measure(leg.mode, unwrap(geodesic(leg.a, leg.b)), "geodesic");
  }), [legs, roads]);

  const pendingRoads = useMemo(
    () => legs.filter((leg) => (leg.mode === "car" || leg.mode === "train") && !(key(leg.mode, leg.a, leg.b) in roads)).length,
    [legs, roads],
  );

  const timeline = useMemo(() => buildTimeline(paths), [paths]);
  return { paths, timeline, pendingRoads };
}

/** 1 倍速跑完全程的墙上时间。 */
export const PLAYBACK_SECONDS = 46;

/**
 * 播放时钟。用 requestAnimationFrame 加真实帧间隔推进，替掉原来的
 * setInterval(34ms) —— 后者跟显示器刷新不同步，会持续掉帧抖动，
 * 而且每 34ms 就重渲染整个探索屏。
 *
 * progressRef 每帧都更新，给地图上的载具做 60fps 命令式驱动；
 * progress 是给面板文字和进度条用的低频快照，两者刻意分开。
 */
export function useJourneyClock(playing: boolean, speed: number) {
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  const seek = useCallback((t: number) => {
    const clamped = Math.min(1, Math.max(0, t));
    progressRef.current = clamped;
    setProgress(clamped);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      if (last) {
        // 切走标签页再回来时 now 会跳很大一截，截断避免播放头瞬移。
        const delta = Math.min(.25, (now - last) / 1000);
        progressRef.current = (progressRef.current + delta / (PLAYBACK_SECONDS / speed)) % 1;
      }
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  // 文字和进度条不需要 60fps，约 16 次/秒足够读，且省掉大量重渲染。
  useEffect(() => {
    const timer = setInterval(() => setProgress(progressRef.current), 62);
    return () => clearInterval(timer);
  }, []);

  return { progressRef, progress, seek };
}

/** 全程进度 0..1 → 落在第几段、段内弧长进度多少。 */
export function locate(timeline: Timeline, t: number) {
  const clamped = Math.min(.999999, Math.max(0, t));
  const index = timeline.legs.findIndex((leg) => clamped < leg.to);
  const legIndex = index < 0 ? Math.max(0, timeline.legs.length - 1) : index;
  const leg = timeline.legs[legIndex];
  if (!leg) return { legIndex: 0, legProgress: 0 };
  const span = leg.to - leg.from;
  return { legIndex, legProgress: span > 0 ? (clamped - leg.from) / span : 0 };
}
