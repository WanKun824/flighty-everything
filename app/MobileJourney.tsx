"use client";

import { useEffect, useState, type CSSProperties } from "react";
import SFArrowDownRight from "sf-symbols-lib/monochrome/SFArrowDownRight";
import SFArrowUpRight from "sf-symbols-lib/monochrome/SFArrowUpRight";
import SFBookClosedFill from "sf-symbols-lib/monochrome/SFBookClosedFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFClockFill from "sf-symbols-lib/monochrome/SFClockFill";
import SFInfoCircleFill from "sf-symbols-lib/monochrome/SFInfoCircleFill";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFPlayFill from "sf-symbols-lib/monochrome/SFPlayFill";
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
  compact = false,
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
  compact?: boolean;
}) {
  const stats = journeyStats(segments);
  const active = segments.find((segment) => segment.status === "active") ?? segments[0];
  const visibleSegments = compact
    ? segments.filter((segment) => segment.id === selectedSegmentId).slice(0, 1)
    : segments;
  const now = useNow();

  return (
    <div className={`panel-scroll mobile-journey-scroll mobile-journey-target ${compact ? "is-compact" : ""}`}>
      <div className="mobile-overview-strip">
        <button
          className="mobile-overview-toggle"
          onClick={onToggleOverview}
          aria-expanded={overviewExpanded}
          aria-label={overviewExpanded ? "收起整趟旅行" : "展开整趟旅行"}
        >
          <span>{compact ? "行程总览" : tripName}</span>
          <small>{stats.segments} 段 · {stats.modes} 种交通 · {stats.distanceKm.toLocaleString("zh-CN")} km</small>
          <SFChevronRight size="xs" />
        </button>
        {!compact && (
          <button className="mobile-overview-edit" aria-label="编辑行程名称" onClick={onEditNames}>
            <SFPencil size="xs" />
          </button>
        )}
        <button
          className={`mobile-overview-save ${savedToPassport ? "saved" : ""}`}
          onClick={onSaveToPassport}
          aria-label={savedToPassport ? "已保存到旅迹" : "保存到旅迹"}
        >
          {savedToPassport ? <SFCheckmarkCircleFill size="xs" /> : <SFBookClosedFill size="xs" />}
          {!compact && (savedToPassport ? "已保存" : "保存")}
        </button>
      </div>

      {!compact && (
        <div className="mobile-section-heading">
          <span>行程</span>
          <button onClick={onAdd}><SFPlus size="xs" />添加</button>
        </div>
      )}

      <div className="mobile-segment-list">
        {visibleSegments.map((segment, index) => {
          const selected = segment.id === selectedSegmentId;
          const countdown = segmentCountdown(segment, now);
          const status = segmentStatus(segment, now);
          return (
            <article
              key={segment.id}
              className={`mobile-segment-card ${segment.status} ${selected ? "selected" : ""}`}
              style={{ "--mode-color": MODE_META[segment.mode].color } as CSSProperties}
            >
              <button
                className="mobile-segment-select"
                onClick={() => selected ? onOpenDetails(segment) : onSelect(segment)}
                aria-pressed={selected}
                aria-label={selected ? `再次点击打开 ${segment.title} 详情` : `在地图上定位 ${segment.title}`}
              >
                <span className="mobile-segment-countdown">
                  <strong>{countdown.value}</strong>
                  <small>{countdown.unit}</small>
                </span>
                <span className="mobile-mode-node" aria-hidden="true"><JourneyModeIcon mode={segment.mode} /></span>
                <span className="mobile-segment-main">
                  <span className="mobile-segment-meta">
                    <em>{segment.operational?.provider || MODE_META[segment.mode].label}</em>
                    <b>{segment.service}</b>
                    <i className={status.tone}>{status.label}</i>
                  </span>
                  <strong className="mobile-segment-title">{segment.title}</strong>
                  <span className="mobile-segment-route-times">
                    <span><SFArrowUpRight size="xs" />{segment.origin.code} <b>{segment.departure}</b></span>
                    <span><SFArrowDownRight size="xs" />{segment.destination.code} <b>{segment.arrival}</b></span>
                  </span>
                  <small className="mobile-segment-source">{sourceLabel(segment)}</small>
                </span>
                <span className="mobile-segment-side">
                  <em>{segment.date.split(" · ")[0]}</em>
                  <MobileSegmentWeather segment={segment} active={segment.id === active?.id} />
                </span>
              </button>
              <button
                className="mobile-segment-detail-button"
                aria-label={`打开 ${segment.title} 详情`}
                onClick={() => onOpenDetails(segment)}
              >
                <SFChevronRight size="xs" />
              </button>
              {index < visibleSegments.length - 1 && <i className="mobile-timeline-line" />}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function FlightyJourneyPanel({
  tripName,
  segments,
  selectedSegmentId,
  onSelect,
  onOpenDetails,
  onToggleOverview,
  overviewExpanded,
  onAdd,
  onEditNames,
  trips,
  activeTripId,
  onChooseTrip,
  onRestart,
  compact = false,
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
  trips: JourneyTrip[];
  activeTripId: string;
  onChooseTrip: (id: string) => void;
  onRestart: () => void;
  compact?: boolean;
}) {
  const selected = segments.find((segment) => segment.id === selectedSegmentId) ?? segments[0];
  const visibleSegments = compact || !overviewExpanded ? (selected ? [selected] : []) : segments;
  const stats = journeyStats(segments);
  const now = useNow();

  return (
    <div className={`panel-scroll mobile-journey-target flighty-journey-list ${compact ? "is-compact" : ""}`}>
      {!compact && <label className="trip-context-picker"><span>旅程</span><select aria-label="切换旅程" value={activeTripId} onChange={event => onChooseTrip(event.target.value)}>{trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>}
      {!compact && <div className="mobile-overview-strip flighty-overview-strip">
        <button
          className="mobile-overview-toggle"
          onClick={onToggleOverview}
          aria-expanded={overviewExpanded}
          aria-label={overviewExpanded ? "收起整趟旅程" : "展开整趟旅程"}
        >
          <span>{tripName}</span>
          <small>{stats.segments} 段 · {stats.modes} 种交通 · {stats.distanceKm.toLocaleString("zh-CN")} km</small>
          <SFChevronRight size="xs" />
        </button>
        {!compact && <button className="mobile-overview-edit" aria-label="编辑旅程名称" onClick={onEditNames}><SFPencil size="xs" /></button>}
        <button className="mobile-overview-restart" aria-label="从头播放整趟旅程" onClick={onRestart}><SFPlayFill size="xs" /><span>回放</span></button>
      </div>}
      {!compact && <div className="mobile-section-heading"><span>路段</span><button onClick={onAdd}><SFPlus size="xs" />添加路段</button></div>}
      {!segments.length && <div className="journey-empty"><p>还没有路段</p><button onClick={onAdd}><SFPlus size="xs" />添加第一段行程</button></div>}
      <div className="mobile-segment-list">
        {visibleSegments.map((segment) => {
          const isSelected = segment.id === selectedSegmentId;
          const countdown = segmentCountdown(segment, now);
          const status = segmentStatus(segment, now);
          return (
            <article
              key={segment.id}
              className={`mobile-segment-card ${status.tone} ${isSelected ? "selected" : ""}`}
              style={{ "--mode-color": MODE_META[segment.mode].color } as CSSProperties}
            >
              <button
                className="mobile-segment-select"
                onClick={() => isSelected ? onOpenDetails(segment) : onSelect(segment)}
                aria-pressed={isSelected}
                aria-label={isSelected ? `再次点击打开 ${segment.title} 详情` : `在地图上定位 ${segment.title}`}
              >
                <span className={`mobile-segment-state ${status.tone}`}>
                  <span aria-hidden="true"><JourneyModeIcon mode={segment.mode} /></span>
                  <small>{compactStatusLabel(status.tone, segment.mode)}</small>
                </span>
                <span className="mobile-segment-main">
                  <span className="mobile-segment-meta">
                    <b>{segment.service}</b>
                    <i className={status.tone}>{scheduleCaption(status.tone, countdown, segment.mode)}</i>
                  </span>
                  <strong className="mobile-segment-title">{segment.title}</strong>
                  <span className="mobile-segment-route-times">
                    <span><SFArrowUpRight size="xs" />{segment.origin.code} <b>{segment.departure}</b></span>
                    <span><SFArrowDownRight size="xs" />{segment.destination.code} <b>{segment.arrival}</b></span>
                    <MobileSegmentWeather segment={segment} active={isSelected} />
                  </span>
                </span>
              </button>
              <button
                className="mobile-segment-detail-button"
                aria-label={`打开 ${segment.title} 详情`}
                onClick={() => onOpenDetails(segment)}
              >
                <SFChevronRight size="xs" />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function compactStatusLabel(tone: string, mode: JourneyMode) {
  if (tone === "complete") return "ARRIVED";
  if (tone === "active") return mode === "flight" ? "IN AIR" : "IN TRANSIT";
  return "UPCOMING";
}

function operatorCode(segment: JourneySegment) {
  const code = segment.service.match(/[A-Za-z]{1,3}/)?.[0];
  return code?.toUpperCase() || MODE_META[segment.mode].label.slice(0, 2);
}

function scheduleCaption(tone: string, countdown: { value: string; unit: string }, mode: JourneyMode) {
  if (tone === "complete") return "Arrived";
  if (countdown.unit === "计划") return "Scheduled";
  if (`${countdown.value}${countdown.unit}`.includes("待确认")) return "待确认到达";
  const minuteMatch = countdown.unit.match(/(\d+)\s*分钟/);
  const duration = countdown.unit.includes("天")
    ? `${countdown.value}d`
    : countdown.value.endsWith("h")
      ? `${countdown.value}${minuteMatch ? ` ${minuteMatch[1]}m` : ""}`
      : countdown.unit.includes("分钟")
        ? `${countdown.value}m`
        : countdown.value;
  return tone === "active" ? `${mode === "flight" ? "Landing" : "Arriving"} in ${duration}` : `Departs in ${duration}`;
}

export function MobileJourneysPanelLegacy({
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
              onClick={() => selected ? onOpenDetails(segment) : onSelect(segment)}
              aria-pressed={selected}
              aria-label={selected
                ? `再次点击打开 ${segment.title} 详情`
                : `在地图上定位 ${segment.title}`}
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

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function bestDepartureAt(segment: JourneySegment) {
  return segment.operational?.actualDepartureAt
    || segment.operational?.estimatedDepartureAt
    || segment.operational?.scheduledDepartureAt;
}

function bestArrivalAt(segment: JourneySegment) {
  return segment.operational?.actualArrivalAt
    || segment.operational?.estimatedArrivalAt
    || segment.operational?.scheduledArrivalAt;
}

function segmentCountdown(segment: JourneySegment, now: number) {
  if (segment.status === "complete") return { value: "已", unit: "完成" };
  const departure = bestDepartureAt(segment);
  const arrival = bestArrivalAt(segment);
  const start = departure ? new Date(departure).getTime() : Number.NaN;
  const end = arrival ? new Date(arrival).getTime() : Number.NaN;
  const hasSchedule = Number.isFinite(start) && Number.isFinite(end);
  if (hasSchedule && now >= end) return { value: "待", unit: "确认到达" };
  if ((hasSchedule && now >= start && now < end) || (!hasSchedule && segment.status === "active")) {
    const minutes = Number.isFinite(end)
      ? Math.max(0, Math.round((end - now) / 60_000))
      : Math.round((1 - segment.progress) * segment.durationMinutes);
    return minutes >= 60
      ? { value: `${Math.floor(minutes / 60)}h`, unit: `${minutes % 60} 分钟` }
      : { value: String(minutes), unit: "分钟后到达" };
  }
  if (Number.isFinite(start)) {
    const minutes = Math.max(0, Math.round((start - now) / 60_000));
    if (minutes < 60) return { value: String(minutes), unit: "分钟后出发" };
    if (minutes < 1440) return { value: `${Math.floor(minutes / 60)}h`, unit: `${minutes % 60} 分钟` };
    return { value: String(Math.ceil(minutes / 1440)), unit: "天后出发" };
  }
  return { value: segment.date.split(" · ")[0], unit: "计划" };
}

function segmentStatus(segment: JourneySegment, now: number) {
  if (segment.status === "complete") return { label: "已完成", tone: "complete" };
  const departure = bestDepartureAt(segment);
  const arrival = bestArrivalAt(segment);
  const start = departure ? new Date(departure).getTime() : Number.NaN;
  const end = arrival ? new Date(arrival).getTime() : Number.NaN;
  const hasSchedule = Number.isFinite(start) && Number.isFinite(end);
  if (hasSchedule && now >= end) {
    return { label: "计划时间已过 · 待确认", tone: "upcoming" };
  }
  if ((hasSchedule && now >= start && now < end) || (!hasSchedule && segment.status === "active")) {
    return { label: segment.operational?.statusText || "进行中", tone: "active" };
  }
  return { label: segment.operational?.statusText || "计划中", tone: "upcoming" };
}

function sourceLabel(segment: JourneySegment) {
  const operational = segment.operational;
  if (!operational) return "手动计划";
  if (operational.quality === "realtime") return `实时 · ${operational.sourceLabel}`;
  if (operational.quality === "verified-schedule") return `已核验时刻 · ${operational.sourceLabel}`;
  if (operational.quality === "verified-route") return "已核验航线 · 时刻由用户填写";
  return operational.sourceLabel;
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
  initialDetent = .33,
  onClose,
  onToggleComplete,
  onDelete,
}: {
  segment: JourneySegment;
  initialDetent?: number;
  onClose: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const meta = MODE_META[segment.mode];
  const now = useNow();
  const status = segmentStatus(segment, now);
  const countdown = segmentCountdown(segment, now);
  const detailSheet = useSheetDetents({
    detents: [.33, .57, .93],
    initial: initialDetent,
    minimumHeight: 256,
    dismissible: false,
  });
  const detent = detailSheet.atMinimum
    ? "minimum"
    : detailSheet.fraction < 0.72
      ? "middle"
      : "maximum";
  const originBadge = endpointBadge(segment, "origin");
  const destinationBadge = endpointBadge(segment, "destination");

  return (
    <section
      className={`map-sheet mobile-journey-detail mobile-journey-detail-target ${detailSheet.dragging ? "is-dragging" : ""}`}
      role="dialog"
      aria-label={`${segment.title}详情`}
      {...detailSheet.sheetProps}
      data-detent={detent}
      style={{
        "--mode-color": meta.color,
        "--sheet-height": `${detailSheet.fraction * 100}%`,
      } as CSSProperties}
    >
      <header className="mobile-detail-summary">
        <span className="mobile-operator-mark" style={{ color: meta.color }} aria-hidden="true">
          <JourneyModeIcon mode={segment.mode} />
        </span>
        <span className="mobile-detail-summary-copy">
          <small>{segment.service} · {operationalDate(segment)}</small>
          <strong>{segment.origin.city}到{segment.destination.city}</strong>
          <em>{segment.operational?.provider || meta.label}</em>
        </span>
        <button className="mobile-detail-close" aria-label="关闭详情" onClick={onClose}>
          <SFXmark size="sm" />
        </button>
      </header>

      <div className={`mobile-detail-mini-state ${status.tone}`}>
        <span><SFClockFill size="xs" />{status.label}</span>
        <b>{countdown.value} <small>{countdown.unit}</small></b>
        <span>{segment.origin.code} {segment.departure} → {segment.destination.code} {segment.arrival}</span>
      </div>

      <div className="mobile-detail-body">
        <section className={`mobile-operational-banner ${status.tone}`}>
          <SFInfoCircleFill size="sm" />
          <span>
            <strong>{segment.operational?.statusText || status.label}</strong>
            <small>{operationalMessage(segment)}</small>
          </span>
          {segment.operational?.realtime && <b>实时</b>}
        </section>

        <section className="mobile-endpoint-block departure">
          <div className="mobile-endpoint-heading">
            <span><SFArrowUpRight size="xs" /><b>{segment.origin.code} · {segment.origin.name}</b></span>
            {originBadge && <em>{originBadge}</em>}
          </div>
          <div className="mobile-endpoint-time">
            <strong>{segment.departure}</strong>
            <span>{segment.operational?.realtime ? "预计 / 实时" : "计划出发"}</span>
          </div>
          <small>{segment.date} · {segment.origin.city}</small>
        </section>

        <div className="mobile-route-duration">
          <i />
          <span><SFClockFill size="xs" />{formatJourneyDuration(segment.durationMinutes)} · {segment.distanceKm.toLocaleString("zh-CN")} km</span>
          <i />
        </div>

        <section className="mobile-endpoint-block arrival">
          <div className="mobile-endpoint-heading">
            <span><SFArrowDownRight size="xs" /><b>{segment.destination.code} · {segment.destination.name}</b></span>
            {destinationBadge && <em>{destinationBadge}</em>}
          </div>
          <div className="mobile-endpoint-time">
            <strong>{segment.arrival}</strong>
            <span>{segment.operational?.realtime ? "预计 / 实时" : "计划到达"}</span>
          </div>
          <small>{segment.destination.city} · {segment.operational?.equipment || segment.note}</small>
        </section>

        <section className="mobile-data-source-card">
          <SFInfoCircleFill size="sm" />
          <span>
            <strong>{sourceLabel(segment)}</strong>
            <small>{freshnessLabel(segment)}</small>
          </span>
        </section>

        <section className="mobile-detail-note">
          <small>行程信息</small>
          <p>{segment.note}</p>
        </section>

        <button className={`mobile-complete-button ${segment.status === "complete" ? "done" : ""}`} onClick={onToggleComplete}>
          <SFCheckmarkCircleFill size="sm" />
          {segment.status === "complete" ? "恢复为未完成" : "标记为已完成"}
        </button>
        <button className="mobile-delete-journey" onClick={onDelete}>
          <SFTrash size="xs" />删除这段行程
        </button>
      </div>
    </section>
  );
}

function endpointBadge(segment: JourneySegment, side: "origin" | "destination") {
  const operational = segment.operational;
  if (!operational) return "";
  if (segment.mode === "flight") {
    const gate = side === "origin" ? operational.originGate : operational.destinationGate;
    const terminal = side === "origin" ? operational.originTerminal : operational.destinationTerminal;
    return [gate && `登机口 ${gate}`, terminal && `航站楼 ${terminal}`].filter(Boolean).join(" · ");
  }
  if (segment.mode === "train") {
    const platform = side === "origin" ? operational.originPlatform : operational.destinationPlatform;
    return platform ? `${platform} 号站台` : "";
  }
  return "";
}

function operationalDate(segment: JourneySegment) {
  const value = bestDepartureAt(segment);
  if (!value) return segment.date;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", weekday: "short" }).format(new Date(value));
}

function operationalMessage(segment: JourneySegment) {
  const operational = segment.operational;
  if (!operational) return "这段行程由你手动保存，暂无实时运行数据";
  if (operational.quality === "realtime") return "位置或运行状态来自实时数据源，地图只播放当前选中路段";
  if (operational.quality === "verified-schedule") return "班次与时刻已由公开时刻表核验；没有实时标注不代表异常";
  if (operational.quality === "verified-route") return "起终点航线已核验，计划时刻由你填写；请以承运方通知为准";
  return "这是已保存的计划信息，状态变化需要手动确认";
}

function freshnessLabel(segment: JourneySegment) {
  const fetchedAt = segment.operational?.fetchedAt;
  if (!fetchedAt) return "当前没有实时更新时间";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000));
  if (minutes < 1) return "刚刚更新";
  if (minutes < 60) return `${minutes} 分钟前更新`;
  return `${Math.floor(minutes / 60)} 小时前更新`;
}

export function MobileJourneyDetailLegacy({
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
    initial: 0.58,
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
