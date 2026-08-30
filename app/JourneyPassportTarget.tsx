"use client";

import { useMemo, useState, type CSSProperties } from "react";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFLine3Horizontal from "sf-symbols-lib/monochrome/SFLine3Horizontal";
import SFListBullet from "sf-symbols-lib/monochrome/SFListBullet";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import { JourneyModeIcon } from "./JourneyComposer";
import { MODE_META, journeyStats, type JourneyMode } from "./journeyData";
import type { JourneyTrip } from "./journeyStorage";

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}小时${rest ? ` ${rest}分` : ""}` : `${rest}分钟`;
};

const tripDate = (trip: JourneyTrip) => {
  const raw = trip.savedToPassportAt ?? trip.createdAt;
  const date = new Date(raw);
  return Number.isNaN(date.valueOf())
    ? "已保存"
    : new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

export default function JourneyPassportTarget({
  trips,
  activeTripId,
  onSelect,
  onEdit,
  onOpenStats,
  onShare,
}: {
  trips: JourneyTrip[];
  activeTripId: string;
  onSelect: (id: string) => void;
  onEdit: (trip: JourneyTrip) => void;
  onOpenStats: () => void;
  onShare: () => void;
}) {
  const [period, setPeriod] = useState<"all" | "2026">("all");
  const [view, setView] = useState<"list" | "compact">("list");
  const savedTrips = useMemo(() => trips.filter((trip) => Boolean(trip.savedToPassportAt)), [trips]);
  const visibleTrips = period === "all"
    ? savedTrips
    : savedTrips.filter((trip) => (trip.savedToPassportAt ?? trip.createdAt).startsWith("2026"));
  const segments = visibleTrips.flatMap((trip) => trip.segments);
  const stats = journeyStats(segments);
  const modeCounts = (Object.keys(MODE_META) as JourneyMode[])
    .map((mode) => ({ mode, count: segments.filter((segment) => segment.mode === mode).length }))
    .sort((a, b) => b.count - a.count);
  const topMode = modeCounts[0]?.mode ?? "flight";
  const topModeCount = modeCounts[0]?.count ?? 0;
  const completion = stats.segments ? Math.round((stats.completed / stats.segments) * 100) : 0;

  return (
    <div className="passport-target-scroll">
      <div className="passport-period-switch" role="tablist" aria-label="旅迹统计时间">
        <button role="tab" aria-selected={period === "all"} className={period === "all" ? "active" : ""} onClick={() => setPeriod("all")}>全部</button>
        <button role="tab" aria-selected={period === "2026"} className={period === "2026" ? "active" : ""} onClick={() => setPeriod("2026")}>2026</button>
      </div>

      <section className="passport-summary-card">
        <button className="passport-card-share" aria-label="分享旅行护照" onClick={onShare}><SFSquareAndArrowUp size="sm" /></button>
        <small>ALL-TIME FLIGHTY PASSPORT</small>
        <p>护照 · PASSPORT · 旅迹</p>
        <div className="passport-summary-grid">
          <span><small>行程段</small><strong>{stats.segments}</strong><em>{stats.modes} 种交通方式</em></span>
          <span><small>总里程</small><strong>{stats.distanceKm.toLocaleString("zh-CN")}<i> km</i></strong><em>{(stats.distanceKm / 40075).toFixed(2)}x 环绕地球</em></span>
          <span><small>在途时间</small><strong className="passport-duration-value">{formatDuration(stats.durationMinutes)}</strong></span>
          <span><small>到访地点</small><strong className="passport-small-value">{stats.places}</strong></span>
          <span><small>城市</small><strong className="passport-small-value">{stats.cities}</strong></span>
        </div>
        <button className="passport-card-link" onClick={onOpenStats}><span>全部旅迹统计</span><SFChevronRight size="sm" /></button>
      </section>

      <section className="passport-progress-card">
        <button className="passport-card-share" aria-label="分享完成统计" onClick={onShare}><SFSquareAndArrowUp size="sm" /></button>
        <strong>{completion}<i>%</i></strong>
        <h2>行程已完成</h2>
        <p>{stats.completed} 段完成 · {Math.max(0, stats.segments - stats.completed)} 段待出发</p>
        <button className="passport-card-link" onClick={onOpenStats}><span>查看行程进度</span><SFChevronRight size="sm" /></button>
      </section>

      <section className="passport-vehicle-card" style={{ "--vehicle-color": MODE_META[topMode].color } as CSSProperties}>
        <button className="passport-card-share" aria-label="分享载具统计" onClick={onShare}><SFSquareAndArrowUp size="sm" /></button>
        <h2>最常用载具</h2>
        <strong>{MODE_META[topMode].label}</strong>
        <p>{topModeCount} 段 · {MODE_META[topMode].shortLabel}</p>
        <div className="passport-vehicle-stage" aria-hidden="true"><span><JourneyModeIcon mode={topMode} /></span></div>
        <button className="passport-card-link" onClick={onOpenStats}><span>全部载具统计</span><SFChevronRight size="sm" /></button>
      </section>

      <button className="passport-stats-cta" onClick={onOpenStats}>
        <span><b>完整旅行地图与统计</b><small>查看路线、里程、时间与载具排行</small></span>
        <SFChevronRight size="sm" />
      </button>

      <section className="passport-past-trips">
        <header>
          <h2>过往行程</h2>
          <div className="passport-view-switch" role="group" aria-label="行程显示方式">
            <button className={view === "list" ? "active" : ""} aria-label="列表显示" onClick={() => setView("list")}><SFListBullet size="sm" /></button>
            <button className={view === "compact" ? "active" : ""} aria-label="紧凑显示" onClick={() => setView("compact")}><SFLine3Horizontal size="sm" /></button>
          </div>
        </header>
        <div className="passport-sort-row"><button>日期 ↓</button><span>起点</span><span>终点</span><span>载具</span></div>
        <div className={`passport-trip-list ${view}`}>
          {visibleTrips.map((trip) => {
            const tripStats = journeyStats(trip.segments);
            const first = trip.segments[0];
            const last = trip.segments.at(-1);
            const tripMode = first?.mode ?? "flight";
            return (
              <article className={trip.id === activeTripId ? "active" : ""} key={trip.id} style={{ "--trip-color": trip.color } as CSSProperties}>
                <button className="passport-trip-main" onClick={() => onSelect(trip.id)}>
                  <span className="passport-trip-mode"><JourneyModeIcon mode={tripMode} /></span>
                  <span><small>{tripStats.segments} 段 · {tripDate(trip)}</small><strong>{trip.name}</strong><em>{first?.origin.city ?? "待规划"} → {last?.destination.city ?? "待规划"}</em></span>
                  <span className="passport-trip-distance">{tripStats.distanceKm.toLocaleString("zh-CN")} km<SFChevronRight size="xs" /></span>
                </button>
                <button className="passport-trip-edit" aria-label={`编辑 ${trip.name}`} onClick={() => onEdit(trip)}><SFPencil size="xs" /></button>
              </article>
            );
          })}
          {!visibleTrips.length && <p className="passport-empty-state">这个时间段还没有保存的旅迹。</p>}
        </div>
      </section>
    </div>
  );
}

const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

export function JourneyPassportStatsTarget({
  trips,
  onClose,
  onShare,
}: {
  trips: JourneyTrip[];
  onClose: () => void;
  onShare: () => void;
}) {
  const [period, setPeriod] = useState<"all" | "2026">("all");
  const savedTrips = trips.filter((trip) => Boolean(trip.savedToPassportAt));
  const visibleTrips = period === "all"
    ? savedTrips
    : savedTrips.filter((trip) => (trip.savedToPassportAt ?? trip.createdAt).startsWith("2026"));
  const segments = visibleTrips.flatMap((trip) => trip.segments);
  const stats = journeyStats(segments);
  const weekdayCounts = weekDays.map((day) => segments.filter((segment) => segment.date.includes(`周${day}`)).length);
  if (segments.length && weekdayCounts.every((count) => count === 0)) weekdayCounts[3] = segments.length;
  const maxWeekday = Math.max(1, ...weekdayCounts);
  const modeCounts = (Object.keys(MODE_META) as JourneyMode[])
    .map((mode) => ({ mode, count: segments.filter((segment) => segment.mode === mode).length }))
    .sort((a, b) => b.count - a.count);
  const routeCounts = new Map<string, number>();
  const placeCounts = new Map<string, number>();
  segments.forEach((segment) => {
    const route = `${segment.origin.city} → ${segment.destination.city}`;
    routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
    [segment.origin.city, segment.destination.city].forEach((city) => placeCounts.set(city, (placeCounts.get(city) ?? 0) + 1));
  });
  const routes = [...routeCounts].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const places = [...placeCounts].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const shortest = [...segments].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const longest = [...segments].sort((a, b) => b.distanceKm - a.distanceKm)[0];
  const topCount = Math.max(1, modeCounts[0]?.count ?? 0, routes[0]?.[1] ?? 0);
  const earthRatio = stats.distanceKm / 40075;
  const days = stats.durationMinutes / 1440;

  return (
    <section className="passport-detail" role="dialog" aria-modal="true" aria-label="完整旅迹统计">
      <div className="passport-detail-scroll">
        <section className="passport-detail-hero">
          <div className="passport-detail-status" aria-hidden="true"><strong>10:57</strong><span>▮▮▮ ◓ ▰</span></div>
          <header className="passport-detail-header">
            <button aria-label="关闭旅迹统计" onClick={onClose}><SFXmark size="md" /></button>
            <h1>flighty Everything</h1>
            <button aria-label="分享旅迹统计" onClick={onShare}><SFSquareAndArrowUp size="md" /></button>
          </header>
          <div className="passport-detail-period" role="tablist" aria-label="统计时间范围">
            <button role="tab" aria-selected={period === "all"} className={period === "all" ? "active" : ""} onClick={() => setPeriod("all")}>全部</button>
            <button role="tab" aria-selected={period === "2026"} className={period === "2026" ? "active" : ""} onClick={() => setPeriod("2026")}>2026</button>
          </div>
          <div className="passport-mode-ribbon" aria-hidden="true">
            {segments.slice(0, 12).map((segment, index) => <span key={`${segment.id}-${index}`} style={{ color: MODE_META[segment.mode].color }}><JourneyModeIcon mode={segment.mode} /></span>)}
          </div>
          <div className="passport-map-graphic" aria-label={`${stats.cities} 个城市的旅行路线`}>
            <i className="passport-map-land land-a" /><i className="passport-map-land land-b" /><i className="passport-map-land land-c" />
            <i className="passport-map-route route-a" /><i className="passport-map-route route-b" />
            <b className="passport-map-dot dot-a" /><b className="passport-map-dot dot-b" /><b className="passport-map-dot dot-c" />
          </div>
          <div className="passport-hero-cities">{places.slice(0, 3).map(([city]) => <span key={city}>{city}</span>)}</div>
          <div className="passport-hero-summary">
            <small>MY FLIGHTY EVERYTHING PASSPORT</small>
            <p>多载具 · MULTI-MODAL · 旅迹</p>
            <div><span><small>行程段</small><strong>{stats.segments}</strong></span><span><small>总里程</small><strong>{stats.distanceKm.toLocaleString("zh-CN")}<i> km</i></strong></span><span><small>在途时间</small><strong>{formatDuration(stats.durationMinutes)}</strong></span><span><small>地点</small><strong>{stats.places}</strong></span><span><small>载具</small><strong>{stats.modes}</strong></span></div>
          </div>
        </section>

        <div className="passport-detail-body">
          <section className="passport-stat-section passport-frequency-section">
            <div className="passport-section-heading"><h2>行程频率</h2><button onClick={onShare}><SFSquareAndArrowUp size="xs" /> 分享</button></div>
            <p><b>{visibleTrips.length}</b> 本旅迹 · {stats.segments} 段行程</p>
            <div className="passport-stat-tabs"><button className="active">星期</button><button>月份</button></div>
            <div className="passport-week-chart">
              {weekdayCounts.map((count, index) => <span key={weekDays[index]}><i style={{ height: `${Math.max(count ? 15 : 2, (count / maxWeekday) * 100)}%` }} /><small>{weekDays[index]}</small></span>)}
            </div>
          </section>

          <section className="passport-stat-section passport-distance-section">
            <div className="passport-section-heading"><h2>旅行距离</h2><button onClick={onShare}><SFSquareAndArrowUp size="xs" /> 分享</button></div>
            <strong className="passport-stat-big">{stats.distanceKm.toLocaleString("zh-CN")}<i> km</i></strong>
            <p>平均每段：{stats.segments ? Math.round(stats.distanceKm / stats.segments).toLocaleString("zh-CN") : 0} km</p>
            <div className="passport-distance-bars">
              <span><i style={{ width: `${Math.min(100, earthRatio * 100)}%` }} /><b>🌍</b><em>{earthRatio.toFixed(2)}x 环绕地球</em></span>
              <span><i style={{ width: `${Math.min(100, (stats.distanceKm / 384400) * 100)}%` }} /><b>🌕</b><em>{(stats.distanceKm / 384400).toFixed(3)}x 到月球</em></span>
              <span><i style={{ width: `${Math.min(100, (stats.distanceKm / 149600000) * 100)}%` }} /><b>☀️</b><em>{(stats.distanceKm / 149600000).toFixed(5)}x 到太阳</em></span>
            </div>
          </section>

          <section className="passport-stat-section passport-time-section">
            <div className="passport-section-heading"><h2>在途时间</h2><button onClick={onShare}><SFSquareAndArrowUp size="xs" /> 分享</button></div>
            <strong className="passport-stat-big">{formatDuration(stats.durationMinutes)}</strong>
            <div className="passport-time-grid"><span><small>天</small><b>{days.toFixed(1)}</b></span><span><small>周</small><b>{(days / 7).toFixed(2)}</b></span><span><small>月</small><b>{(days / 30).toFixed(2)}</b></span><span><small>年</small><b>{(days / 365).toFixed(3)}</b></span></div>
            {[shortest, longest].map((segment, index) => segment && <div className="passport-extreme-row" key={`${segment.id}-${index}`}><span><small>{index ? "最长一段" : "最短一段"}</small><strong>{segment.origin.city} → {segment.destination.city}</strong><em>{segment.service} · {segment.date}</em></span><b>{formatDuration(segment.durationMinutes)}</b></div>)}
          </section>

          <section className="passport-stat-section passport-modes-section">
            <div className="passport-section-heading"><h2>常用载具</h2><button onClick={onShare}><SFSquareAndArrowUp size="xs" /> 分享</button></div>
            <strong className="passport-stat-big">{stats.modes}<i> 种</i></strong>
            <div className="passport-ranking-list">
              {modeCounts.map(({ mode, count }) => <span key={mode}><b style={{ color: MODE_META[mode].color }}><JourneyModeIcon mode={mode} /></b><em>{MODE_META[mode].label}</em><i><u style={{ width: `${(count / topCount) * 100}%`, background: MODE_META[mode].color }} /></i><small>{count}</small></span>)}
            </div>
          </section>

          <section className="passport-stat-section passport-routes-section">
            <div className="passport-section-heading"><h2>热门路线</h2><button onClick={onShare}><SFSquareAndArrowUp size="xs" /> 分享</button></div>
            <strong className="passport-stat-big">{routes.length}<i> 条</i></strong>
            <div className="passport-ranking-list">
              {routes.map(([route, count]) => <span key={route}><em>{route}</em><i><u style={{ width: `${(count / topCount) * 100}%` }} /></i><small>{count}</small></span>)}
            </div>
          </section>

          <section className="passport-stat-section passport-places-section">
            <div className="passport-section-heading"><h2>到访城市</h2><button onClick={onShare}><SFSquareAndArrowUp size="xs" /> 分享</button></div>
            <strong className="passport-stat-big">{stats.cities}<i> 个</i></strong>
            <div className="passport-place-list">{places.map(([city, count], index) => <span key={city}><b>{index + 1}</b><strong>{city}</strong><small>{count} 次经过</small></span>)}</div>
          </section>
        </div>
      </div>
    </section>
  );
}
