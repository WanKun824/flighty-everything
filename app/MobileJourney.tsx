"use client";

import { journeyPhase } from "./realJourney";
import TravelPlanEditor from "./TravelPlanEditor";
import type { useRealJourney } from "./useRealJourney";
import { railRouteLabel } from "./journeyPath";
import { useEffect, useState, type CSSProperties } from "react";
import SFArrowDownRight from "sf-symbols-lib/monochrome/SFArrowDownRight";
import SFArrowUpRight from "sf-symbols-lib/monochrome/SFArrowUpRight";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFClockFill from "sf-symbols-lib/monochrome/SFClockFill";
import SFInfoCircleFill from "sf-symbols-lib/monochrome/SFInfoCircleFill";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFPlayFill from "sf-symbols-lib/monochrome/SFPlayFill";
import SFTrash from "sf-symbols-lib/monochrome/SFTrash";
import SheetHeader from "./SheetHeader";
import { SHEET_DETENTS } from "./sheetLayout";
import { toggleFeedback } from "./nativeInteractions";
import { JourneyModeIcon } from "./JourneyComposer";
import {
  MODE_META,
  formatJourneyDuration,
  journeyStats,
  type JourneySegment,
} from "./journeyData";
import { JourneyWeatherIcon, useJourneyWeather } from "./journeyWeather";
import type { JourneyTrip } from "./journeyStorage";
import { useSheetDetents } from "./useSheetDetents";

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
                aria-label={`${segment.title}，${status.label}，${isSelected ? "再次点击打开详情" : "在地图上定位"}`}
              >
                <span className={`mobile-segment-state ${status.tone}`}>
                  <span aria-hidden="true"><JourneyModeIcon mode={segment.mode} /></span>
                </span>
                <span className="mobile-segment-main">
                  <span className="mobile-segment-meta">
                    <b>{segment.service}</b>
                    <i className={status.tone}>{status.label}</i>
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

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function bestDepartureAt(segment: JourneySegment) {
  return segment.travelPlan?.departureAt || segment.operational?.actualDepartureAt
    || segment.operational?.estimatedDepartureAt
    || segment.operational?.scheduledDepartureAt;
}

function bestArrivalAt(segment: JourneySegment) {
  return segment.travelPlan?.arrivalAt || segment.operational?.actualArrivalAt
    || segment.operational?.estimatedArrivalAt
    || segment.operational?.scheduledArrivalAt;
}

function segmentCountdown(segment: JourneySegment, now: number) {
  if (segment.travelPlan?.mode !== "real") return { value: "模拟", unit: "不代表实时位置" };
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

const segmentStatus = journeyPhase;

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

export function MobileJourneyDetail({
  segment,
  location,
  onUpdate,
  initialDetent = .33,
  onClose,
  onToggleComplete,
  onDelete,
}: {
  segment: JourneySegment;
  location: ReturnType<typeof useRealJourney>;
  onUpdate: (segment: JourneySegment) => void;
  initialDetent?: number;
  onClose: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const [editingPlan, setEditingPlan] = useState(false);
  const isReal = segment.travelPlan?.mode === "real";
  const meta = MODE_META[segment.mode];
  const now = useNow();
  const status = segmentStatus(segment, now);
  const countdown = segmentCountdown(segment, now);
  const detailSheet = useSheetDetents({
    detents: SHEET_DETENTS,
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
      <SheetHeader className="mobile-detail-summary" title={`${segment.origin.city}到${segment.destination.city}`} subtitle={`${segment.service} · ${operationalDate(segment)} · ${isReal ? "真实行程" : "模拟预览"}`} back backLabel="返回行程列表" onClose={onClose} />

      <div className={`mobile-detail-mini-state ${status.tone}`}>
        <span><SFClockFill size="xs" />{status.label}</span>
        <b>{countdown.value} <small>{countdown.unit}</small></b>
        <span>{segment.origin.code} {segment.departure} → {segment.destination.code} {segment.arrival}</span>
      </div>

      <div className="journey-time-hero" aria-label={`出发 ${segment.departure}，到达 ${segment.arrival}`}><span><small>出发</small><strong>{segment.departure}</strong></span><span><small>到达</small><strong>{segment.arrival}</strong></span><progress aria-label="行程进度" max={1} value={Math.max(0, Math.min(1, segment.status === "complete" ? 1 : segment.progress))} /></div>
      <div className="mobile-detail-body">
        <section className="journey-mode-control">
          <div role="group" aria-label="查看模式">
            <button aria-pressed={!isReal} onClick={() => { toggleFeedback(); if (isReal && location.enabled) location.toggle(); onUpdate({ ...segment, travelPlan: { ...segment.travelPlan, mode: "simulation", departureAt: segment.travelPlan?.departureAt || "", arrivalAt: segment.travelPlan?.arrivalAt || "", timeZone: segment.travelPlan?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone } }); setEditingPlan(false); }}>模拟预览</button>
            <button aria-pressed={isReal} onClick={() => { toggleFeedback(); setEditingPlan(true); }}>真实行程</button>
          </div>
          {editingPlan && <TravelPlanEditor key={segment.id} segment={segment} onSave={next => { onUpdate(next); setEditingPlan(false); }} onCancel={() => setEditingPlan(false)} />}
          {isReal ? <div className="journey-location-control">
            <p>{segment.travelPlan?.arrivedAt ? `已${segment.travelPlan.arrivalSource === "location" ? "根据定位" : "手动"}确认到达` : location.message}</p>
            {segment.status !== "complete" && <button aria-pressed={location.enabled} onClick={location.toggle}>{location.enabled ? "暂停定位" : "开启我的实时位置"}</button>}
            <button onClick={() => setEditingPlan(true)}>调整出发与到达时间</button>
            <small>仅在应用打开时定位，不上传位置。锁屏或切到后台将暂停；无可靠定位时请手动确认到达。</small>
          </div> : <p>地图播放的是模拟路线，不会自动标记真实到达。</p>}
        </section>
        <section className={`mobile-operational-banner ${status.tone}`}>
          <SFInfoCircleFill size="sm" />
          <span>
            <strong>{status.label}</strong>
            <small>{isReal ? `按 ${segment.travelPlan?.timeZone} 计划时刻显示，不是航班实时状态` : "仅用于预览路线，不代表载具或你的实时位置"}</small>
          </span>
          
        </section>

        <section className="mobile-endpoint-block departure">
          <div className="mobile-endpoint-heading">
            <span><SFArrowUpRight size="xs" /><b>{segment.origin.code} · {segment.origin.name}</b></span>
            {originBadge && <em>{originBadge}</em>}
          </div>
          <div className="mobile-endpoint-time">
            <strong>{segment.departure}</strong>
            <span>{isReal ? "计划出发" : "模拟时刻"}</span>
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
            <span>{isReal ? "计划到达" : "模拟时刻"}</span>
          </div>
          <small>{isReal ? new Intl.DateTimeFormat("zh-CN", { timeZone: segment.travelPlan!.timeZone, dateStyle: "medium" }).format(new Date(segment.travelPlan!.arrivalAt)) : segment.destination.city} · {segment.travelPlan?.timeZone || segment.operational?.equipment || segment.note}</small>
        </section>

        <section className="mobile-data-source-card">
          <SFInfoCircleFill size="sm" />
          <span>
            <strong>{sourceLabel(segment)}</strong>
            <small>{freshnessLabel(segment)}</small>
            {segment.mode === "train" && <small>{railRouteLabel(segment)} · <a href="https://transitous.org/sources/" target="_blank" rel="noreferrer">数据来源</a></small>}
          </span>
        </section>

        <section className="mobile-detail-note">
          <small>行程信息</small>
          <p>{segment.note}</p>
        </section>

        <button className={`mobile-complete-button ${segment.status === "complete" ? "done" : ""}`} onClick={onToggleComplete}>
          <SFCheckmarkCircleFill size="sm" />
          {segment.status === "complete" ? "恢复为未完成" : "手动确认真实已到达"}
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

function freshnessLabel(segment: JourneySegment) {
  const fetchedAt = segment.operational?.fetchedAt;
  if (!fetchedAt) return "当前没有实时更新时间";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000));
  if (minutes < 1) return "刚刚更新";
  if (minutes < 60) return `${minutes} 分钟前更新`;
  return `${Math.floor(minutes / 60)} 小时前更新`;
}
