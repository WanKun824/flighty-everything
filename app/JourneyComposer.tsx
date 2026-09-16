"use client";

import { sameJourneyPlace } from "./journeyLifecycle";
import { loadAirportCatalog } from "./airportCatalog";
import { localInputDate, recentJourneyPlaces, routeInputProblem, suggestedJourneyName } from "./composerLogic";
import SFChevronLeft from "sf-symbols-lib/monochrome/SFChevronLeft";
import SFStar from "sf-symbols-lib/monochrome/SFStar";
import SFStarFill from "sf-symbols-lib/monochrome/SFStarFill";
import "./composer.css";
import { useSheetDetents } from "./useSheetDetents";
import { realScheduleProblem, zonedPlanTime } from "./realJourney";
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFArrowLeftArrowRight from "sf-symbols-lib/monochrome/SFArrowLeftArrowRight";
import SFCalendarBadgePlus from "sf-symbols-lib/monochrome/SFCalendarBadgePlus";
import SFCarFill from "sf-symbols-lib/monochrome/SFCarFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
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
  formatJourneyDuration as formatRailDuration,
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
import { localDateTimeIso, searchVerifiedRail } from "./transportData";

const hasSearchText = (value: string) => {
  const query = value.trim();
  return query.length >= minQueryLength(query);
};

const MOBILE_DRAFT_KEY = "flighty-everything:journey-composer-draft:v1";

type ComposerDraft = {
  mode: JourneyMode;
  name: string;
  origin: JourneyPlace;
  originQuery: string;
  destination: JourneyPlace | null;
  query: string;
  date: string;
  departure: string;
  travelMode?: "simulation" | "real";
  arrivalDate?: string;
  arrivalTime?: string;
  timeZone?: string;
  note: string;
  title: string;
  drafts: JourneySegment[];
  planning: boolean;
  saveTarget?: "current" | "new" | "";
  targetTripId?: string;
};

export type JourneySaveTarget = "current" | "new" | "";

function readComposerDraft() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(MOBILE_DRAFT_KEY) ?? window.sessionStorage.getItem(MOBILE_DRAFT_KEY) ?? "null") as ComposerDraft | null;
  } catch {
    return null;
  }
}

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
  importedSegments = [],
  onImportedSegmentsConsumed,
  onCloseRequestReady,
  onCloseCancelled,
  tripName = "我的行程",
  initialOrigin,
  mapSelection,
  onPlaceSelected,
  trips = [],
  contextTripId,
  favoriteCodes = [],
  onFavorite,
  onMapSelectionConsumed,
}: {
  variant: "desktop" | "mobile";
  favoriteCodes?: string[];
  onFavorite?: (code: string) => void;
  onMapSelectionConsumed?: () => void;
  trips?: { id: string; name: string; segments: JourneySegment[] }[];
  contextTripId?: string | null;
  onClose: () => void;
  onAdd?: (segment: JourneySegment) => void;
  onAddMany?: (segments: JourneySegment[], tripName: string, target: JourneySaveTarget, tripId?: string) => void;
  onFlightTools?: () => void;
  importedSegments?: JourneySegment[];
  onImportedSegmentsConsumed?: () => void;
  onCloseRequestReady?: (request: (() => void) | null) => void;
  onCloseCancelled?: () => void;
  tripName?: string;
  initialOrigin?: JourneyPlace;
  mapSelection?: { place: JourneyPlace; token: number; field?: "origin" | "destination" } | null;
  onPlaceSelected?: (place: JourneyPlace) => void;
}) {
  const [restoredDraft] = useState(() => variant === "mobile" ? readComposerDraft() : null);
  const [initialImportedSegments] = useState(importedSegments);
  const importedConsumedRef = useRef(false);
  const importedLast = initialImportedSegments.at(-1);
  const fallbackOrigin = importedLast?.destination ?? initialOrigin ?? JOURNEY_PLACES[0];
  const restoredSegments = restoredDraft?.drafts ?? [];
  const restoredIds = new Set(restoredSegments.map((segment) => segment.id));
  const initialDrafts = [
    ...restoredSegments,
    ...initialImportedSegments.filter((segment) => !restoredIds.has(segment.id)),
  ];
  const [mode, setMode] = useState<JourneyMode>(restoredDraft?.mode ?? "flight");
  const [name, setName] = useState(restoredDraft?.name ?? (contextTripId || variant === "desktop" ? tripName : ""));
  const [origin, setOrigin] = useState<JourneyPlace>(importedLast?.destination ?? restoredDraft?.origin ?? fallbackOrigin);
  const [originQuery, setOriginQuery] = useState(importedLast?.destination.name ?? restoredDraft?.originQuery ?? (initialOrigin ? fallbackOrigin.name : ""));
  const [originSuggestions, setOriginSuggestions] = useState<JourneyPlaceSuggestion[]>([]);
  const [originSearching, setOriginSearching] = useState(false);
  const [destination, setDestination] = useState<JourneyPlace | null>(importedLast ? null : (restoredDraft?.destination ?? null));
  const [query, setQuery] = useState(importedLast ? "" : (restoredDraft?.query ?? ""));
  const [suggestions, setSuggestions] = useState<JourneyPlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [date, setDate] = useState(restoredDraft?.date ?? localInputDate());
  const [departure, setDeparture] = useState(restoredDraft?.departure ?? "09:00");
  const composerSheet = useSheetDetents({ detents: [.4, .67, .93], initial: .93 });
  const [travelMode, setTravelMode] = useState<"simulation" | "real">(restoredDraft?.travelMode ?? "simulation");
  const [arrivalDate, setArrivalDate] = useState(restoredDraft?.arrivalDate ?? localInputDate());
  const [arrivalTime, setArrivalTime] = useState(restoredDraft?.arrivalTime ?? "12:00");
  const [timeZone, setTimeZone] = useState(restoredDraft?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [note, setNote] = useState(restoredDraft?.note ?? "");
  const [title, setTitle] = useState(restoredDraft?.title ?? "");
  const [drafts, setDrafts] = useState<JourneySegment[]>(initialDrafts);
  const [planning, setPlanning] = useState(Boolean(importedLast) || restoredDraft?.planning || variant === "desktop");
  const [saveTarget, setSaveTarget] = useState<JourneySaveTarget>(restoredDraft?.saveTarget || (contextTripId || variant === "desktop" ? "current" : "new"));
  const [targetTripId, setTargetTripId] = useState(restoredDraft?.targetTripId ?? contextTripId ?? "");
  const targetTrip = trips.find(trip => trip.id === targetTripId);
  const [error, setError] = useState<string | null>(null);
  const [railResults, setRailResults] = useState<JourneySegment[]>([]);
  const [selectedRailSegment, setSelectedRailSegment] = useState<JourneySegment | null>(null);
  const railSelectionKey = useRef("");
  const [railSearching, setRailSearching] = useState(false);
  const [sessionToken] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `flighty-${Date.now()}`,
  );
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [editingPlace, setEditingPlace] = useState<"origin" | "destination" | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<JourneyPlaceSuggestion[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [favoritePlaces, setFavoritePlaces] = useState<JourneyPlace[]>([]);
  const [favoriteLoadError, setFavoriteLoadError] = useState(false);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const pickerInputRef = useRef<HTMLInputElement>(null);
  const searchEpochRef = useRef(0);
  const recentPlaces = recentJourneyPlaces(trips);

  useEffect(() => {
    let live = true;
    setFavoriteLoadError(false);
    if (!favoriteCodes.length) { setFavoritePlaces([]); return; }
    void loadAirportCatalog().then(catalog => {
      if (live) setFavoritePlaces(favoriteCodes.flatMap(code => {
        const airport = catalog.find(item => item.code === code);
        return airport ? [airport] : [];
      }));
    }).catch(() => { if (live) setFavoriteLoadError(true); });
    return () => { live = false; };
  }, [favoriteCodes.join("|"), catalogRetry]);

  useEffect(() => {
    if (!editingPlace) return;
    pickerInputRef.current?.focus();
  }, [editingPlace]);

  useEffect(() => {
    if (!editingPlace || !hasSearchText(placeQuery)) { setPlaceResults([]); setPlaceSearching(false); return; }
    const controller = new AbortController();
    setPlaceSearching(true);
    const timer = window.setTimeout(() => {
      void searchJourneyPlaces(placeQuery, sessionToken, controller.signal).then(results => {
        if (!controller.signal.aborted) setPlaceResults(results);
      }).catch(() => { if (!controller.signal.aborted) setError("搜索暂时不可用，请从收藏或最近地点选择"); })
        .finally(() => { if (!controller.signal.aborted) setPlaceSearching(false); });
    }, 240);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [editingPlace, placeQuery, sessionToken]);


  const pickPlace = (place: JourneyPlace, field: "origin" | "destination") => {
    searchEpochRef.current += 1;
    if (field === "origin") { setOrigin(place); setOriginQuery(place.name); }
    else { setDestination(place); setQuery(place.name); }
    setPlaceResults([]); setPlaceQuery(""); setEditingPlace(null); setPlaceSearching(false);
    setPlanning(true); setError(null); onPlaceSelected?.(place);
  };
  const openPlacePicker = (field: "origin" | "destination") => {
    searchEpochRef.current += 1;
    setPlaceQuery(""); setPlaceResults([]); setEditingPlace(field); setError(null); composerSheet.snapTo(.93);
  };
  const pickResult = async (suggestion: JourneyPlaceSuggestion) => {
    if (!editingPlace) return;
    const epoch = ++searchEpochRef.current;
    const field = editingPlace;
    setPlaceSearching(true);
    try {
      const place = await retrieveJourneyPlace(suggestion, sessionToken);
      if (searchEpochRef.current !== epoch) return;
      if (!place) throw Error("没有取得地点坐标，请重试");
      pickPlace(place, field);
    } catch (reason) { if (searchEpochRef.current === epoch) setError(reason instanceof Error ? reason.message : "地点加载失败"); }
    finally { if (searchEpochRef.current === epoch) setPlaceSearching(false); }
  };

  useEffect(() => {
    if (!mapSelection) return;
    pickPlace(mapSelection.place, mapSelection.field ?? editingPlace ?? "destination");
    onMapSelectionConsumed?.();
  }, [mapSelection]);

  const snapshot = (): ComposerDraft => ({
    mode,
    name,
    origin,
    originQuery,
    destination,
    query,
    date,
    departure,
    travelMode, arrivalDate, arrivalTime, timeZone,
    note,
    title,
    drafts,
    planning,
    saveTarget,
    targetTripId,
  });

  const clearComposerDraft = () => {
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(MOBILE_DRAFT_KEY); window.sessionStorage.removeItem(MOBILE_DRAFT_KEY); } catch { /* Keep in-memory editing usable. */ }
    }
  };

  const persistComposerDraft = () => {
    if (variant !== "mobile" || typeof window === "undefined") return true;
    try {
      window.localStorage.setItem(MOBILE_DRAFT_KEY, JSON.stringify(snapshot()));
      return true;
    } catch {
      setError("草稿未能保存，请继续编辑或释放设备存储空间后重试。");
      return false;
    }
  };

  const isDirty = drafts.length > 0 || Boolean(destination) || Boolean(originQuery && (!initialOrigin || origin.code !== initialOrigin.code)) ||
    date !== localInputDate() || departure !== "09:00" || travelMode === "real" ||
    Boolean(name.trim() && name !== tripName) || Boolean(title.trim()) || Boolean(note.trim());
  const validOrigin = originQuery.trim() === origin.name;
  const inputProblem = routeInputProblem(validOrigin ? origin : null, destination, date, departure) || (travelMode === "real" ? realScheduleProblem(date, departure, arrivalDate, arrivalTime, timeZone) : null);
  const pendingLegReady = !inputProblem;
  const stagedCount = drafts.length + (pendingLegReady ? 1 : 0);
  const previousDestination = drafts.at(-1)?.destination ?? (saveTarget === "current" ? targetTrip?.segments.at(-1)?.destination : undefined);
  const hasConnectionGap = previousDestination && validOrigin && !sameJourneyPlace(previousDestination, origin);

  const requestClose = () => {
    if (editingPlace) { searchEpochRef.current += 1; setEditingPlace(null); setError(null); return; }
    if (variant === "mobile" && isDirty) {
      persistComposerDraft();
      setDiscardPrompt(true);
      return;
    }
    clearComposerDraft();
    onClose();
  };
  const requestCloseRef = useRef(requestClose);

  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  useEffect(() => {
    if (variant !== "mobile") return;
    onCloseRequestReady?.(() => requestCloseRef.current());
    return () => onCloseRequestReady?.(null);
  }, [onCloseRequestReady, variant]);

  const openFlightTools = () => {
    if (!persistComposerDraft()) return;
    onFlightTools?.();
  };

  useEffect(() => {
    if (variant !== "mobile") return;
    const draft: ComposerDraft = {
      mode,
      name,
      origin,
      originQuery,
      destination,
      query,
      date,
      departure,
      travelMode, arrivalDate, arrivalTime, timeZone,
      note,
      title,
      drafts,
      planning,
      saveTarget,
    targetTripId,
    };
    try { window.localStorage.setItem(MOBILE_DRAFT_KEY, JSON.stringify(draft)); } catch { /* Explicit saving reports the storage failure and keeps this form open. */ }
  }, [mode, name, origin, originQuery, destination, query, date, departure, note, title, drafts, planning, saveTarget, targetTripId, variant, travelMode, arrivalDate, arrivalTime, timeZone]);

  useEffect(() => {
    if (!initialImportedSegments.length || importedConsumedRef.current) return;
    importedConsumedRef.current = true;
    onImportedSegmentsConsumed?.();
  }, [initialImportedSegments, onImportedSegmentsConsumed]);

  useEffect(() => {
    if (variant === "mobile") return;
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
    if (variant === "mobile" || destination || !hasSearchText(query)) {
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

  useEffect(() => {
    if (railSelectionKey.current === [mode, origin.code, destination?.code, date, departure].join("|")) return;
    setRailResults([]);
    setSelectedRailSegment(null);
  }, [mode, origin.code, destination?.code, date, departure]);

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
      if (place) onPlaceSelected?.(place);
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

  const lookupRail = async () => {
    if (!destination) {
      setError("请先选择列车目的地");
      return;
    }
    setRailSearching(true);
    setError(null);
    setSelectedRailSegment(null);
    try {
      const result = await searchVerifiedRail({
        from: origin.coordinate,
        to: destination.coordinate,
        departAt: localDateTimeIso(date, departure),
      });
      setRailResults(result.segments);
    } catch (reason) {
      setRailResults([]);
      setError(reason instanceof Error ? reason.message : "列车时刻查询失败");
    } finally {
      setRailSearching(false);
    }
  };

  const chooseRail = (segment: JourneySegment) => {
    setSelectedRailSegment({ ...segment, id: `${segment.id}-${Date.now()}` });
    setTitle(segment.title);
    setNote(segment.note);
    if (segment.operational?.scheduledDepartureAt && segment.operational?.scheduledArrivalAt) {
      const parts = (iso: string) => {
        const d = new Date(iso);
        return { date: localInputDate(d), time: d.toTimeString().slice(0, 5) };
      };
      const from = parts(segment.operational.scheduledDepartureAt), to = parts(segment.operational.scheduledArrivalAt);
      railSelectionKey.current = [mode, origin.code, destination?.code, from.date, from.time].join("|");
      setDate(from.date); setDeparture(from.time); setArrivalDate(to.date); setArrivalTime(to.time);
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    setError(null);
  };

  const buildLeg = () => {
    if (!destination || inputProblem) return null;
    const segment = mode === "train" && selectedRailSegment ? selectedRailSegment : createJourneySegmentBetween({
      mode,
      origin,
      destination,
      date,
      departure,
      note,
      title,
    });
    if (travelMode === "simulation") return { ...segment, travelPlan: { mode: "simulation" as const, departureAt: "", arrivalAt: "", timeZone } };
    const departureAt = zonedPlanTime(date, departure, timeZone)!, arrivalAt = zonedPlanTime(arrivalDate, arrivalTime, timeZone)!;
    return {
      ...segment, date, departure, arrival: arrivalTime, status: "upcoming" as const, progress: 0,
      durationMinutes: Math.round((Date.parse(arrivalAt) - Date.parse(departureAt)) / 60000),
      travelPlan: { mode: "real" as const, departureAt, arrivalAt, timeZone },
    };
  };

  const addNextLeg = () => {
    const segment = buildLeg();
    if (!segment) return;
    setDrafts((current) => [...current, segment]);
    if (travelMode === "real") { setDate(arrivalDate); setDeparture(arrivalTime); }
    setOrigin(segment.destination);
    setOriginQuery(segment.destination.name);
    setDestination(null);
    setQuery("");
    setTitle("");
    setNote("");
    setRailResults([]);
    setSelectedRailSegment(null);
    setError(null);
  };

  const removeLastLeg = () => {
    setDrafts((current) => {
      const next = current.slice(0, -1);
      const removed = current.at(-1);
      if (removed) { setOrigin(removed.origin); setOriginQuery(removed.origin.name); }
      return next;
    });
  };

  const save = () => {
    if (variant === "mobile" && (!saveTarget || (saveTarget === "current" && !targetTrip))) {
      setError("请选择加入哪趟旅程，或新建旅程");
      return;
    }
    if (destination && inputProblem) {
      setError(inputProblem);
      return;
    }
    const pending = buildLeg();
    const segments = pending ? [...drafts, pending] : drafts;
    if (!segments.length) {
      setError("请先搜索并选择一个目的地");
      return;
    }
    if (onAddMany) onAddMany(segments, name.trim() || suggestedJourneyName(segments), saveTarget, targetTripId);
    else segments.forEach((segment) => onAdd?.(segment));
    clearComposerDraft();
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
    const fieldLabel = editingPlace === "origin" ? "起点" : "终点";
    const placeMode = (place: JourneyPlace): JourneyMode =>
      place.kind === "airport" ? "flight" : place.kind === "station" ? "train" : place.kind === "port" ? "ferry" : "car";
    const selectedPlace = editingPlace === "origin" ? (validOrigin ? origin : null) : destination;
    const placeRow = (place: JourneyPlace) => (
      <div className="composer-place-row" key={`${place.code}-${place.coordinate.join(",")}`}>
        <button type="button" onClick={() => pickPlace(place, editingPlace!)} aria-label={`选择${place.name}为${fieldLabel}`}>
          <span className="composer-place-icon" style={{ color: MODE_META[placeMode(place)].color }}><JourneyModeIcon mode={placeMode(place)} /></span>
          <span><strong>{place.name}</strong><small>{place.code} · {place.city}</small></span>
          <SFChevronRight size="xs" />
        </button>
        {place.kind === "airport" && onFavorite && <button type="button" className="composer-star" aria-label={`${favoriteCodes.includes(place.code) ? "取消收藏" : "收藏"} ${place.name}`} aria-pressed={favoriteCodes.includes(place.code)} onClick={() => onFavorite(place.code)}>{favoriteCodes.includes(place.code) ? <SFStarFill size="sm" /> : <SFStar size="sm" />}</button>}
      </div>
    );
    return (
      <section className={`journey-composer mobile composer-v2 ${composerSheet.dragging ? "is-dragging" : ""}`} {...composerSheet.sheetProps} style={{ "--composer-height": `${composerSheet.fraction * 100}%` } as CSSProperties} role="dialog" aria-label={editingPlace ? `选择${fieldLabel}` : "添加行程"}>
        <button type="button" className="composer-grabber" aria-label="展开或收起添加行程" onClick={composerSheet.toggleExpanded}><span /></button>
        <header className="composer-header">
          {editingPlace && <button className="composer-circle" aria-label="返回路线编辑" onClick={() => { searchEpochRef.current += 1; setEditingPlace(null); setError(null); }}><SFChevronLeft size="sm" /></button>}
          <h2>{editingPlace ? `选择${fieldLabel}` : "添加行程"}</h2>
          {!editingPlace && <button className="composer-circle" aria-label="关闭添加行程" onClick={requestClose}><SFXmark size="sm" /></button>}
        </header>
        {editingPlace ? (
          <>
            <label className="composer-search">
              <SFMagnifyingglass size="sm" />
              <input ref={pickerInputRef} type="search" value={placeQuery} aria-label={`搜索${fieldLabel}`} placeholder="机场、车站、城市或景点" autoComplete="off" onChange={event => { searchEpochRef.current += 1; setPlaceQuery(event.target.value); setPlaceResults([]); setError(null); }} />
              {placeQuery && <button type="button" aria-label="清除搜索" onClick={() => { searchEpochRef.current += 1; setPlaceQuery(""); pickerInputRef.current?.focus(); }}><SFXmark size="xs" /></button>}
            </label>
            <div className="composer-scroll composer-place-list">
              {error && <p className="composer-error" role="alert">{error}</p>}
              {hasSearchText(placeQuery) ? <>
                <h3>搜索结果</h3>
                {placeSearching && <p className="composer-hint" role="status">正在搜索…</p>}
                {placeResults.map(suggestion => <div className="composer-place-row" key={suggestion.id}>
                  <button type="button" onClick={() => void pickResult(suggestion)}>
                    <span className="composer-place-icon"><SFLocationFill size="sm" /></span>
                    <span><strong>{suggestion.name}</strong><small>{suggestion.subtitle}</small></span><SFChevronRight size="xs" />
                  </button>
                  {suggestion.localPlace?.kind === "airport" && onFavorite && <button className="composer-star" type="button" aria-label={`${favoriteCodes.includes(suggestion.localPlace.code) ? "取消收藏" : "收藏"} ${suggestion.name}`} aria-pressed={favoriteCodes.includes(suggestion.localPlace.code)} onClick={() => onFavorite(suggestion.localPlace!.code)}>{favoriteCodes.includes(suggestion.localPlace.code) ? <SFStarFill size="sm" /> : <SFStar size="sm" />}</button>}
                </div>)}
                {!placeSearching && !placeResults.length && <p className="composer-hint">没有找到地点，试试机场代码或完整名称。</p>}
              </> : <>
                {selectedPlace && <section><h3>当前{fieldLabel}</h3>{placeRow(selectedPlace)}</section>}
                <section><h3>收藏机场</h3>{favoritePlaces.map(placeRow)}
                  {!favoritePlaces.length && !favoriteLoadError && <p className="composer-hint">在机场页面点星标，或收藏搜索结果，即可在这里使用。</p>}
                  {favoriteLoadError && <button className="composer-link" onClick={() => setCatalogRetry(value => value + 1)}>收藏机场加载失败，重试</button>}
                </section>
                {!!recentPlaces.length && <section><h3>最近行程地点</h3>{recentPlaces.map(placeRow)}</section>}
              </>}
            </div>
          </>
        ) : (
          <>
            <div className="composer-scroll">
              <div className="composer-plan-mode" role="group" aria-label="行程模式">
                <button type="button" aria-pressed={travelMode === "simulation"} onClick={() => setTravelMode("simulation")}>模拟预览</button>
                <button type="button" aria-pressed={travelMode === "real"} onClick={() => setTravelMode("real")}>真实行程</button>
              </div>
              <p className="composer-hint">{travelMode === "real" ? "按你的真实时间规划，开启定位后可确认到达。" : "快速预览路线，不代表真实位置，也不会自动记为到达。"}</p>
              <section className="composer-section">
                <label className="composer-field composer-target">
                  <span>所属旅程</span>
                  <select aria-label="行程所属旅程" value={saveTarget === "new" ? "__new__" : targetTripId} onChange={event => {
                    const id = event.target.value;
                    setError(null);
                    if (id === "__new__") { setSaveTarget("new"); setTargetTripId(""); setName(""); }
                    else {
                      setSaveTarget("current"); setTargetTripId(id);
                      const chosen = trips.find(trip => trip.id === id); setName(chosen?.name ?? "");
                      const last = chosen?.segments.at(-1)?.destination;
                      if (!drafts.length && !validOrigin && last) { setOrigin(last); setOriginQuery(last.name); }
                    }
                  }}>
                    <option value="__new__">＋ 新建旅程</option>
                    <option value="" disabled>选择已有旅程</option>
                    {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                  </select>
                </label>

              </section>

              <section className="composer-section">
                <div className="composer-modes" role="group" aria-label="选择交通方式">
                  {(Object.keys(MODE_META) as JourneyMode[]).map(item => <button type="button" key={item} aria-pressed={mode === item} style={{ "--mode-color": MODE_META[item].color } as CSSProperties} onClick={() => { setMode(item); setError(null); }}><JourneyModeIcon mode={item} /><span>{MODE_META[item].label}</span></button>)}
                </div>
                <div className="composer-route-group">
                  <button className="composer-endpoint" type="button" aria-label="选择起点" onClick={() => openPlacePicker("origin")}><span>起点</span><strong className={!validOrigin ? "is-placeholder" : ""}>{validOrigin ? origin.name : "从哪里出发"}</strong><SFChevronRight size="xs" /></button>
                  <button className="composer-endpoint" type="button" aria-label="选择终点" onClick={() => openPlacePicker("destination")}><span>终点</span><strong className={!destination ? "is-placeholder" : ""}>{destination?.name ?? "去哪里"}</strong><SFChevronRight size="xs" /></button>
                </div>
                <button type="button" className="composer-link composer-swap" disabled={!validOrigin || !destination} onClick={() => {
                  if (!destination) return;
                  const oldOrigin = origin; setOrigin(destination); setOriginQuery(destination.name);
                  setDestination(oldOrigin); setQuery(oldOrigin.name); setError(null);
                }}><SFArrowLeftArrowRight size="xs" />交换起终点</button>
              </section>

              <section className="composer-section composer-field-group">
                <label className="composer-field"><span>出发日期</span><input type="date" aria-label="出发日期" value={date} onInput={event => setDate(event.currentTarget.value)} onChange={event => setDate(event.target.value)} /></label>
                <label className="composer-field"><span>出发时间</span><input type="time" aria-label="出发时间" value={departure} onInput={event => setDeparture(event.currentTarget.value)} onChange={event => setDeparture(event.target.value)} /></label>
              </section>

              {travelMode === "real" && <section className="composer-section composer-field-group">
                <label className="composer-field"><span>到达日期</span><input type="date" aria-label="到达日期" value={arrivalDate} onInput={event => setArrivalDate(event.currentTarget.value)} onChange={event => setArrivalDate(event.target.value)} /></label>
                <label className="composer-field"><span>到达时间</span><input type="time" aria-label="到达时间" value={arrivalTime} onInput={event => setArrivalTime(event.currentTarget.value)} onChange={event => setArrivalTime(event.target.value)} /></label>
                <label className="composer-field"><span>时间基准</span><input aria-label="计划时区" list="planning-time-zones" value={timeZone} onChange={event => setTimeZone(event.target.value.trim())} /></label>
                <datalist id="planning-time-zones">{Array.from(new Set([Intl.DateTimeFormat().resolvedOptions().timeZone, "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo", "Europe/London", "America/New_York", "America/Los_Angeles", "UTC"])).map(zone => <option key={zone} value={zone} />)}</datalist>
                <p className="composer-hint composer-zone-hint">出发和到达均按 {timeZone} 填写，跨时区旅行请换算为此时区。</p>
              </section>}

              {mode === "flight" && onFlightTools && <button type="button" className="composer-tool" onClick={openFlightTools}><SFAirplane size="sm" /><span>通过航班号或日历添加</span><SFChevronRight size="xs" /></button>}
              {mode === "train" && <section className="composer-section">
                <button type="button" className="composer-tool" disabled={Boolean(routeInputProblem(validOrigin ? origin : null, destination, date, departure)) || railSearching} onClick={() => void lookupRail()}><SFTrainSideFrontCar size="sm" /><span>{railSearching ? "正在查询列车…" : "查询真实列车班次"}</span><SFChevronRight size="xs" /></button>
                {railResults.map(segment => <button key={segment.id} className="composer-rail-result" type="button" aria-pressed={selectedRailSegment?.service === segment.service && selectedRailSegment.departure === segment.departure} onClick={() => chooseRail(segment)}><strong>{segment.service}</strong><span>{segment.departure} → {segment.arrival}</span><small>{segment.operational?.provider} · {formatRailDuration(segment.durationMinutes)}</small></button>)}
                {selectedRailSegment && <p className="composer-hint">已选 {selectedRailSegment.service}，保存查询返回的车站和时刻。</p>}
              </section>}

              <details className="composer-extras">
                <summary>名称与备注<span>选填</span></summary>
                {saveTarget === "new" && <label className="composer-field"><span>旅程名称</span><input aria-label="旅程名称" value={name} maxLength={48} placeholder="根据起终点自动命名" onChange={event => setName(event.target.value)} /></label>}
                <label className="composer-field"><span>路段名称</span><input value={title} maxLength={80} placeholder="根据路线自动命名" onChange={event => setTitle(event.target.value)} /></label>
                <label className="composer-field"><span>票号与备注</span><input value={note} placeholder="班次、座位或取票信息" onChange={event => setNote(event.target.value)} /></label>
              </details>

              {drafts.length > 0 && <section className="composer-staged"><h3>已暂存 {drafts.length} 段</h3><ol>{drafts.map(segment => <li key={segment.id}><span style={{ color: MODE_META[segment.mode].color }}><JourneyModeIcon mode={segment.mode} /></span><div><strong>{segment.origin.city} → {segment.destination.city}</strong><small>{segment.date} · {segment.departure}</small></div></li>)}</ol>{!destination && <button type="button" className="composer-link" onClick={() => { if (window.confirm("移除最后一段暂存行程？")) removeLastLeg(); }}>移除最后一段</button>}</section>}
              {hasConnectionGap && <p className="composer-hint">上一段终点是 {previousDestination?.name}，当前起点不同。将保留在同一旅程，不自动拆分。</p>}
              {error && <p className="composer-error" role="alert">{error}</p>}
            </div>

            <footer className="composer-footer">
              <p className="composer-save-summary" aria-live="polite">{stagedCount ? `${stagedCount} 段 · 保存到${saveTarget === "new" ? "新旅程" : targetTrip?.name ?? "所选旅程"}` : inputProblem}</p>
              <button type="button" className="composer-save" disabled={stagedCount === 0 || Boolean(destination && inputProblem)} onClick={save}>{saveTarget === "new" ? "创建旅程" : "添加到旅程"}{stagedCount > 0 ? ` · ${stagedCount} 段` : ""}</button>
              {pendingLegReady && <button type="button" className="composer-link composer-continue" onClick={addNextLeg}><SFPlus size="xs" />暂存这一段，继续添加</button>}
            </footer>
          </>
        )}
        {discardPrompt && <div className="composer-discard-backdrop"><section className="composer-discard" role="alertdialog" aria-modal="true" aria-labelledby="discard-draft-title"><h3 id="discard-draft-title">保留这次规划？</h3><p>已暂存 {drafts.length} 段{pendingLegReady ? "，另有 1 段待保存" : ""}。草稿不会加入旅程或旅记。</p>{error && <p role="alert">{error}</p>}<button onClick={() => { if (persistComposerDraft()) onClose(); }}>保存草稿并退出</button><button onClick={() => { setDiscardPrompt(false); onCloseCancelled?.(); }}>继续编辑</button><button className="destructive" onClick={() => { clearComposerDraft(); onClose(); }}>放弃草稿</button></section></div>}
      </section>
    );
  }

  return (
    <section
      className="journey-composer desktop journey-route-builder"
      role="dialog"
      aria-modal="true"
      aria-label="编辑连续行程"
    >
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
        <div><SFLocationFill size="sm" /><input value={originQuery} onFocus={event => event.currentTarget.select()} onChange={(event) => { const value = event.target.value; setOriginQuery(value); setOriginSearching(hasSearchText(value)); if (!hasSearchText(value)) setOriginSuggestions([]); }} placeholder="输入当前所在的地址、景点或车站" /><i>{originSearching ? "搜索中" : originQuery === origin.name ? "已选择" : ""}</i></div>
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
