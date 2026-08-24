"use client";

import { useState, type CSSProperties, type ElementType } from "react";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFCarFill from "sf-symbols-lib/monochrome/SFCarFill";
import SFFerryFill from "sf-symbols-lib/monochrome/SFFerryFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFTrainSideFrontCar from "sf-symbols-lib/monochrome/SFTrainSideFrontCar";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import {
  JOURNEY_PLACES,
  MODE_META,
  createJourneySegment,
  type JourneyMode,
  type JourneySegment,
} from "./journeyData";

const ICONS: Record<JourneyMode, ElementType> = {
  flight: SFAirplane,
  train: SFTrainSideFrontCar,
  car: SFCarFill,
  ferry: SFFerryFill,
};

export default function JourneyComposer({
  variant,
  onClose,
  onAdd,
  onFlightTools,
}: {
  variant: "desktop" | "mobile";
  onClose: () => void;
  onAdd: (segment: JourneySegment) => void;
  onFlightTools?: () => void;
}) {
  const [mode, setMode] = useState<JourneyMode>("flight");
  const [from, setFrom] = useState("HKG");
  const [to, setTo] = useState("HND");
  const [date, setDate] = useState("2026-09-18");
  const [departure, setDeparture] = useState("09:00");
  const [note, setNote] = useState("");

  const submit = () => {
    if (from === to) return;
    onAdd(createJourneySegment({ mode, from, to, date, departure, note }));
    onClose();
  };

  return (
    <section
      className={`journey-composer ${variant}`}
      role="dialog"
      aria-label="添加行程"
    >
      <header>
        <div>
          <small>新的交通段</small>
          <h2>添加行程</h2>
          <p>把飞机、铁路、公路或水路接到同一条旅程。</p>
        </div>
        <button aria-label="关闭" onClick={onClose}>
          <SFXmark size="sm" />
        </button>
      </header>
      <div
        className="journey-mode-picker"
        role="tablist"
        aria-label="选择交通方式"
      >
        {(Object.keys(MODE_META) as JourneyMode[]).map((item) => (
          <button
            role="tab"
            aria-selected={mode === item}
            className={mode === item ? "active" : ""}
            key={item}
            onClick={() => setMode(item)}
            style={{ "--mode-color": MODE_META[item].color } as CSSProperties}
          >
            <JourneyModeIcon mode={item} />
            <span>{MODE_META[item].label}</span>
          </button>
        ))}
      </div>
      <div className="journey-form-grid">
        <label>
          <span>出发地</span>
          <select
            aria-label="出发地"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          >
            {JOURNEY_PLACES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {item.city}
              </option>
            ))}
          </select>
        </label>
        <i>→</i>
        <label>
          <span>目的地</span>
          <select
            aria-label="目的地"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          >
            {JOURNEY_PLACES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {item.city}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>日期</span>
          <input
            aria-label="日期"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <span>出发时间</span>
          <input
            aria-label="出发时间"
            type="time"
            value={departure}
            onChange={(event) => setDeparture(event.target.value)}
          />
        </label>
        <label className="journey-note">
          <span>备注</span>
          <input
            aria-label="行程备注"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="车厢、座位、登机口或取车信息"
          />
        </label>
      </div>
      {from === to && (
        <p className="journey-form-error">出发地和目的地不能相同。</p>
      )}
      {mode === "flight" && onFlightTools && (
        <button className="flight-tools-link" onClick={onFlightTools}>
          使用航班号、航线或日历导入
        </button>
      )}
      <button
        className="journey-submit"
        disabled={from === to}
        onClick={submit}
      >
        <SFPlus size="xs" />
        添加这段行程
      </button>
    </section>
  );
}

export function JourneyModeIcon({ mode }: { mode: JourneyMode }) {
  const Icon = ICONS[mode];
  return <Icon size="sm" />;
}
