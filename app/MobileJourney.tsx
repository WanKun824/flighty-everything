"use client";

import type { CSSProperties } from "react";
import SFBookClosedFill from "sf-symbols-lib/monochrome/SFBookClosedFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFTrash from "sf-symbols-lib/monochrome/SFTrash";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import { JourneyModeIcon } from "./JourneyComposer";
import {
  MODE_META,
  formatJourneyDuration,
  journeyStats,
  type JourneyMode,
  type JourneySegment,
} from "./journeyData";
import { JourneyWeatherIcon, useJourneyWeather } from "./journeyWeather";
import type { JourneyTrip } from "./journeyStorage";
import { useSheetDetents } from "./useSheetDetents";

export function MobileJourneysPanel({
  tripName,
  segments,
  selectedSegmentId,
  onSelect,
  onOpenDetails,
  onToggleOverview,
  overviewExpanded,
  onAdd,
  onEditNames,
  onSaveToPassport,
  savedToPassport,
}: {
  tripName: string;
  segments: JourneySegment[];
  selectedSegmentId: string | null;
  onSelect: (segment: JourneySegment) => void;
  onOpenDetails: (segment: JourneySegment) => void;
  onToggleOverview: () => void;
  overviewExpanded: boolean;
  onAdd: () => void;
  onEditNames: () => void;
  onSaveToPassport: () => void;
  savedToPassport: boolean;
}) {
  const stats = journeyStats(segments);
  const active =
    segments.find((segment) => segment.status === "active") ?? segments[0];
  return (
    <div className="panel-scroll mobile-journey-scroll">
      <div className="mobile-plan-card-wrap">
        <button
          className="mobile-plan-card"
          onClick={onToggleOverview}
          aria-expanded={overviewExpanded}
          aria-label={overviewExpanded ? "收起当前行程" : "展开当前行程"}
        >
          <span>
            <small>正在规划</small>
            <b>8 日 · {stats.modes} 种交通</b>
          </span>
          <strong>{tripName}</strong>
          <p>香港 · 东京 · 京都 · 直岛</p>
          <div>
            <i
              style={{ width: `${Math.max(0.08, active?.progress ?? 0) * 100}%` }}
            />
          </div>
          <footer>
            <span>{stats.segments} 段行程</span>
            <span>{stats.distanceKm.toLocaleString("zh-CN")} km</span>
            <span className={`mobile-plan-expand ${overviewExpanded ? "expanded" : ""}`}><SFChevronRight size="xs" /></span>
          </footer>
        </button>
        <button className="mobile-plan-edit" aria-label="编辑行程名称" onClick={onEditNames}><SFPencil size="xs" /></button>
        <button className={`mobile-plan-save ${savedToPassport ? "saved" : ""}`} onClick={onSaveToPassport}>
          {savedToPassport ? <SFCheckmarkCircleFill size="xs" /> : <SFBookClosedFill size="xs" />}
          {savedToPassport ? "已保存到旅迹" : "保存到旅迹"}
        </button>
      </div>
      <div className="mobile-section-heading">
        <span>接下来的行程</span>
        <button onClick={onAdd}>
          <SFPlus size="xs" />
          添加
        </button>
      </div>
      <div className="mobile-segment-list">
        {segments.map((segment, index) => {
          const selected = segment.id === selectedSegmentId;
          return (
          <article
            key={segment.id}
            className={`mobile-segment-card ${segment.status} ${selected ? "selected" : ""}`}
            style={{ "--mode-color": MODE_META[segment.mode].color } as CSSProperties}
          >
            <button
              className="mobile-segment-select"
              onClick={() => onSelect(segment)}
              aria-pressed={selected}
              aria-label={`在地图上定位 ${segment.title}`}
            >
              <span
                className="mobile-mode-node"
                style={{
                  color: MODE_META[segment.mode].color,
                  background: MODE_META[segment.mode].surface,
                }}
              >
                <JourneyModeIcon mode={segment.mode} />
              </span>
              <span className="mobile-segment-main">
                <span>
                  <strong>{segment.title}</strong>
                  <em>{segment.service}</em>
                </span>
                <small>{segment.origin.name}</small>
                <span className="mobile-segment-times">
                  <b>{segment.departure}</b>
                  <i />
                  <b>{segment.arrival}</b>
                </span>
                <small>
                  {segment.destination.name} ·{" "}
                  {formatJourneyDuration(segment.durationMinutes)}
                </small>
              </span>
              <span className="mobile-segment-side">
                <em>{segment.date.split(" · ")[0]}</em>
                <MobileSegmentWeather
                  segment={segment}
                  active={segment.id === active?.id}
                />
              </span>
            </button>
            <button
              className="mobile-segment-detail-button"
              aria-label={`打开 ${segment.title} 详情`}
              onClick={() => onOpenDetails(segment)}
            >
              <SFChevronRight size="xs" />
            </button>
            {index < segments.length - 1 && (
              <i className="mobile-timeline-line" />
            )}
          </article>
        )})}
      </div>
    </div>
  );
}

function MobileSegmentWeather({
  segment,
  active,
}: {
  segment: JourneySegment;
  active: boolean;
}) {
  const weather = useJourneyWeather(active ? segment : undefined);
  const destination = weather.find((item) => item.id === "destination");
  if (!destination) return null;
  return (
    <span className="mobile-segment-weather">
      <JourneyWeatherIcon observation={destination} />
    </span>
  );
}

export function MobileJourneyPassport({
  trips,
  activeTripId,
  onSelect,
  onEdit,
}: {
  trips: JourneyTrip[];
  activeTripId: string;
  onSelect: (id: string) => void;
  onEdit: (trip: JourneyTrip) => void;
}) {
  const savedTrips = trips.filter((trip) => Boolean(trip.savedToPassportAt));
  const segments = savedTrips.flatMap((trip) => trip.segments);
  const stats = journeyStats(segments);
  const counts = (Object.keys(MODE_META) as JourneyMode[]).map((mode) => ({
    mode,
    count: segments.filter((segment) => segment.mode === mode).length,
  }));
  return (
    <div className="passport-scroll journey-passport-scroll">
      <section className="journey-passport-hero">
        <small>全部旅程 · 2026</small>
        <h2>我的旅行护照</h2>
        <p>每一段路，都算在旅程里。</p>
        <div>
          <span>
            <b>{stats.segments}</b>
            <small>行程段</small>
          </span>
          <span>
            <b>{stats.distanceKm.toLocaleString("zh-CN")}</b>
            <small>公里</small>
          </span>
          <span>
            <b>{stats.cities}</b>
            <small>城市</small>
          </span>
          <span>
            <b>{stats.modes}</b>
            <small>交通方式</small>
          </span>
        </div>
      </section>
      <section className="journey-mode-stats">
        <header>
          <span>交通方式</span>
          <small>按行程段统计</small>
        </header>
        {counts.map(({ mode, count }) => (
          <div key={mode}>
            <span
              style={{
                color: MODE_META[mode].color,
                background: MODE_META[mode].surface,
              }}
            >
              <JourneyModeIcon mode={mode} />
            </span>
            <strong>{MODE_META[mode].label}</strong>
            <i>
              <b
                style={{
                  width: `${Math.max(8, (count / Math.max(1, stats.segments)) * 100)}%`,
                  background: MODE_META[mode].color,
                }}
              />
            </i>
            <em>{count}</em>
          </div>
        ))}
      </section>
      <section className="journey-time-card">
        <small>总在途时间</small>
        <strong>{formatJourneyDuration(stats.durationMinutes)}</strong>
        <p>不只记录飞行，也记录铁路、公路与海上时间。</p>
      </section>
      <section className="mobile-passport-trips">
        <header><span>已保存的行程</span><small>{savedTrips.length} 本旅迹</small></header>
        {savedTrips.map((trip) => {
          const tripStats = journeyStats(trip.segments);
          return (
            <div className={`mobile-passport-trip ${trip.id === activeTripId ? "active" : ""}`} key={trip.id} style={{ "--trip-color": trip.color } as CSSProperties}>
              <button onClick={() => onSelect(trip.id)}>
                <small>TRIP PASSPORT</small>
                <strong>{trip.name}</strong>
                <span>{tripStats.segments} 段 · {tripStats.cities} 城 · {tripStats.distanceKm.toLocaleString("zh-CN")} km</span>
              </button>
              <button aria-label={`编辑 ${trip.name}`} onClick={() => onEdit(trip)}><SFPencil size="xs" /></button>
            </div>
          );
        })}
        {!savedTrips.length && <p>还没有保存的旅迹。回到“行程”后点击“保存到旅迹”。</p>}
      </section>
    </div>
  );
}

export function MobileJourneyDetail({
  segment,
  onClose,
  onToggleComplete,
  onDelete,
}: {
  segment: JourneySegment;
  onClose: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const meta = MODE_META[segment.mode];
  const detailSheet = useSheetDetents({
    detents: [0.32, 0.58, 0.84],
    initial: 0.84,
    dismissible: false,
  });
  return (
    <section
      className={`map-sheet mobile-journey-detail ${detailSheet.dragging ? "is-dragging" : ""}`}
      role="dialog"
      aria-label={`${segment.title}详情`}
      style={
        {
          "--mode-color": meta.color,
          "--sheet-height": `${detailSheet.fraction * 100}%`,
        } as CSSProperties
      }
    >
      <button
        className="sheet-drag-handle detail-sheet-handle"
        aria-label="拖动调整行程详情高度，最小状态会保持固定"
        {...detailSheet.handleProps}
      >
        <span />
      </button>
      <button
        className="mobile-detail-close"
        aria-label="关闭"
        onClick={onClose}
      >
        <SFXmark size="sm" />
      </button>
      <div className="mobile-journey-model" style={{ color: meta.color }}>
        <span><JourneyModeIcon mode={segment.mode} /></span>
      </div>
      <div className="mobile-detail-mode" style={{ color: meta.color }}>
        <JourneyModeIcon mode={segment.mode} />
        <span>
          {meta.label} · {segment.service}
        </span>
        <b>
          {segment.status === "active"
            ? "进行中"
            : segment.status === "complete"
              ? "已完成"
              : "待出发"}
        </b>
      </div>
      <h2>{segment.title}</h2>
      <p>{segment.note}</p>
      <div className="mobile-detail-route">
        <span>
          <small>{segment.origin.city}</small>
          <strong>{segment.origin.code}</strong>
          <b>{segment.departure}</b>
        </span>
        <i />
        <JourneyModeIcon mode={segment.mode} />
        <i />
        <span>
          <small>{segment.destination.city}</small>
          <strong>{segment.destination.code}</strong>
          <b>{segment.arrival}</b>
        </span>
      </div>
      <div className="mobile-detail-metrics">
        <span>
          <small>日期</small>
          <b>{segment.date}</b>
        </span>
        <span>
          <small>时长</small>
          <b>{formatJourneyDuration(segment.durationMinutes)}</b>
        </span>
        <span>
          <small>里程</small>
          <b>{segment.distanceKm.toLocaleString("zh-CN")} km</b>
        </span>
      </div>
      <button className="mobile-complete-button" onClick={onToggleComplete}>
        <SFCheckmarkCircleFill size="sm" />
        {segment.status === "complete" ? "恢复为待出发" : "标记为已完成"}
      </button>
      <button className="mobile-delete-journey" onClick={onDelete}>
        <SFTrash size="xs" />
        删除这段行程
      </button>
    </section>
  );
}
