"use client";

import { useEffect, useState, type CSSProperties, type ElementType } from "react";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFArrowLeftArrowRight from "sf-symbols-lib/monochrome/SFArrowLeftArrowRight";
import SFCalendarBadgePlus from "sf-symbols-lib/monochrome/SFCalendarBadgePlus";
import SFCarFill from "sf-symbols-lib/monochrome/SFCarFill";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFFerryFill from "sf-symbols-lib/monochrome/SFFerryFill";
import SFDiceFill from "sf-symbols-lib/monochrome/SFDiceFill";
import SFLocationFill from "sf-symbols-lib/monochrome/SFLocationFill";
import SFMagnifyingglass from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFTrainSideFrontCar from "sf-symbols-lib/monochrome/SFTrainSideFrontCar";
import SFTrash from "sf-symbols-lib/monochrome/SFTrash";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import {
  JOURNEY_PLACES,
  MODE_META,
  createJourneySegmentBetween,
  type JourneyMode,
  type JourneyPlace,
  type JourneySegment,
} from "./journeyData";
import {
  retrieveJourneyPlace,
  searchJourneyPlaces,
  type JourneyPlaceSuggestion,
} from "./journeyPlaceSearch";
import { minQueryLength } from "./placeSearch";
import { useSheetDetents } from "./useSheetDetents";

const hasSearchText = (value: string) => {
  const query = value.trim();
  return query.length >= minQueryLength(query);
};

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
  onAddMany,
  onFlightTools,
  tripName = "我的行程",
  initialOrigin,
}: {
  variant: "desktop" | "mobile";
  onClose: () => void;
  onAdd?: (segment: JourneySegment) => void;
  onAddMany?: (segments: JourneySegment[], tripName: string) => void;
  onFlightTools?: () => void;
  tripName?: string;
  initialOrigin?: JourneyPlace;
}) {
  const [mode, setMode] = useState<JourneyMode>("flight");
  const [name, setName] = useState(tripName);
  const [origin, setOrigin] = useState<JourneyPlace>(initialOrigin ?? JOURNEY_PLACES[0]);
  const [originQuery, setOriginQuery] = useState((initialOrigin ?? JOURNEY_PLACES[0]).name);
  const [originSuggestions, setOriginSuggestions] = useState<JourneyPlaceSuggestion[]>([]);
  const [originSearching, setOriginSearching] = useState(false);
  const [destination, setDestination] = useState<JourneyPlace | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<JourneyPlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [date, setDate] = useState("2026-09-18");
  const [departure, setDeparture] = useState("09:00");
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<JourneySegment[]>([]);
  const [planning, setPlanning] = useState(variant === "desktop");
  const [error, setError] = useState<string | null>(null);
  const [sessionToken] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `flighty-${Date.now()}`,
  );
  const mobileSheet = useSheetDetents({
    detents: [0.31, 0.58, 0.86],
    initial: 0.86,
    dismissible: true,
    onDismiss: onClose,
  });

  useEffect(() => {
    const query = originQuery.trim();
    if (query === origin.name || !hasSearchText(query)) {
      const timer = window.setTimeout(() => {
        setOriginSuggestions([]);
        setOriginSearching(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchJourneyPlaces(query, sessionToken, controller.signal)
        .then(setOriginSuggestions)
        .finally(() => {
          if (!controller.signal.aborted) setOriginSearching(false);
        });
    }, 240);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [origin.name, originQuery, sessionToken]);

  useEffect(() => {
    if (destination || !hasSearchText(query)) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchJourneyPlaces(query, sessionToken, controller.signal)
        .then(setSuggestions)
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 240);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [destination, query, sessionToken]);

  const chooseOriginSuggestion = async (suggestion: JourneyPlaceSuggestion) => {
    setOriginSearching(true);
    setError(null);
    try {
      const place = await retrieveJourneyPlace(suggestion, sessionToken);
      if (!place) throw new Error("没有取得这个地址的位置");
      setOrigin(place);
      setOriginQuery(place.name);
      setOriginSuggestions([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "当前地址载入失败");
    } finally {
      setOriginSearching(false);
    }
  };

  const chooseSuggestion = async (suggestion: JourneyPlaceSuggestion) => {
    setSearching(true);
    setError(null);
    try {
      const place = await retrieveJourneyPlace(suggestion, sessionToken);
      if (!place) throw new Error("没有取得这个地点的坐标");
      setDestination(place);
      setQuery(place.name);
      setSuggestions([]);
      setPlanning(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "地点载入失败");
    } finally {
      setSearching(false);
    }
  };

  const buildLeg = () => {
    if (!destination) return null;
    return createJourneySegmentBetween({
      mode,
      origin,
      destination,
      date,
      departure,
      note,
      title,
    });
  };

  const addNextLeg = () => {
    const segment = buildLeg();
    if (!segment) return;
    setDrafts((current) => [...current, segment]);
    setOrigin(segment.destination);
    setOriginQuery(segment.destination.name);
    setDestination(null);
    setQuery("");
    setTitle("");
    setNote("");
    setError(null);
  };

  const removeLastLeg = () => {
    setDrafts((current) => {
      const next = current.slice(0, -1);
      const nextOrigin = next.at(-1)?.destination ?? initialOrigin ?? JOURNEY_PLACES[0];
      setOrigin(nextOrigin);
      setOriginQuery(nextOrigin.name);
      return next;
    });
  };

  const save = () => {
    const pending = buildLeg();
    const segments = pending ? [...drafts, pending] : drafts;
    if (!segments.length) {
      setError("请先搜索并选择一个目的地");
      return;
    }
    if (onAddMany) onAddMany(segments, name.trim() || tripName);
    else segments.forEach((segment) => onAdd?.(segment));
    onClose();
  };

  const chooseLocalDestination = (place: JourneyPlace) => {
    setDestination(place);
    setQuery(place.name);
    setSuggestions([]);
    setSearching(false);
    setPlanning(true);
    setError(null);
  };

  const randomDestination = () => {
    const candidates = JOURNEY_PLACES.filter((place) => place.code !== origin.code);
    const place = candidates[(drafts.length + origin.code.length) % candidates.length];
    if (place) chooseLocalDestination(place);
  };

  if (variant === "mobile") {
    const frequentPlaces = JOURNEY_PLACES.slice(4, 8);
    const placeMode = (place: JourneyPlace): JourneyMode =>
      place.kind === "airport" ? "flight" : place.kind === "station" ? "train" : place.kind === "port" ? "ferry" : "car";
    return (
      <section
        className={`journey-composer mobile journey-search-target ${mobileSheet.dragging ? "is-dragging" : ""}`}
        style={{ "--sheet-height": `${mobileSheet.fraction * 100}%` } as CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label="添加行程"
      >
        <button className="sheet-drag-handle composer-sheet-handle" aria-label="拖动调整搜索面板高度" {...mobileSheet.handleProps}><span /></button>
        <header className="journey-search-header">
          <div><h2>添加行程</h2><p>搜索城市、景点、机场或车站</p></div>
          <button aria-label="关闭添加行程" onClick={onClose}><SFXmark size="md" /></button>
        </header>

        <label className="journey-target-search">
          <SFMagnifyingglass size="md" />
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setDestination(null);
              setSearching(hasSearchText(value));
              if (!hasSearchText(value)) setSuggestions([]);
            }}
            placeholder="东京、HND、京都站或浅草寺"
          />
          <i>{searching ? "搜索中" : destination ? "已选择" : ""}</i>
        </label>

        {suggestions.length > 0 && (
          <div className="journey-search-results journey-target-results" role="listbox" aria-label="地点搜索结果">
            {suggestions.map((suggestion) => (
              <button key={suggestion.id} role="option" aria-selected="false" onClick={() => void chooseSuggestion(suggestion)}>
                <span className={`place-kind ${suggestion.kind}`}><SFLocationFill size="xs" /></span>
                <span><strong>{suggestion.name}</strong><small>{suggestion.subtitle}</small></span>
                <SFChevronRight size="xs" />
              </button>
            ))}
          </div>
        )}

        {!planning && !hasSearchText(query) && (
          <div className="journey-search-starter">
            <section className="journey-frequent-places">
              <h3>常用地点</h3>
              {frequentPlaces.map((place) => {
                const itemMode = placeMode(place);
                return <button key={place.code} onClick={() => chooseLocalDestination(place)}><span style={{ color: MODE_META[itemMode].color }}><JourneyModeIcon mode={itemMode} /></span><span><strong>{place.name}</strong><small>{place.code} · {place.city}</small></span><SFChevronRight size="xs" /></button>;
              })}
            </section>
            <section className="journey-more-actions">
              <h3>更多</h3>
              <button onClick={() => setPlanning(true)}><SFArrowLeftArrowRight size="sm" /><span><strong>按路线规划</strong><small>组合飞机、火车、汽车与轮船</small></span><SFChevronRight size="xs" /></button>
              <button onClick={onFlightTools}><SFAirplane size="sm" /><span><strong>按航班号添加</strong><small>搜索真实航班或导入日历</small></span><SFChevronRight size="xs" /></button>
              <button onClick={onFlightTools}><SFCalendarBadgePlus size="sm" /><span><strong>从日历导入</strong><small>识别日历中的航班</small></span><SFChevronRight size="xs" /></button>
              <button onClick={randomDestination}><SFDiceFill size="sm" /><span><strong>随机探索</strong><small>从当前位置生成下一站</small></span><SFChevronRight size="xs" /></button>
            </section>
          </div>
        )}

        {(planning || destination) && (
          <div className="journey-planner-panel">
            <div className="journey-planner-heading"><span><small>连续路线</small><strong>{origin.city} → {destination?.city ?? "下一站"}</strong></span>{destination && <button onClick={() => { setDestination(null); setQuery(""); }}>更换目的地</button>}</div>
            <label className="trip-name-field journey-target-trip-name"><span>旅程名称</span><input value={name} maxLength={48} onChange={(event) => setName(event.target.value)} placeholder="例如：东京到濑户内海" /></label>
            <label className="journey-place-search journey-origin-search journey-target-origin">
              <span>当前起点</span>
              <div><SFLocationFill size="sm" /><input value={originQuery} onFocus={() => { if (originQuery === origin.name) setOriginQuery(""); }} onChange={(event) => { const value = event.target.value; setOriginQuery(value); setOriginSearching(hasSearchText(value)); if (!hasSearchText(value)) setOriginSuggestions([]); }} placeholder="输入当前地址、机场或车站" /><i>{originSearching ? "搜索中" : originQuery === origin.name ? "已选择" : ""}</i></div>
            </label>
            {originSuggestions.length > 0 && <div className="journey-search-results origin-results" role="listbox" aria-label="起点搜索结果">{originSuggestions.map((suggestion) => <button key={suggestion.id} role="option" aria-selected="false" onClick={() => void chooseOriginSuggestion(suggestion)}><span className={`place-kind ${suggestion.kind}`}><SFLocationFill size="xs" /></span><span><strong>{suggestion.name}</strong><small>{suggestion.subtitle}</small></span><SFChevronRight size="xs" /></button>)}</div>}
            {drafts.length > 0 && <div className="journey-continuity journey-target-continuity"><span><SFLocationFill size="xs" /><small>已规划 {drafts.length} 段</small><strong>{drafts.map((segment) => segment.destination.city).join(" → ")}</strong></span><button onClick={removeLastLeg}><SFTrash size="xs" /> 撤回最后一段</button></div>}
            <div className="journey-mode-picker journey-target-modes" role="tablist" aria-label="选择交通方式">
              {(Object.keys(MODE_META) as JourneyMode[]).map((item) => <button role="tab" aria-selected={mode === item} className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)} style={{ "--mode-color": MODE_META[item].color } as CSSProperties}><JourneyModeIcon mode={item} /><span>{MODE_META[item].label}</span></button>)}
            </div>
            <div className="journey-form-grid journey-target-form">
              <label><span>路段名称（可选）</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${origin.city} → ${destination?.city ?? "目的地"}`} /></label>
              <label><span>日期</span><input aria-label="日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label><span>出发时间</span><input aria-label="出发时间" type="time" value={departure} onChange={(event) => setDeparture(event.target.value)} /></label>
              <label className="journey-note"><span>票号与备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="班次、座位或取票信息" /></label>
            </div>
            {error && <p className="journey-form-error" role="alert">{error}</p>}
            {mode === "flight" && onFlightTools && <button className="flight-tools-link journey-target-flight-tools" onClick={onFlightTools}>使用航班号、路线或日历添加</button>}
            <div className="journey-builder-actions journey-target-actions"><button className="journey-add-leg" disabled={!destination} onClick={addNextLeg}><SFPlus size="xs" /> 添加下一段</button><button className="journey-submit" disabled={!destination && drafts.length === 0} onClick={save}>保存行程 · {drafts.length + (destination ? 1 : 0)} 段</button></div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      className={`journey-composer ${variant} journey-route-builder ${variant === "mobile" && mobileSheet.dragging ? "is-dragging" : ""}`}
      style={variant === "mobile" ? ({ "--sheet-height": `${mobileSheet.fraction * 100}%` } as CSSProperties) : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="编辑连续行程"
    >
      {variant === "mobile" && <button className="sheet-drag-handle composer-sheet-handle" aria-label="拖动调整搜索面板高度" {...mobileSheet.handleProps}><span /></button>}
      <header>
        <div>
          <small>TRIP BUILDER</small>
          <h2>安排连续行程</h2>
          <p>搜索风景地或交通节点，逐段选择飞机、火车、汽车和轮船。</p>
        </div>
        <button aria-label="关闭" onClick={onClose}><SFXmark size="sm" /></button>
      </header>

      <label className="trip-name-field">
        <span>行程名称</span>
        <input value={name} maxLength={48} onChange={(event) => setName(event.target.value)} placeholder="例如：东京与濑户内 · 八日" />
      </label>

      <label className="journey-place-search journey-origin-search">
        <span>当前地址（可以修改）</span>
        <div><SFLocationFill size="sm" /><input value={originQuery} onFocus={() => { if (originQuery === origin.name) setOriginQuery(""); }} onChange={(event) => { const value = event.target.value; setOriginQuery(value); setOriginSearching(hasSearchText(value)); if (!hasSearchText(value)) setOriginSuggestions([]); }} placeholder="输入当前所在的地址、景点或车站" /><i>{originSearching ? "搜索中" : originQuery === origin.name ? "已选择" : ""}</i></div>
      </label>
      {originSuggestions.length > 0 && (
        <div className="journey-search-results origin-results" role="listbox" aria-label="当前地址搜索结果">
          {originSuggestions.map((suggestion) => (
            <button key={suggestion.id} role="option" aria-selected="false" onClick={() => void chooseOriginSuggestion(suggestion)}>
              <span className={`place-kind ${suggestion.kind}`}><SFLocationFill size="xs" /></span>
              <span><strong>{suggestion.name}</strong><small>{suggestion.subtitle}</small></span>
              <SFChevronRight size="xs" />
            </button>
          ))}
        </div>
      )}

      <div className="journey-continuity" aria-label="当前连续路线">
        <span><SFLocationFill size="xs" /><small>当前起点</small><strong>{origin.name}</strong></span>
        {drafts.map((segment, index) => (
          <span key={segment.id} style={{ "--mode-color": MODE_META[segment.mode].color } as CSSProperties}>
            <SFChevronRight size="xs" /><small>第 {index + 1} 段 · {MODE_META[segment.mode].label}</small><strong>{segment.destination.name}</strong>
          </span>
        ))}
        {drafts.length > 0 && <button onClick={removeLastLeg}><SFTrash size="xs" />撤回最后一段</button>}
      </div>

      <label className="journey-place-search">
        <span>搜索下一个地点</span>
        <div><SFMagnifyingglass size="sm" /><input value={query} onChange={(event) => { const value = event.target.value; setQuery(value); setDestination(null); setSearching(hasSearchText(value)); if (!hasSearchText(value)) setSuggestions([]); }} placeholder="景点、车站、机场、港口或城市" /><i>{searching ? "搜索中" : destination ? "已选择" : ""}</i></div>
      </label>
      {suggestions.length > 0 && (
        <div className="journey-search-results" role="listbox" aria-label="地点搜索结果">
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} role="option" aria-selected="false" onClick={() => void chooseSuggestion(suggestion)}>
              <span className={`place-kind ${suggestion.kind}`}><SFLocationFill size="xs" /></span>
              <span><strong>{suggestion.name}</strong><small>{suggestion.subtitle}</small></span>
              <SFChevronRight size="xs" />
            </button>
          ))}
        </div>
      )}

      <div className="journey-mode-picker" role="tablist" aria-label="选择交通方式">
        {(Object.keys(MODE_META) as JourneyMode[]).map((item) => (
          <button role="tab" aria-selected={mode === item} className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)} style={{ "--mode-color": MODE_META[item].color } as CSSProperties}>
            <JourneyModeIcon mode={item} /><span>{MODE_META[item].label}</span>
          </button>
        ))}
      </div>

      <div className="journey-form-grid">
        <label><span>路线名称（可选）</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${origin.city} → ${destination?.city ?? "目的地"}`} /></label>
        <label><span>日期</span><input aria-label="日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label><span>出发时间</span><input aria-label="出发时间" type="time" value={departure} onChange={(event) => setDeparture(event.target.value)} /></label>
        <label className="journey-note"><span>车票与备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="车次、座位、登机口或取票信息" /></label>
      </div>
      {error && <p className="journey-form-error" role="alert">{error}</p>}
      {mode === "flight" && onFlightTools && <button className="flight-tools-link" onClick={onFlightTools}>使用航班号、日历或邮件添加</button>}
      <div className="journey-builder-actions">
        <button className="journey-add-leg" disabled={!destination} onClick={addNextLeg}><SFPlus size="xs" />添加下一段</button>
        <button className="journey-submit" disabled={!destination && drafts.length === 0} onClick={save}>保存整个行程 · {drafts.length + (destination ? 1 : 0)} 段</button>
      </div>
    </section>
  );
}

export function JourneyModeIcon({ mode }: { mode: JourneyMode }) {
  const Icon = ICONS[mode];
  return <Icon size="sm" />;
}
