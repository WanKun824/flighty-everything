"use client";

import { useMemo, useState, type CSSProperties, type ElementType } from "react";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFCalendar from "sf-symbols-lib/monochrome/SFCalendar";
import SFCarFill from "sf-symbols-lib/monochrome/SFCarFill";
import SFChartBarFill from "sf-symbols-lib/monochrome/SFChartBarFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFCloudFill from "sf-symbols-lib/monochrome/SFCloudFill";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFHouseFill from "sf-symbols-lib/monochrome/SFHouseFill";
import SFListBullet from "sf-symbols-lib/monochrome/SFListBullet";
import SFLocationNorthFill from "sf-symbols-lib/monochrome/SFLocationNorthFill";
import SFMapFill from "sf-symbols-lib/monochrome/SFMapFill";
import SFPerson2Fill from "sf-symbols-lib/monochrome/SFPerson2Fill";
import SFPersonBadgePlus from "sf-symbols-lib/monochrome/SFPersonBadgePlus";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFSailboatFill from "sf-symbols-lib/monochrome/SFSailboatFill";
import SFTrainSideFrontCar from "sf-symbols-lib/monochrome/SFTrainSideFrontCar";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import FlightGlobe from "./FlightGlobe";
import JourneyComposer from "./JourneyComposer";
import {
  MODE_META,
  formatJourneyDuration,
  journeyStats,
  type JourneyMode,
  type JourneySegment,
} from "./journeyData";
import { useJourneyStore } from "./journeyStorage";

const MODE_ICONS: Record<JourneyMode, ElementType> = {
  flight: SFAirplane,
  train: SFTrainSideFrontCar,
  car: SFCarFill,
  ferry: SFSailboatFill,
};

const navItems = [
  { id: "overview", label: "旅程总览", icon: SFHouseFill },
  { id: "map", label: "实时地图", icon: SFMapFill },
  { id: "companions", label: "同行的人", icon: SFPerson2Fill },
  { id: "stats", label: "旅行统计", icon: SFChartBarFill },
] as const;

type NavId = (typeof navItems)[number]["id"];

export default function DesktopJourney() {
  const store = useJourneyStore();
  const { state } = store;
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [mode, setMode] = useState<JourneyMode | "all">("all");
  const [day, setDay] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const stats = useMemo(() => journeyStats(state.segments), [state.segments]);
  const days = useMemo(
    () => Array.from(new Set(state.segments.map((segment) => segment.date))),
    [state.segments],
  );
  const modeFiltered =
    mode === "all"
      ? state.segments
      : state.segments.filter((segment) => segment.mode === mode);
  const filtered = day
    ? modeFiltered.filter((segment) => segment.date === day)
    : modeFiltered;
  const selected =
    filtered.find((segment) => segment.id === state.selectedSegmentId) ??
    filtered[0];

  const selectMode = (nextMode: JourneyMode | "all") => {
    setMode(nextMode);
    setDay(null);
  };

  return (
    <main
      className="journey-desktop"
      aria-label="fly everything 网页端旅行工作台"
    >
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <span>
            <SFAirplane size="sm" />
          </span>
          <strong>flighty</strong>
          <b>Everything</b>
        </div>
        <nav className="desktop-primary-nav" aria-label="网页端主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeNav === item.id ? "active" : ""}
                onClick={() => setActiveNav(item.id)}
              >
                <Icon size="sm" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="desktop-nav-caption">交通方式</div>
        <div className="desktop-mode-nav">
          <button
            className={mode === "all" ? "active" : ""}
            onClick={() => selectMode("all")}
          >
            <SFListBullet size="sm" />
            <span>全部行程</span>
            <b>{state.segments.length}</b>
          </button>
          {(Object.keys(MODE_META) as JourneyMode[]).map((item) => {
            const Icon = MODE_ICONS[item];
            return (
              <button
                key={item}
                className={mode === item ? "active" : ""}
                onClick={() => selectMode(item)}
              >
                <Icon size="sm" />
                <span>{MODE_META[item].label}</span>
                <i style={{ background: MODE_META[item].color }} />
              </button>
            );
          })}
        </div>
        <section className="desktop-upgrade-card">
          <span>跨设备同步</span>
          <strong>手机与网页，随时接着规划</strong>
          <small>iOS 行程会自动保存在这台设备。</small>
        </section>
        <button className="desktop-user" onClick={() => setProfileOpen(true)}>
          <span>VL</span>
          <span>
            <strong>Vincent Lee</strong>
            <small>旅行者 · 香港</small>
          </span>
          <SFChevronRight size="xs" />
        </button>
      </aside>

      <section className={`desktop-center nav-${activeNav}`}>
        {activeNav === "companions" ? (
          <DesktopCompanions />
        ) : activeNav === "stats" ? (
          <DesktopStats
            segments={state.segments}
            onMode={(nextMode) => {
              selectMode(nextMode);
              setActiveNav("overview");
            }}
          />
        ) : (
          <>
            <header className="desktop-topbar">
              <div>
                <small>{activeNav === "map" ? "实时路线" : "我的旅程"}</small>
                <h1>{state.tripName}</h1>
                <p>9月18日 — 9月25日 · 日本</p>
              </div>
              <div className="desktop-top-actions">
                <button
                  aria-label="查看日历"
                  className={calendarOpen ? "active" : ""}
                  onClick={() => setCalendarOpen((value) => !value)}
                >
                  <SFCalendar size="sm" />
                </button>
                <button
                  className="desktop-add-button"
                  onClick={() => setComposerOpen(true)}
                >
                  <SFPlus size="xs" />
                  添加行程
                </button>
              </div>
              {calendarOpen && (
                <div
                  className="desktop-calendar-popover"
                  role="dialog"
                  aria-label="选择行程日期"
                >
                  <strong>按日期查看</strong>
                  <button
                    className={day === null ? "active" : ""}
                    onClick={() => {
                      setDay(null);
                      setCalendarOpen(false);
                    }}
                  >
                    全部日期
                  </button>
                  {days.map((date) => (
                    <button
                      key={date}
                      className={day === date ? "active" : ""}
                      onClick={() => {
                        setDay(date);
                        setCalendarOpen(false);
                      }}
                    >
                      {date}
                      <small>
                        {
                          state.segments.filter(
                            (segment) => segment.date === date,
                          ).length
                        }{" "}
                        段
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </header>
            {activeNav === "overview" && (
              <div className="desktop-metrics">
                <article>
                  <span>总里程</span>
                  <strong>
                    {stats.distanceKm.toLocaleString("zh-CN")} <small>km</small>
                  </strong>
                  <em>横跨 {stats.cities} 座城市</em>
                </article>
                <article>
                  <span>在途时间</span>
                  <strong>
                    {formatJourneyDuration(stats.durationMinutes)}
                  </strong>
                  <em>{stats.segments} 段连续行程</em>
                </article>
                <article>
                  <span>交通方式</span>
                  <strong>
                    {stats.modes} <small>种</small>
                  </strong>
                  <em>飞机 · 铁路 · 公路 · 水路</em>
                </article>
                <article>
                  <span>完成进度</span>
                  <strong>
                    {Math.round(
                      (stats.completed / Math.max(1, stats.segments)) * 100,
                    )}
                    <small>%</small>
                  </strong>
                  <em>
                    {stats.completed} / {stats.segments} 段已完成
                  </em>
                </article>
              </div>
            )}
            <section className="desktop-map-card">
              <FlightGlobe
                airportsVisible={false}
                selectedAirport={null}
                weatherMode={state.weatherMode}
                resetToken={resetToken}
                journeySegments={filtered}
                selectedJourneySegmentId={selected?.id}
                onJourneySegmentSelect={store.selectSegment}
                onAirportSelect={() => undefined}
                onWeatherError={() => undefined}
              />
              <div className="desktop-map-heading">
                <span>实时旅程地图</span>
                <small>{day ?? "所有交通方式汇总在一张地图"}</small>
              </div>
              <div className="desktop-map-tools">
                <button
                  className={state.weatherMode !== "none" ? "active" : ""}
                  aria-label="切换天气"
                  onClick={() =>
                    store.setWeatherMode(
                      state.weatherMode === "none" ? "global" : "none",
                    )
                  }
                >
                  <SFCloudFill size="sm" />
                </button>
                <button
                  aria-label="重置地图"
                  onClick={() => setResetToken((value) => value + 1)}
                >
                  <SFLocationNorthFill size="sm" />
                </button>
              </div>
              <div className="desktop-map-legend">
                {(Object.keys(MODE_META) as JourneyMode[]).map((item) => (
                  <span key={item}>
                    <i style={{ background: MODE_META[item].color }} />
                    {MODE_META[item].shortLabel}
                  </span>
                ))}
              </div>
              {selected ? (
                <SelectedMapCard segment={selected} />
              ) : (
                <div className="desktop-map-empty">
                  当天没有符合筛选条件的行程
                </div>
              )}
            </section>
          </>
        )}
      </section>

      <aside className="desktop-itinerary">
        <header>
          <div>
            <small>完整行程</small>
            <h2>路线时间线</h2>
          </div>
          <button aria-label="添加行程" onClick={() => setComposerOpen(true)}>
            <SFPlus size="sm" />
          </button>
        </header>
        <div className="desktop-date-strip">
          {days.map((date) => {
            const parts = dateParts(date);
            return (
              <button
                key={date}
                className={day === date ? "active" : ""}
                onClick={() =>
                  setDay((value) => (value === date ? null : date))
                }
              >
                <b>{parts.day}</b>
                <small>{parts.weekday}</small>
              </button>
            );
          })}
        </div>
        <div className="desktop-timeline">
          {filtered.map((segment, index) => (
            <SegmentRow
              key={segment.id}
              segment={segment}
              active={segment.id === selected?.id}
              last={index === filtered.length - 1}
              onClick={() => store.selectSegment(segment.id)}
            />
          ))}
          {!filtered.length && (
            <div className="desktop-empty-day">
              <SFCalendar size="lg" />
              <strong>这一天还没有行程</strong>
              <button onClick={() => setComposerOpen(true)}>添加一段</button>
            </div>
          )}
        </div>
        {selected && (
          <SelectedDetail
            segment={selected}
            onToggle={() => store.toggleComplete(selected.id)}
          />
        )}
      </aside>
      {composerOpen && (
        <JourneyComposer
          variant="desktop"
          onClose={() => setComposerOpen(false)}
          onAdd={store.addSegment}
        />
      )}
      {profileOpen && (
        <JourneyProfileDialog
          currentName={state.tripName}
          onClose={() => setProfileOpen(false)}
          onSave={store.renameTrip}
        />
      )}
    </main>
  );
}

function DesktopCompanions() {
  const [copied, setCopied] = useState(false);
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText("FLIGHTY-824");
    } catch {
      /* Keep the visible code available for manual copy. */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className="desktop-feature-view">
      <header>
        <div>
          <small>共同旅行</small>
          <h1>同行的人</h1>
          <p>集中查看同行人的位置、交通段与抵达状态。</p>
        </div>
        <button
          className="desktop-add-button"
          onClick={() => void copyInvite()}
        >
          <SFPersonBadgePlus size="sm" />
          {copied ? "邀请码已复制" : "邀请同行人"}
        </button>
      </header>
      <div className="desktop-companion-grid">
        <article>
          <span style={{ background: "#ec6f9a" }}>VL</span>
          <div>
            <strong>Vincent Lee</strong>
            <small>你 · 行程组织者</small>
            <b>香港 → 东京 · CX548</b>
          </div>
          <em>进行中</em>
        </article>
        <article>
          <span style={{ background: "#45cdb0" }}>SA</span>
          <div>
            <strong>Sam</strong>
            <small>共享实时行程</small>
            <b>东京 → 香港 · JL735</b>
          </div>
          <em>18:10</em>
        </article>
        <article className="invite-card">
          <SFPersonBadgePlus size={36} />
          <strong>邀请码 FLIGHTY-824</strong>
          <small>发给同行人，即可在双方设备上自动更新。</small>
          <button onClick={() => void copyInvite()}>
            {copied ? "已复制" : "复制邀请码"}
          </button>
        </article>
      </div>
    </section>
  );
}

function DesktopStats({
  segments,
  onMode,
}: {
  segments: JourneySegment[];
  onMode: (mode: JourneyMode) => void;
}) {
  const stats = journeyStats(segments);
  return (
    <section className="desktop-feature-view">
      <header>
        <div>
          <small>全部旅程 · 2026</small>
          <h1>旅行统计</h1>
          <p>飞机、铁路、公路与水路统一计算。</p>
        </div>
      </header>
      <div className="desktop-stats-hero">
        <span>
          <small>累计里程</small>
          <strong>
            {stats.distanceKm.toLocaleString("zh-CN")}
            <b> km</b>
          </strong>
        </span>
        <span>
          <small>总在途时间</small>
          <strong>{formatJourneyDuration(stats.durationMinutes)}</strong>
        </span>
        <span>
          <small>抵达城市</small>
          <strong>
            {stats.cities}
            <b> 座</b>
          </strong>
        </span>
      </div>
      <div className="desktop-mode-breakdown">
        {(Object.keys(MODE_META) as JourneyMode[]).map((item) => {
          const matching = segments.filter((segment) => segment.mode === item);
          const distance = matching.reduce(
            (sum, segment) => sum + segment.distanceKm,
            0,
          );
          return (
            <button
              key={item}
              onClick={() => onMode(item)}
              style={{ "--mode-color": MODE_META[item].color } as CSSProperties}
            >
              <span style={{ background: MODE_META[item].surface }}>
                <VehicleModeIcon mode={item} />
              </span>
              <div>
                <strong>{MODE_META[item].label}</strong>
                <small>
                  {matching.length} 段 · {distance.toLocaleString("zh-CN")} km
                </small>
                <i>
                  <b
                    style={{
                      width: `${Math.max(6, (distance / Math.max(1, stats.distanceKm)) * 100)}%`,
                    }}
                  />
                </i>
              </div>
              <SFChevronRight size="xs" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function JourneyProfileDialog({
  currentName,
  onClose,
  onSave,
}: {
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(currentName);
  return (
    <section
      className="desktop-profile-dialog"
      role="dialog"
      aria-label="编辑旅程"
    >
      <header>
        <div>
          <small>旅程设置</small>
          <h2>编辑旅程</h2>
        </div>
        <button aria-label="关闭" onClick={onClose}>
          <SFXmark size="sm" />
        </button>
      </header>
      <label>
        <span>旅程名称</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <p>名称会同步显示在网页端和 iOS 行程主页。</p>
      <button
        className="journey-submit"
        disabled={!name.trim()}
        onClick={() => {
          onSave(name);
          onClose();
        }}
      >
        保存名称
      </button>
    </section>
  );
}

function SegmentRow({
  segment,
  active,
  last,
  onClick,
}: {
  segment: JourneySegment;
  active: boolean;
  last: boolean;
  onClick: () => void;
}) {
  const meta = MODE_META[segment.mode];
  return (
    <button
      className={`desktop-segment-row ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="desktop-segment-rail">
        <i style={{ color: meta.color, background: meta.surface }}>
          <VehicleModeIcon mode={segment.mode} />
        </i>
        {!last && <b />}
      </span>
      <span className="desktop-segment-copy">
        <span>
          <strong>{segment.title}</strong>
          <em>{segment.service}</em>
        </span>
        <small>
          {segment.origin.code} → {segment.destination.code} ·{" "}
          {formatJourneyDuration(segment.durationMinutes)}
        </small>
        <small>
          {segment.date} · {segment.departure}
        </small>
      </span>
      <SFChevronRight size="xs" />
    </button>
  );
}

function SelectedMapCard({ segment }: { segment: JourneySegment }) {
  const meta = MODE_META[segment.mode];
  return (
    <div className="desktop-map-selection">
      <span style={{ color: meta.color, background: meta.surface }}>
        <VehicleModeIcon mode={segment.mode} />
      </span>
      <span>
        <small>{segment.status === "active" ? "当前行程" : "已选择"}</small>
        <strong>
          {segment.origin.city} → {segment.destination.city}
        </strong>
        <em>
          {segment.service} · {segment.departure} 出发
        </em>
      </span>
      <SFChevronRight size="xs" />
    </div>
  );
}

function SelectedDetail({
  segment,
  onToggle,
}: {
  segment: JourneySegment;
  onToggle: () => void;
}) {
  return (
    <section className="desktop-selection-detail">
      <div className="desktop-vehicle-preview" style={{ color: MODE_META[segment.mode].color }}>
        <span><VehicleModeIcon mode={segment.mode} /></span>
      </div>
      <div
        className="desktop-detail-mode"
        style={{ color: MODE_META[segment.mode].color }}
      >
        <VehicleModeIcon mode={segment.mode} />
        <span>{MODE_META[segment.mode].label}</span>
        <b>
          {segment.status === "active"
            ? "进行中"
            : segment.status === "complete"
              ? "已完成"
              : "待出发"}
        </b>
      </div>
      <h3>{segment.title}</h3>
      <p>{segment.note}</p>
      <div>
        <span>
          <small>出发</small>
          <strong>{segment.departure}</strong>
        </span>
        <i />
        <span>
          <small>抵达</small>
          <strong>{segment.arrival}</strong>
        </span>
      </div>
      <button onClick={onToggle}>
        <SFCheckmarkCircleFill size="sm" />
        {segment.status === "complete" ? "标记为待出发" : "标记为已完成"}
      </button>
    </section>
  );
}

function dateParts(date: string) {
  const day = date.match(/(\d{1,2})日/)?.[1] ?? date.slice(0, 2);
  const weekday = date.match(/周[一二三四五六日]/)?.[0] ?? "行程";
  return { day, weekday };
}

export function VehicleModeIcon({ mode }: { mode: JourneyMode }) {
  const Icon = MODE_ICONS[mode];
  return <Icon size="sm" />;
}
