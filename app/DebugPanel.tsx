"use client";

import { useEffect, useId, useState } from "react";
import type { VehicleKind } from "./Vehicle3D";
import { riderScaleRaw, VEHICLE_KINDS, type RiderCurve, type TuningParams, type TuningPatch } from "./tuning";

/**
 * 调试面板：只在地图那一屏上、且 debugEnabled 时才渲染。发布（生产构建）时整个模块
 * 被 `debugEnabled` 挡住，不会进线上 UI。
 *
 * 尺寸与尺寸-缩放曲线是**每种载具各自**的，所以面板顶部放一排载具标签切换；
 * 速度与速度-缩放折算是行程级的，放在下面共用。
 */

const VEHICLE_LABELS: Record<VehicleKind, string> = {
  flight: "飞机",
  car: "汽车",
  train: "火车",
  ferry: "轮船",
};

type DebugPanelProps = {
  tuning: TuningParams;
  onChange: (patch: TuningPatch) => void;
  onReset: () => void;
  onSaveDefault: () => void;
  onClose: () => void;
};

function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  display?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="debug-row">
      <span className="debug-row-head">
        <label htmlFor={id}>{props.label}</label>
        <output htmlFor={id}>{props.display ?? `${props.value}${props.unit ?? ""}`}</output>
      </span>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </div>
  );
}

/** 「缩放 → 尺寸系数」的实时曲线预览：横轴是地图缩放级，纵轴是载具尺寸系数。 */
function CurveChart({ curve }: { curve: RiderCurve }) {
  const W = 260;
  const H = 110;
  const L = 22;
  const R = 8;
  const T = 10;
  const B = 18;
  const zMin = 0;
  const zMax = 18;
  const sMin = 0;
  const sMax = 1;
  const px = (z: number) => L + ((z - zMin) / (zMax - zMin)) * (W - L - R);
  const py = (s: number) => T + (1 - (s - sMin) / (sMax - sMin)) * (H - T - B);

  const samples: string[] = [];
  for (let z = zMin; z <= zMax + 1e-6; z += 0.25) {
    samples.push(`${px(z).toFixed(1)},${py(riderScaleRaw(z, curve)).toFixed(1)}`);
  }

  const startX = px(curve.start);
  const startY = py(1);
  const endX = px(curve.end);
  const endY = py(curve.min);

  return (
    <svg className="debug-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="尺寸随缩放收窄曲线预览，横轴是地图缩放级，纵轴是载具尺寸系数">
      {[0, 0.25, 0.5, 0.75, 1].map((s) => (
        <line key={s} x1={L} y1={py(s)} x2={W - R} y2={py(s)} stroke="rgba(60,60,67,.10)" strokeWidth="1" />
      ))}
      <line x1={L} y1={py(1)} x2={W - R} y2={py(1)} stroke="rgba(60,60,67,.30)" strokeWidth="1" strokeDasharray="3 3" />
      <polyline points={samples.join(" ")} fill="none" stroke="#087ff5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={startX} cy={startY} r="3.2" fill="#087ff5" />
      <circle cx={endX} cy={endY} r="3.2" fill="#087ff5" />
      <text x={L} y={py(1) - 5} fontSize="9" fill="rgba(60,60,67,.62)">100%</text>
      <text x={W - R} y={endY - 6} textAnchor="end" fontSize="9" fill="rgba(60,60,67,.62)">{`${Math.round(curve.min * 100)}%`}</text>
      {[0, 5, 10, 15].map((z) => (
        <text key={z} x={px(z)} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(60,60,67,.48)">{z}</text>
      ))}
      <text x={W - R} y={H - 4} textAnchor="end" fontSize="8" fill="rgba(60,60,67,.40)">缩放 →</text>
    </svg>
  );
}

export default function DebugPanel({ tuning, onChange, onReset, onSaveDefault, onClose }: DebugPanelProps) {
  const [kind, setKind] = useState<VehicleKind>("flight");
  const [saved, setSaved] = useState(false);
  const vehicle = tuning.vehicles[kind];
  const { speedCurve } = tuning;

  const setVehicle = (patch: { baseW?: number; curve?: Partial<{ start: number; end: number; min: number }>; speed?: number }) =>
    onChange({ vehicles: { [kind]: patch } });

  // 「已设为默认」提示短暂亮一下。
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleSaveDefault = () => {
    onSaveDefault();
    // 顺手把 JSON 复制到剪贴板，方便回填进 tuning.ts 的 TUNING_DEFAULTS。
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(JSON.stringify(tuning, null, 2)).catch(() => {});
    }
    setSaved(true);
  };

  return (
    <section className="debug-sheet frosted-panel" aria-label="调试模块">
      <header>
        <div><span className="eyebrow">DEBUG · TUNING</span><h2>模型与速度调试</h2><p>按载具分别调尺寸；调顺后回填进 tuning.ts 的默认值，线上不显示本面板。</p></div>
        <button type="button" className="icon-button" aria-label="关闭调试" onClick={onClose}>×</button>
      </header>

      <div className="debug-tabs" role="tablist" aria-label="选择载具">
        {VEHICLE_KINDS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={kind === item} className={kind === item ? "active" : ""} onClick={() => setKind(item)}>{VEHICLE_LABELS[item]}</button>
        ))}
      </div>

      <div className="debug-section">
        <h3>{VEHICLE_LABELS[kind]} · 模型大小</h3>
        <SliderRow label="基准宽度" value={vehicle.baseW} min={40} max={220} step={2} unit="px" onChange={(value) => setVehicle({ baseW: value })} />
      </div>

      <div className="debug-section">
        <h3>{VEHICLE_LABELS[kind]} · 尺寸随缩放收窄</h3>
        <CurveChart curve={vehicle.curve} />
        <SliderRow label="收窄下限（大比例尺系数）" value={vehicle.curve.min} min={0.4} max={1} step={0.01} display={vehicle.curve.min.toFixed(2)} onChange={(value) => setVehicle({ curve: { min: value } })} />
        <SliderRow label="开始收缩的缩放级" value={vehicle.curve.start} min={2} max={10} step={0.5} display={vehicle.curve.start.toFixed(1)} onChange={(value) => setVehicle({ curve: { start: value } })} />
        <SliderRow label="收缩到下限的缩放级" value={vehicle.curve.end} min={8} max={18} step={0.5} display={vehicle.curve.end.toFixed(1)} onChange={(value) => setVehicle({ curve: { end: value } })} />
      </div>

      <div className="debug-section">
        <h3>{VEHICLE_LABELS[kind]} · 模型速度</h3>
        <SliderRow label="速度倍率" value={vehicle.speed} min={0.2} max={5} step={0.05} display={`${vehicle.speed.toFixed(2)}×`} onChange={(value) => setVehicle({ speed: value })} />
      </div>

      <div className="debug-section">
        <h3>行程 · 全程基准时长（所有载具共用）</h3>
        <SliderRow label="1× 全程基准时长" value={tuning.playbackSeconds} min={60} max={600} step={1} unit="秒" onChange={(value) => onChange({ playbackSeconds: value })} />
      </div>

      <div className="debug-section">
        <h3>行程 · 速度随缩放折算（所有载具共用）</h3>
        <SliderRow label="折算指数" value={speedCurve.exponent} min={0} max={1} step={0.01} display={speedCurve.exponent.toFixed(2)} onChange={(value) => onChange({ speedCurve: { exponent: value } })} />
        <SliderRow label="折算下限" value={speedCurve.min} min={0.05} max={1} step={0.05} display={speedCurve.min.toFixed(2)} onChange={(value) => onChange({ speedCurve: { min: value } })} />
        <SliderRow label="折算上限" value={speedCurve.max} min={1} max={5} step={0.1} display={speedCurve.max.toFixed(1)} onChange={(value) => onChange({ speedCurve: { max: value } })} />
      </div>

      <footer className="debug-actions">
        <button type="button" onClick={handleSaveDefault}>设为默认</button>
        <button type="button" onClick={onReset}>重置为默认</button>
        {saved && <span className="debug-notice" role="status">已设为默认 · JSON 已复制到剪贴板</span>}
      </footer>
    </section>
  );
}
