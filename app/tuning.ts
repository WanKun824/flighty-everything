"use client";

import { useCallback, useEffect, useState } from "react";
import type { VehicleKind } from "./Vehicle3D";

/**
 * 调试调参模块：把「模型大小、尺寸随缩放的曲线、模型速度、速度随缩放的折算」这几处
 * 硬编码的观感参数暴露成可实时调节的旋钮，并持久化到 localStorage。
 *
 * 尺寸、尺寸-缩放曲线、模型速度倍率是**每种载具各自的**（飞机、汽车、火车、轮船
 * 在屏幕上的占地和跑起来的感觉都不一样）；全程基准时长和速度-缩放折算则是**整条行程级**的，
 * 所有载具共用。
 *
 * 这些参数最终都要在调顺之后**回填成代码里的默认值**（TUNING_DEFAULTS），
 * 生产构建不渲染调试面板（见 debugEnabled），所以线上用户拿到的永远是默认值，
 * 而不是某个开发者浏览器里最后一次拖出来的数值。
 */

export type RiderCurve = {
  /** 这一缩放级以下不收缩（系数 1）。 */
  start: number;
  /** 这一缩放级以上收缩到 min。 */
  end: number;
  /** 大比例尺时载具收缩到的尺寸系数（1 为不收）。 */
  min: number;
};

export type SpeedCurve = {
  /** 基准缩放：这一级上倍速就是名义值。 */
  reference: number;
  /** 缩放折算的指数。1 是完全补偿（千倍级，会甩），默认 .3。 */
  exponent: number;
  /** 折算倍率下限。 */
  min: number;
  /** 折算倍率上限。 */
  max: number;
};

/** 一种载具的地图呈现调参。 */
export type VehicleTuning = {
  /** 地图载具基准宽度（CSS px）。 */
  baseW: number;
  /** 尺寸随缩放收窄的曲线。 */
  curve: RiderCurve;
  /** 模型速度倍率：1 为名义值，>1 更快、<1 更慢。只作用于该载具在行程里跑的那些段。 */
  speed: number;
};

export type TuningParams = {
  /** 每种载具各自的尺寸与尺寸-缩放曲线。 */
  vehicles: Record<VehicleKind, VehicleTuning>;
  /** 1× 跑完全程的墙上秒数（行程级的基准速度，所有载具共用）。 */
  playbackSeconds: number;
  /** 速度随缩放折算的曲线（行程级，所有载具共用）。 */
  speedCurve: SpeedCurve;
};

/** 单载具的局部更新：curve 再按子字段合并。 */
export type VehicleTuningPatch = { baseW?: number; curve?: Partial<RiderCurve>; speed?: number };

/** 局部更新：载具按种合并，曲线按子字段合并，其余整体覆盖。 */
export type TuningPatch = {
  vehicles?: Partial<Record<VehicleKind, VehicleTuningPatch>>;
  playbackSeconds?: number;
  speedCurve?: Partial<SpeedCurve>;
};

export const VEHICLE_KINDS: VehicleKind[] = ["flight", "car", "train", "ferry"];

export const TUNING_DEFAULTS: TuningParams = {
  vehicles: {
    flight: { baseW: 120, curve: { start: 5.5, end: 8, min: 1 }, speed: 1 },
    car: { baseW: 96, curve: { start: 5.5, end: 8, min: 1 }, speed: 2.5 },
    train: { baseW: 136, curve: { start: 6.5, end: 8, min: 1 }, speed: 1.85 },
    ferry: { baseW: 138, curve: { start: 5, end: 8, min: 1 }, speed: 1.8 },
  },
  playbackSeconds: 329,
  speedCurve: { reference: 4.7, exponent: 0.3, min: 0.25, max: 2.5 },
};

const STORAGE_KEY = "manyou:tuning";

/** 「设为默认」存的自定义默认快照：重置时优先回它，其次才回代码默认。 */
const DEFAULT_KEY = "manyou:tuning:default";

/**
 * 发布（生产构建）时隐藏调试面板。`process.env.NODE_ENV` 会被 Vite 在构建期静态替换，
 * 所以生产包里这条表达式就是常量 false，调试面板连同它的 JSX 一起被 tree-shake 掉。
 * 带 `?debug=1` 可在预览/生产地址里临时打开，方便发布前自查。
 */
export const debugEnabled =
  process.env.NODE_ENV !== "production" ||
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"));

const numberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** 缩放 → 载具屏幕尺寸系数（未量化，0..1）。曲线预览和 riderScaleFor 共用同一份数学。 */
export function riderScaleRaw(zoom: number, curve: RiderCurve): number {
  const span = Math.max(1e-3, curve.end - curve.start);
  const p = Math.min(1, Math.max(0, (zoom - curve.start) / span));
  return 1 - p * (1 - curve.min);
}

/** 缩放 → 载具屏幕尺寸系数，量化到 0.05 一档（与 Vehicle3D 的 ResizeObserver 配合）。 */
export function riderScaleFor(zoom: number, curve: RiderCurve): number {
  return Math.round(riderScaleRaw(zoom, curve) * 20) / 20;
}

/** 缩放 → 速率折算倍率（世界速度随缩放反着走，屏幕位移大致稳定）。 */
export function zoomRateFor(zoom: number, curve: SpeedCurve): number {
  return Math.min(curve.max, Math.max(curve.min, 2 ** (-(zoom - curve.reference) * curve.exponent)));
}

/** 把 localStorage 里可能只写了几个字段的旧值，逐载具合并回完整结构。 */
function mergeVehicles(
  current: Record<VehicleKind, VehicleTuning>,
  patch: Partial<Record<VehicleKind, VehicleTuningPatch>>,
): Record<VehicleKind, VehicleTuning> {
  const next = { ...current };
  for (const kind of VEHICLE_KINDS) {
    const p = patch[kind];
    if (!p) continue;
    next[kind] = {
      baseW: p.baseW ?? current[kind].baseW,
      curve: { ...current[kind].curve, ...(p.curve ?? {}) },
      speed: p.speed ?? current[kind].speed,
    };
  }
  return next;
}

/** 把可能只写了几个字段的对象，逐载具、逐子字段合并回完整结构。 */
function normalizeTuning(parsed: unknown): TuningParams {
  const source = (parsed ?? {}) as Partial<TuningParams> & { vehicles?: Partial<Record<VehicleKind, VehicleTuningPatch>> };
  const vehicles = { ...TUNING_DEFAULTS.vehicles };
  for (const kind of VEHICLE_KINDS) {
    const p = source.vehicles?.[kind];
    if (!p) continue;
    vehicles[kind] = {
      baseW: numberOr(p.baseW, TUNING_DEFAULTS.vehicles[kind].baseW),
      curve: { ...TUNING_DEFAULTS.vehicles[kind].curve, ...(p.curve ?? {}) },
      speed: numberOr(p.speed, TUNING_DEFAULTS.vehicles[kind].speed),
    };
  }
  return {
    vehicles,
    playbackSeconds: numberOr(source.playbackSeconds, TUNING_DEFAULTS.playbackSeconds),
    speedCurve: { ...TUNING_DEFAULTS.speedCurve, ...(source.speedCurve ?? {}) },
  };
}

function loadTuning(): TuningParams {
  if (typeof window === "undefined") return TUNING_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return TUNING_DEFAULTS;
    return normalizeTuning(JSON.parse(raw));
  } catch {
    return TUNING_DEFAULTS;
  }
}

export function useTuning() {
  const [tuning, setTuningState] = useState<TuningParams>(loadTuning);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
    } catch {
      // 忽略写入失败：调参仍是本次会话内的实时行为。
    }
  }, [tuning]);

  /** 部分更新；载具按种合并，曲线按子字段合并。 */
  const setTuning = useCallback((patch: TuningPatch) => {
    setTuningState((current) => ({
      ...current,
      vehicles: patch.vehicles ? mergeVehicles(current.vehicles, patch.vehicles) : current.vehicles,
      playbackSeconds: patch.playbackSeconds ?? current.playbackSeconds,
      speedCurve: patch.speedCurve ? { ...current.speedCurve, ...patch.speedCurve } : current.speedCurve,
    }));
  }, []);

  const resetTuning = useCallback(() => {
    // 重置：先回「设为默认」存的自定义默认，没有才回代码默认。
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(DEFAULT_KEY);
        if (raw) {
          setTuningState(normalizeTuning(JSON.parse(raw)));
          return;
        }
      } catch {
        // 读坏了就落到代码默认。
      }
    }
    setTuningState(TUNING_DEFAULTS);
  }, []);

  /** 把当前调参快照存成「自定义默认」，之后「重置为默认」优先回它。 */
  const saveAsDefault = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DEFAULT_KEY, JSON.stringify(tuning));
    } catch {
      // 忽略写入失败。
    }
  }, [tuning]);

  return { tuning, setTuning, resetTuning, saveAsDefault };
}
