"use client";

import "./travel-experience.css";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ElementType,
} from "react";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFAirplaneCircleFill from "sf-symbols-lib/monochrome/SFAirplaneCircleFill";
import SFBattery100percent from "sf-symbols-lib/monochrome/SFBattery100percent";
import SFArrowLeftArrowRight from "sf-symbols-lib/monochrome/SFArrowLeftArrowRight";
import SFBookClosedFill from "sf-symbols-lib/monochrome/SFBookClosedFill";
import SFCalendarBadgePlus from "sf-symbols-lib/monochrome/SFCalendarBadgePlus";
import SFCellularbars from "sf-symbols-lib/monochrome/SFCellularbars";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SheetHeader from "./SheetHeader";
import CommunityPanel from "./CommunityPanel";
import { SHEET_DETENTS } from "./sheetLayout";
import { confirmDestructive, shareContent, connectNativeKeyboard, toggleFeedback } from "./nativeInteractions";
import { resultHaptic } from "./nativeHaptics";
import { useSheetAccessibility } from "./useSheetAccessibility";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFCloudFill from "sf-symbols-lib/monochrome/SFCloudFill";
import SFDiceFill from "sf-symbols-lib/monochrome/SFDiceFill";
import SFDocument from "sf-symbols-lib/monochrome/SFDocument";
import SFEllipsis from "sf-symbols-lib/monochrome/SFEllipsis";
import SFGlobe from "sf-symbols-lib/monochrome/SFGlobe";
import SFLocationFill from "sf-symbols-lib/monochrome/SFLocationFill";
import SFMapFill from "sf-symbols-lib/monochrome/SFMapFill";
import SFMagnifyingglass from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFPerson2Fill from "sf-symbols-lib/monochrome/SFPerson2Fill";
import SFPersonBadgePlus from "sf-symbols-lib/monochrome/SFPersonBadgePlus";
import SFPlusCircleFill from "sf-symbols-lib/monochrome/SFPlusCircleFill";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFTrash from "sf-symbols-lib/monochrome/SFTrash";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import SFWifi from "sf-symbols-lib/monochrome/SFWifi";
import FlightGlobe, { BASEMAP_OPTIONS, type BasemapMode } from "./FlightGlobe";
import {
  appearanceLabel,
  useAppearance,
  type AppearanceMode,
} from "./appearance";
import JourneyComposer, { JourneyModeIcon } from "./JourneyComposer";
import {
  FlightyJourneyPanel,
  MobileJourneyDetail,
} from "./MobileJourney";
import JourneyPassportTarget, { JourneyPassportStatsTarget } from "./JourneyPassportTarget";
import {
  AIRLINES,
  AIRPORTS,
  SAMPLE_FLIGHTS,
  airportByCode,
  calendarFlightNumbers,
  flightFromRoute,
  makeFriend,
  searchCatalog,
  type Flight,
  type Region,
} from "./flightyData";
import { segmentFromFlight, type JourneyPlace, type JourneySegment } from "./journeyData";
import { journeyPlaceFromAirport } from "./journeyPlaceSearch";
import { loadAirportCatalog } from "./airportCatalog";
import { AirportsSheet, AirportDetailSheet } from "./AirportPanels";
import { lookupVerifiedFlight } from "./transportData";
import { useJourneyStore, type JourneyTrip } from "./journeyStorage";
import { useRealJourney } from "./useRealJourney";
import { journeyPhase } from "./realJourney";
import { useSheetDetents } from "./useSheetDetents";
import { useMobileViewport } from "./useMobileViewport";
import { useNativeChrome } from "./useNativeChrome";
import { useMapControlLayout } from "./useMapControlLayout";
import { useMobileNavigation } from "./useMobileNavigation";
import {
  useFlightyStore,
  type Profile,
  type WeatherMode,
} from "./flightyStorage";

type Tab = "flights" | "friends" | "passport" | "community";
type Overlay =
  | null
  | "add-flight"
  | "add-journey"
  | "airports"
  | "airport-detail"
  | "weather"
  | "journey-detail"
  | "journey-names"
  | "friends-intro"
  | "profile-name"
  | "profile-avatar"
  | "friends-ready"
  | "add-friend"
  | "profile"
  | "journey-passport-stats";
type AddMode = "suggested" | "route" | "number";
type AppToast = {
  message: string;
  actionLabel?: string;
  action?: () => void;
};

const tabs: Array<{ id: Tab; label: string; icon: ElementType }> = [
  { id: "flights", label: "行程", icon: SFAirplane },
  { id: "friends", label: "同行", icon: SFPerson2Fill },
  { id: "passport", label: "旅迹", icon: SFBookClosedFill },
  { id: "community", label: "社区", icon: SFGlobe },
];

export default function FlightyApp() {
  return <MobileFlighty />;
}

function MobileFlighty() {
  const store = useFlightyStore();
  const journeyStore = useJourneyStore();
  const appearance = useAppearance();
  const { state } = store;
  const [activeTab, setActiveTab] = useState<Tab>("flights");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [journeyFocusToken, setJourneyFocusToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [toast, setToast] = useState<AppToast | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [composerImportedSegments, setComposerImportedSegments] = useState<JourneySegment[]>([]);
  const [composerMapSelection, setComposerMapSelection] = useState<{ place: JourneyPlace; token: number; field?: "origin" | "destination" } | null>(null);
  const composerCloseRequestRef = useRef<(() => void) | null>(null);
  const [pendingComposerTab, setPendingComposerTab] = useState<Tab | null>(null);
  const [query, setQuery] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("suggested");
  const [routeFrom, setRouteFrom] = useState("HKG");
  const [routeTo, setRouteTo] = useState("NRT");
  const [routeDate, setRouteDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [communityPreview, setCommunityPreview] = useState<JourneySegment | null>(null);
  const [communityPage, setCommunityPage] = useState<"feed" | "detail" | "publish">("feed");
  const [airportRegion, setAirportRegion] = useState<"All" | Region>("All");
  const [friendFilter, setFriendFilter] = useState<"Everyone" | "Today">(
    "Everyone",
  );
  const [friendCode, setFriendCode] = useState("");
  const [draftName, setDraftName] = useState("旅行者");
  const [draftTripName, setDraftTripName] = useState("");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState("#ec6f9a");
  const [randomIndex, setRandomIndex] = useState(0);
  const flightSheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .3, minimumHeight: 256 });
  const friendsSheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .57, minimumHeight: 256 });
  const passportSheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .57, minimumHeight: 256 });
  const mainSheet = activeTab === "passport" ? passportSheet : activeTab === "friends" ? friendsSheet : flightSheet;
  const mapControls = useMapControlLayout(mainSheet.fraction);
  const tabScrollPositions = useRef<Partial<Record<Tab, number>>>({});
  useLayoutEffect(() => {
    const scroll = document.querySelector<HTMLElement>(".primary-panel .panel-scroll, .primary-panel .passport-target-scroll, .primary-panel .friends-body");
    if (scroll) scroll.scrollTop = tabScrollPositions.current[activeTab] ?? 0;
    // Store while mounted: a detached scrolling node can report zero in cleanup.
  }, [activeTab]);
  const [overviewExpanded, setOverviewExpanded] = useState(true);
  const [detailInitial, setDetailInitial] = useState(.33);
  const [composerContextTripId, setComposerContextTripId] = useState<string | null>(null);
  useMobileViewport();
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void connectNativeKeyboard().then(remove => { if (disposed) remove(); else cleanup = remove; }).catch(() => {});
    return () => { disposed = true; cleanup?.(); };
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }, []);
  const calendarRef = useRef<HTMLInputElement>(null);
  const selectedJourneyId = journeyStore.state.selectedSegmentId || null;
  const selectedJourney =
    journeyStore.state.segments.find(
      (segment) => segment.id === selectedJourneyId,
    ) ?? null;
  const location = useRealJourney(selectedJourney, journeyStore.confirmLocationArrival);
  const currentTrip = journeyStore.state.trips.find(
    (trip) => trip.id === journeyStore.state.activeTripId,
  );

  // Only enabled by the simulator-only native screenshot session, never normal use.
  // Selects existing React pages; it does not synthesize page HTML or network data.
  useEffect(() => {
    const navigate = (event: Event) => {
      if (document.documentElement.dataset.screenshotSession !== "true") return;
      const target = (event as CustomEvent<{ tab?: Tab; overlay?: Overlay; height?: number; mode?: AddMode }>).detail;
      if (target.tab) setActiveTab(target.tab);
      setOverlay(target.overlay ?? null);
      if (target.mode) setAddMode(target.mode);
      if (target.overlay === "airport-detail") setSelectedAirport("HKG");
      if (target.overlay === "journey-detail") {
        const segment = selectedJourney ?? journeyStore.state.segments[0];
        if (segment) journeyStore.selectSegment(segment.id);
        setDetailInitial(target.height ?? .93);
      }
      if (target.overlay === "journey-names" && currentTrip) {
        setEditingTripId(currentTrip.id); setDraftTripName(currentTrip.name);
      }
      if (target.height && target.overlay !== "journey-detail") {
        (target.tab === "passport" ? passportSheet : target.tab === "friends" ? friendsSheet : flightSheet).snapTo(target.height);
      }
    };
    window.addEventListener("fly-screenshot-navigate", navigate);
    return () => window.removeEventListener("fly-screenshot-navigate", navigate);
  });

  const notify = (message: string, actionLabel?: string, action?: () => void) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, actionLabel, action });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, action ? 5200 : 2400);
  };

  const selectJourneySegment = (id: string) => {
    journeyStore.selectSegment(id);
    setJourneyFocusToken((value) => value + 1);
  };

  const openJourneyDetails = (id: string) => {
    setDetailInitial(mainSheet.fraction);
    selectJourneySegment(id);
    setOverlay("journey-detail");
  };

  const chooseTab = (tab: Tab) => {
    toggleFeedback();
    if (tab === "community") flightSheet.snapTo(.57);
    setOverlay(null);
    setSelectedAirport(null);
    setActiveTab(tab);
  };

  const registerComposerCloseRequest = useCallback((request: (() => void) | null) => {
    composerCloseRequestRef.current = request;
  }, []);

  const chooseBottomTab = (tab: Tab) => {
    if (overlay === "add-journey" || overlay === "add-flight") {
      setPendingComposerTab(tab);
      if (overlay === "add-flight") setOverlay("add-journey");
      return;
    }
    chooseTab(tab);
  };

  const closeComposer = () => {
    const nextTab = pendingComposerTab;
    setPendingComposerTab(null);
    setComposerMapSelection(null);
    setSelectedAirport(null);
    setOverlay(null);
    if (nextTab) chooseTab(nextTab);
  };

  useEffect(() => {
    if (overlay !== "add-journey" || !pendingComposerTab) return;
    const frame = window.requestAnimationFrame(() => {
      composerCloseRequestRef.current?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [overlay, pendingComposerTab]);

  const stageSegmentsForComposer = (segments: JourneySegment[]) => {
    if (!segments.length) return;
    setComposerImportedSegments((current) => [
      ...current,
      ...segments,
    ]);
    setOverlay("add-journey");
    setQuery("");
    notify(`已加入规划草稿 · ${segments.length} 段`);
  };

  const stageFlightsForComposer = (flights: Flight[]) =>
    stageSegmentsForComposer(flights.map(segmentFromFlight));

  const openAddJourney = (withinCurrentTrip = false) => {
    setComposerContextTripId(withinCurrentTrip ? journeyStore.state.activeTripId : null);
    setComposerMapSelection(null);
    setSelectedAirport(null);
    setOverlay("add-journey");
  };

  const openJourneyNames = (trip: JourneyTrip = currentTrip ?? journeyStore.state.trips[0]) => {
    if (!trip) return;
    setEditingTripId(trip.id);
    setDraftTripName(trip.name);
    setOverlay("journey-names");
  };

  const openAirport = async (code: string) => {
    if (overlay === "add-journey") {
      const airport = airportByCode(code) ?? (await loadAirportCatalog().catch(() => [])).find(airport => airport.code === code);
      if (!airport) return;
      setSelectedAirport(code);
      setComposerMapSelection({ place: journeyPlaceFromAirport(airport), token: Date.now() });
      return;
    }
    setSelectedAirport(code);
    setOverlay("airport-detail");
  };

  const resetMap = () => {
    setFollowVehicle(false);
    setSelectedAirport(null);
    setResetToken((value) => value + 1);
  };

  const share = async (title: string, text: string) => {
    try {
      await shareContent(title, text);
      notify("分享内容已准备好");
    } catch {
      /* The native share sheet can be dismissed without an error state. */
    }
  };

  const importCalendar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const numbers = calendarFlightNumbers(await file.text());
    if (!numbers.length) {
      notify("日历中没有找到航班号");
      event.target.value = "";
      return;
    }
    notify(`正在核验日历中的 ${numbers.length} 个航班…`);
    const verified = await Promise.all(numbers.map(async (number) => {
      try {
        return await lookupVerifiedFlight({ number, date: routeDate, departure: "09:00" });
      } catch {
        return null;
      }
    }));
    const segments = verified.flatMap((result) => result ? [result.segment] : []);
    stageSegmentsForComposer(segments);
    notify(
      segments.length
        ? `已核验并加入 ${segments.length}/${numbers.length} 段；时刻可在草稿中调整`
        : "日历航班号未通过真实航线核验，没有生成虚构行程",
    );
    event.target.value = "";
  };

  const title =
    activeTab === "flights" ? "行程" : activeTab === "friends" ? "同行" : activeTab === "community" ? "社区" : "旅迹";
  const initials = state.profile?.initials ?? "旅";
  const profileColor = state.profile?.color ?? "#ec6f9a";
  const mapOverlayOpen = overlay === "airports" || overlay === "airport-detail";
  const airportsOnMap = mapOverlayOpen || overlay === "add-journey";
  useNativeChrome(`${activeTab}:${overlay}:${communityPage}:${followVehicle}:${Boolean(selectedJourneyId)}:${mainSheet.fraction > .5}:${appearance.resolved}`, Boolean(overlay) || (activeTab === "community" && communityPage !== "feed"));
  const backFromSheet = () => {
    if (overlay === "add-journey") composerCloseRequestRef.current?.();
    else if (overlay === "add-flight") setOverlay("add-journey");
    else if (overlay === "airport-detail") { setSelectedAirport(null); setOverlay("airports"); }
    else if (overlay === "profile-avatar") setOverlay("profile-name");
    else if (overlay === "profile-name") setOverlay("friends-intro");
    else setOverlay(null);
  };
  useMobileNavigation(overlay, backFromSheet);
  useSheetAccessibility(overlay, backFromSheet);

  return (
    <main style={{ "--active-sheet-fraction": mainSheet.fraction, "--map-controls-top": `${mapControls.top}px` } as CSSProperties} className={`flighty-page ${mapControls.hidden || Boolean(overlay) ? "map-controls-hidden" : ""} ${mainSheet.fraction > .85 ? "sheet-expanded" : ""}  ${followVehicle && selectedJourneyId ? "is-vehicle-following" : ""} ${!overlay && mainSheet.fraction > 0.5 ? "map-controls-compact" : ""} ${overlay === "add-journey" || overlay === "add-flight" ? "search-open" : ""} ${overlay ? `overlay-${overlay}` : ""}`} data-theme={appearance.resolved}>
      <section
        className="flighty-device"
        aria-label="fly everything 旅行地图"
      >
        <FlightGlobe
          userLocation={selectedJourney?.travelPlan?.mode === "real" ? location.fix : null}
          airportsVisible={airportsOnMap}
          searchAirports={overlay === "add-journey"}
          airportRegion={overlay === "add-journey" ? "All" : airportRegion}
          selectedAirport={selectedAirport}
          weatherMode={state.weatherMode}
          resetToken={resetToken}
          journeySegments={airportsOnMap ? [] : activeTab === "community" ? (communityPreview ? [communityPreview] : []) : journeyStore.state.segments}
          selectedJourneySegmentId={activeTab === "community" ? communityPreview?.id ?? null : selectedJourneyId}
          journeySelectionToken={journeyFocusToken}
          onJourneySegmentSelect={(id) => {
            selectJourneySegment(id);
          }}
          onJourneySegmentComplete={(id) => {
            if (selectedJourney?.travelPlan?.mode === "real") return;
            if (overlay) return; // Never replace a route while its detail or an editor is open.
            const index = journeyStore.state.segments.findIndex((segment) => segment.id === id);
            journeyStore.advanceSegment(id);
            if (index >= 0 && index < journeyStore.state.segments.length - 1) {
              setJourneyFocusToken((value) => value + 1);
            } else {
              setFollowVehicle(false);
            }
          }}
          onAirportSelect={openAirport}
          onWeatherError={(message) => notify(message)}
          theme={appearance.resolved}
          basemap={state.basemap}
          followVehicle={followVehicle}
          onFollowInterrupted={() => {
            setFollowVehicle(false);
            notify("已暂停跟随，可自由查看地图");
          }}
        />
        <StatusBar segment={selectedJourney} />

        {activeTab !== "passport" &&
          ![
            "add-flight",
            "add-journey",
            "friends-intro",
            "profile-name",
            "profile-avatar",
            "friends-ready",
            "add-friend",
            "profile",
            "journey-names",
          ].includes(overlay ?? "") && (
            <div className="map-tools" aria-label="地图工具">
              <button
                className={mapOverlayOpen ? "active" : ""}
                aria-label="打开机场资料与收藏"
                onClick={() => {
                  setSelectedAirport(null);
                  setOverlay(overlay === "airports" ? null : "airports");
                }}
              >
                <SFMapFill size="md" />
              </button>
              <button
                className={overlay === "weather" ? "active" : ""}
                aria-label="打开天气图层"
                onClick={() => setOverlay(overlay === "weather" ? null : "weather")}
              >
                <SFCloudFill size="md" />
              </button>
            </div>
          )}

        {activeTab === "flights" && !mapOverlayOpen && (!overlay || overlay === "journey-detail") && (
          <button
            className={`map-follow-button ${followVehicle ? "active" : ""}`}
            aria-label={selectedJourney?.travelPlan?.mode === "real" ? "跟随我的位置" : "跟随当前选中路段"}
            aria-pressed={followVehicle}
            disabled={!selectedJourneyId || (selectedJourney?.travelPlan?.mode === "real" && !location.fix)}
            onClick={() => setFollowVehicle((value) => !value)}
          >
            <SFLocationFill size="md" />
          </button>
        )}

        <section
          className={`flight-panel primary-panel ${activeTab === "flights" ? "journey-panel" : ""} ${activeTab === "passport" ? "passport-panel" : ""} ${mainSheet.dragging ? "is-dragging" : ""}`}
          {...mainSheet.sheetProps}
          hidden={Boolean(overlay)}
          inert={Boolean(overlay)}
          aria-label={`${title}，上下拖动调整高度`}
          data-tab={activeTab}
          data-minimum={mainSheet.atMinimum}
          onScrollCapture={event => {
            const element = event.target as HTMLElement;
            if (element.matches(".panel-scroll, .passport-target-scroll, .friends-body")) tabScrollPositions.current[activeTab] = element.scrollTop;
          }}
          style={{ "--sheet-height": `${mainSheet.fraction * 100}%` } as CSSProperties}
        >
          <button className="ios-sheet-grabber" aria-label="展开或收起面板" onClick={mainSheet.toggleExpanded}><span /></button>
          <header className="panel-titlebar">
            <div className="panel-title-copy">
              <h1>{title}</h1>
              {activeTab === "flights" && journeyStore.state.segments.length > 0 && <span className="journey-mode-badge">{journeyStore.state.segments.some(segment => segment.travelPlan?.mode !== "real") ? "模拟预览" : "真实行程"}</span>}
            </div>
            <div>
              {activeTab === "friends" && (
                <button
                  className="round-button"
                  aria-label="添加同行人"
                  onClick={() => setOverlay("add-friend")}
                >
                  <SFEllipsis size="md" />
                </button>
              )}
              <button
                className="round-button"
                aria-label={`分享${title}`}
                onClick={() =>
                  void share(title, `我在 fly everything 的${title}`)
                }
              >
                <SFSquareAndArrowUp size="md" />
              </button>
              <button
                className="round-button profile-button avatar-letter"
                style={{ background: profileColor }}
                aria-label="打开个人资料"
                onClick={() => {
                  setDraftName(state.profile?.name ?? "旅行者");
                  setAvatarColor(profileColor);
                  setOverlay("profile");
                }}
              >
                {initials}
              </button>
            </div>
          </header>

          {activeTab === "flights" && (
            <FlightyJourneyPanel
              tripName={journeyStore.state.tripName}
              segments={journeyStore.state.segments}
              selectedSegmentId={selectedJourneyId}
              onSelect={(segment) => selectJourneySegment(segment.id)}
              onOpenDetails={(segment) => openJourneyDetails(segment.id)}
              onToggleOverview={() => setOverviewExpanded(value => !value)}
              overviewExpanded={overviewExpanded}
              trips={journeyStore.state.trips}
              activeTripId={journeyStore.state.activeTripId}
              onChooseTrip={(id) => { journeyStore.selectTrip(id); setOverviewExpanded(true); setJourneyFocusToken(value => value + 1); }}
              onAdd={() => openAddJourney(true)}
              onEditNames={() => openJourneyNames()}
              onRestart={() => {
                journeyStore.restartTrip();
                setJourneyFocusToken((value) => value + 1);
              }}
              compact={mainSheet.atMinimum}
            />
          )}
          {activeTab === "friends" && (
            <FriendsPanel
              filter={friendFilter}
              setFilter={setFriendFilter}
              friends={state.friends}
              onAdd={() => setOverlay(state.profile ? "add-friend" : "friends-intro")}
              onRemove={store.removeFriend}
            />
          )}
          {activeTab === "community" && <CommunityPanel onPageChange={setCommunityPage} segments={journeyStore.state.segments} onSave={journeyStore.addSegment} onPreview={segment => { setCommunityPreview(segment); setJourneyFocusToken(value => value + 1); }} notify={notify} />}
          {activeTab === "passport" && (
            <JourneyPassportTarget
              compact={mainSheet.atMinimum}
              trips={journeyStore.state.trips}
              activeTripId={journeyStore.state.activeTripId}
              onSelect={(id) => {
                journeyStore.selectTrip(id);
                setActiveTab("flights");
                flightSheet.snapTo(.57);
                setJourneyFocusToken((value) => value + 1);
              }}
              onEdit={(trip) => openJourneyNames(trip)}
              onOpenStats={() => setOverlay("journey-passport-stats")}
              onShare={() => void share("fly everything 旅迹", "我的多载具旅行护照")}
            />
          )}

        </section>

        {!overlay && (
          <BottomBar
            activeTab={activeTab}
            chooseTab={chooseBottomTab}
            onSearch={() => openAddJourney(false)}
          />
        )}

        {overlay === "add-flight" && (
          <FlightSearchStep
            query={query}
            setQuery={setQuery}
            mode={addMode}
            setMode={setAddMode}
            routeFrom={routeFrom}
            routeTo={routeTo}
            routeDate={routeDate}
            setRouteFrom={setRouteFrom}
            setRouteTo={setRouteTo}
            setRouteDate={setRouteDate}
            onClose={() => setOverlay("add-journey")}
            onAdd={(flight, verifiedSegment) => {
              if (verifiedSegment) {
                setComposerImportedSegments((current) => [...current, verifiedSegment]);
                setOverlay("add-journey");
                notify(`${flight.number} 已按真实航线加入规划草稿`);
                return;
              }
              stageFlightsForComposer([flight]);
            }}
            onCalendar={() => calendarRef.current?.click()}
            onRandom={() => {
              const flight = {
                ...SAMPLE_FLIGHTS[randomIndex % SAMPLE_FLIGHTS.length],
                id: `random-${Date.now()}`,
              };
              setRandomIndex((value) => value + 1);
              stageFlightsForComposer([flight]);
            }}
          />
        )}
        {(overlay === "add-journey" || overlay === "add-flight") && (
          <JourneyComposer
            variant="mobile"
            suspended={overlay === "add-flight"}
            tripName={journeyStore.state.tripName}
            initialOrigin={composerContextTripId ? journeyStore.state.segments.at(-1)?.destination : undefined}
            trips={journeyStore.state.trips}
            contextTripId={composerContextTripId}
            favoriteCodes={state.favorites}
            onFavorite={store.toggleFavorite}
            onMapSelectionConsumed={() => setComposerMapSelection(null)}
            onClose={closeComposer}
            mapSelection={composerMapSelection}
            onPlaceSelected={(place) => { if (place.kind === "airport") setSelectedAirport(place.code); }}
            onCloseRequestReady={registerComposerCloseRequest}
            onCloseCancelled={() => setPendingComposerTab(null)}
            onAddMany={(segments, tripName, target, tripId) => {
              if (target === "new") journeyStore.createTripWithSegments(tripName, segments);
              else if (tripId) journeyStore.addSegmentsToTrip(tripId, segments);
              else journeyStore.addSegmentsToActiveTrip(segments);
              setActiveTab("flights");
              setOverviewExpanded(true);
              flightSheet.snapTo(.57);
              setJourneyFocusToken(value => value + 1);
              void resultHaptic();
              notify("行程已保存");
            }}
            onFlightTools={() => setOverlay("add-flight")}
            importedSegments={composerImportedSegments}
            onImportedSegmentsConsumed={() => setComposerImportedSegments([])}
          />
        )}
        {overlay === "journey-names" && (
          <JourneyNamesSheet
            tripName={draftTripName}
            setTripName={setDraftTripName}
            onDelete={journeyStore.state.trips.length > 1 && editingTripId ? () => {
              const index = journeyStore.state.trips.findIndex(trip => trip.id === editingTripId);
              const snapshot = journeyStore.state.trips[index];
              const wasActive = journeyStore.state.activeTripId === editingTripId;
              journeyStore.deleteTrip(editingTripId);
              void resultHaptic(false);
              setOverlay(null);
              setFollowVehicle(false);
              notify("已删除旅程，旅迹已同步更新", "撤销", () => { if (snapshot) journeyStore.restoreTrip(snapshot, index, wasActive); });
            } : undefined}
            onClose={() => setOverlay(null)}
            onSave={() => {
              if (editingTripId) journeyStore.renameTripById(editingTripId, draftTripName);
              setOverlay(null);
              notify("行程名称已更新");
            }}
          />
        )}
        <input
          ref={calendarRef}
          className="visually-hidden"
          type="file"
          accept=".ics,text/calendar"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => void importCalendar(event)}
        />

        {overlay === "airports" && (
          <AirportsSheet
            region={airportRegion}
            setRegion={setAirportRegion}
            favorites={state.favorites}
            activeCodes={journeyStore.state.segments.flatMap(segment => [segment.origin, segment.destination]).filter(place => place.kind === "airport").map(place => place.code)}
            onFavorite={store.toggleFavorite}
            onAirport={openAirport}
            onClose={() => setOverlay(null)}
            onShare={() =>
              void share(
                "机场",
                "fly everything 机场资料与收藏",
              )
            }
          />
        )}
        {overlay === "airport-detail" && selectedAirport && (
          <AirportDetailSheet
            code={selectedAirport}
            favorite={state.favorites.includes(selectedAirport)}
            onFavorite={() => store.toggleFavorite(selectedAirport)}
            onPlan={(place, field) => {
              setComposerContextTripId(null);
              setComposerMapSelection({ place, field, token: Date.now() });
              setFollowVehicle(false);
              setOverlay("add-journey");
            }}
            onBack={() => {
              setSelectedAirport(null);
              setOverlay("airports");
              resetMap();
            }}
          />
        )}
        {overlay === "weather" && (
          <WeatherSheet
            value={state.weatherMode}
            basemap={state.basemap}
            onChange={(value) => {
              toggleFeedback();
              store.setWeatherMode(value);
              setResetToken((token) => token + 1);
            }}
            onBasemapChange={value => { toggleFeedback(); store.setBasemap(value); }}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay === "journey-detail" && selectedJourney && (
          <MobileJourneyDetail
            segment={selectedJourney}
            initialDetent={detailInitial}
            location={location}
            onUpdate={journeyStore.updateSegment}
            onClose={() => setOverlay(null)}
            onToggleComplete={() => {
              const wasComplete = selectedJourney.status === "complete";
              const tripId = journeyStore.state.activeTripId;
              journeyStore.toggleComplete(selectedJourney.id);
              void resultHaptic();
              notify(
                wasComplete ? "已恢复为待出发" : "已标记为完成",
                "撤销",
                () => journeyStore.restoreSegment(tripId, selectedJourney),
              );
            }}
            onDelete={async () => {
              if (!await confirmDestructive("删除这段行程？", `${selectedJourney.title} 将从当前旅程移除，可在提示中撤销。`, "删除路段")) return;
              void resultHaptic(false);
              const snapshot = [...journeyStore.state.segments];
              const tripId = journeyStore.state.activeTripId;
              const deletedId = selectedJourney.id;
              journeyStore.removeSegment(selectedJourney.id);
              setOverlay(null);
              notify("已删除这段行程", "撤销", () => {
                journeyStore.restoreSegments(snapshot, deletedId, tripId);
                setJourneyFocusToken((value) => value + 1);
              });
            }}
          />
        )}

        {overlay &&
          [
            "friends-intro",
            "profile-name",
            "profile-avatar",
            "friends-ready",
          ].includes(overlay) && (
            <OnboardingSheet
              step={overlay}
              name={draftName}
              setName={setDraftName}
              color={avatarColor}
              setColor={setAvatarColor}
              onClose={() => setOverlay(null)}
              onContinue={() => {
                if (overlay === "friends-intro") setOverlay("profile-name");
                else if (overlay === "profile-name")
                  setOverlay("profile-avatar");
                else if (overlay === "profile-avatar") {
                  store.saveProfile(profileFrom(draftName, avatarColor));
                  setOverlay("friends-ready");
                } else {
                  setActiveTab("friends");
                  setOverlay(null);
                }
              }}
            />
          )}
        {overlay === "add-friend" && (
          <AddFriendSheet
            code={friendCode}
            setCode={setFriendCode}
            onClose={() => setOverlay(null)}
            onAdd={() => {
              const friend = makeFriend(friendCode);
              store.addFriend(friend);
              setFriendCode("");
              setActiveTab("friends");
              setOverlay(null);
              notify(`${friend.name} 已添加到本地同行示例`);
            }}
          />
        )}
        {overlay === "profile" && (
          <ProfileSheet
            profile={state.profile}
            name={draftName}
            setName={setDraftName}
            color={avatarColor}
            setColor={setAvatarColor}
            onClose={() => setOverlay(null)}
            onSave={() => {
              store.saveProfile(profileFrom(draftName, avatarColor));
              setOverlay(null);
              notify("资料已更新");
            }}
            onReset={async () => {
              if (!await confirmDestructive("清除本地数据？", "将移除本机的行程、同行、资料、收藏与规划草稿。此操作不可撤销。", "清除本地数据")) return;
              store.reset();
              journeyStore.clear();
              for (const storage of [window.localStorage, window.sessionStorage]) {
                storage.removeItem("flighty-everything:journey-composer-draft:v1");
              }
              void resultHaptic(false);
              setOverlay(null);
              setActiveTab("flights");
              notify("本地数据已清除");
            }}
            appearance={appearance.mode}
            onAppearanceChange={value => { toggleFeedback(); appearance.setMode(value); }}
          />
        )}

        {overlay === "journey-passport-stats" && (
          <JourneyPassportStatsTarget
            trips={journeyStore.state.trips}
            onClose={() => setOverlay(null)}
            onShare={() => void share("fly everything 旅迹统计", "我的多载具旅行统计")}
          />
        )}
        {toast && (
          <div className="flighty-toast" role="status">
            <span>{toast.message}</span>
            {toast.action && toast.actionLabel && (
              <button
                onClick={() => {
                  toast.action?.();
                  setToast(null);
                  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = null;
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function JourneyNamesSheet({ tripName, setTripName, onClose, onSave, onDelete }: {
  tripName: string; setTripName: (value: string) => void; onClose: () => void; onSave: () => void; onDelete?: () => void;
}) {
  const sheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .57, minimumHeight: 256 });
  return (
    <section {...sheet.sheetProps} className={`map-sheet journey-names-sheet ${sheet.dragging ? "is-dragging" : ""}`} style={{ "--sheet-height": `${sheet.fraction * 100}%` } as CSSProperties} role="dialog" aria-modal="true" aria-label="编辑旅程">
      <SheetHeader title="编辑旅程" back onClose={onClose} />
      <div className="map-sheet-scroll">
        <label><span>旅程名称</span><input value={tripName} maxLength={48} onChange={event => setTripName(event.target.value)} /></label>
        <button className="journey-name-save" disabled={!tripName.trim()} onClick={onSave}>保存名称</button>
        {onDelete && <button className="journey-delete-trip" onClick={async () => { if (await confirmDestructive(`删除“${tripName}”？`, "这趟旅程的全部路段会移除，旅迹统计也会同步更新。")) onDelete(); }}>删除这趟旅程</button>}
      </div>
    </section>
  );
}

function StatusBar({ segment }: { segment: JourneySegment | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const activity = dynamicActivity(segment, now.getTime());
  return (
    <header className="ios-status" aria-label="应用内行程状态">
      <time dateTime={now.toISOString()}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</time>
      <span className={`dynamic-island ${activity.active ? "has-activity" : ""}`} aria-live="polite">
        {segment ? <JourneyModeIcon mode={segment.mode} /> : <i />}
        {activity.active && <b>{activity.label}</b>}
      </span>
      <span className="status-signals" aria-hidden="true">
        <SFCellularbars size="xs" />
        <SFWifi size="xs" />
        <SFBattery100percent size="sm" />
      </span>
    </header>
  );
}

function dynamicActivity(segment: JourneySegment | null, now: number) {
  if (!segment) return { active: false, label: "" };
  if (segment.travelPlan?.mode !== "real") return { active: true, label: "模拟预览" };
  const phase = journeyPhase(segment, now);
  if (phase.tone === "complete") return { active: true, label: `${segment.destination.code} 已到达` };
  const operational = segment.operational;
  const departure = segment.travelPlan?.departureAt || operational?.actualDepartureAt
    || operational?.estimatedDepartureAt
    || operational?.scheduledDepartureAt;
  const arrival = segment.travelPlan?.arrivalAt || operational?.actualArrivalAt
    || operational?.estimatedArrivalAt
    || operational?.scheduledArrivalAt;
  const start = departure ? new Date(departure).getTime() : Number.NaN;
  const end = arrival ? new Date(arrival).getTime() : Number.NaN;
  if (Number.isFinite(start) && Number.isFinite(end)) {
    if (now >= end) return { active: true, label: `${segment.destination.code} ${operational?.actualArrivalAt ? "已到达" : "待确认到达"}` };
    if (now >= start) {
      const minutes = Math.max(0, Math.round((end - now) / 60_000));
      return { active: true, label: `${segment.destination.code} · ${minutes < 60 ? `${minutes} 分` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}` };
    }
    const minutes = Math.max(0, Math.round((start - now) / 60_000));
    if (minutes <= 24 * 60) {
      return { active: true, label: `${segment.service} · ${minutes < 60 ? `${minutes} 分` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}` };
    }
    return { active: false, label: "" };
  }
  if (segment.status === "active") return { active: true, label: `${segment.service} · 行程中` };
  return { active: false, label: "" };
}

function BottomBar({
  activeTab,
  chooseTab,
  onSearch,
}: {
  activeTab: Tab;
  chooseTab: (tab: Tab) => void;
  onSearch: () => void;
}) {
  return (
    <footer className="flight-tabbar">
      <nav aria-label="主要导航">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeTab === id ? "active" : ""}
            aria-current={activeTab === id ? "page" : undefined}
            aria-label={id === "community" ? "打开旅行社区" : label}
            onClick={() => chooseTab(id)}
          >
            <Icon size="lg" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button className="search-orb" aria-label="添加行程" onClick={onSearch}>
        <SFMagnifyingglass size="xl" />
      </button>
    </footer>
  );
}

function FriendsPanel({
  filter,
  setFilter,
  friends,
  onAdd,
  onRemove,
}: {
  filter: "Everyone" | "Today";
  setFilter: (value: "Everyone" | "Today") => void;
  friends: ReturnType<typeof makeFriend>[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const visible =
    filter === "Today"
      ? friends.filter((friend) => friend.flight.status !== "Scheduled")
      : friends;
  return (
    <div className="friends-body">
      <div className="friend-filters">
        <button
          className={filter === "Everyone" ? "active" : ""}
          onClick={() => setFilter("Everyone")}
        >
          全部
        </button>
        <button
          className={filter === "Today" ? "active" : ""}
          onClick={() => setFilter("Today")}
        >
          今天
        </button>
        <button className="add-friend-link" onClick={onAdd}>
          <SFPlusCircleFill size="sm" /> 添加同行人
        </button>
      </div>
      {!visible.length ? (
        <div className="empty-state">
          <SFPerson2Fill size="xl" aria-hidden="true" />
          <strong>
            {filter === "Today" ? "今天没有行程" : "添加同行人的行程"}
          </strong>
          <span>
            {filter === "Today"
              ? "接下来 24 小时很安静"
              : "同行目前为本地演示，邀请码不会连接真实共享服务"}
          </span>
          <button className="blue-button" onClick={onAdd}>添加同行人</button>
        </div>
      ) : (
        <div className="panel-scroll friend-list">
          {visible.map((friend) => (
            <article className="friend-card" key={friend.id}>
              <span
                className="friend-avatar"
                style={{ background: friend.color }}
              >
                {friend.initials}
              </span>
              <div>
                <strong>{friend.name}</strong>
                <small>
                  {friend.flight.number} · {friend.flight.from} →{" "}
                  {friend.flight.to}
                </small>
                <span>
                  {friend.flight.status === "On Time"
                    ? "准点"
                    : friend.flight.status === "Delayed"
                      ? "延误"
                      : friend.flight.status === "Landed"
                        ? "已抵达"
                        : "已计划"}{" "}
                  · {friend.flight.departure}
                </span>
              </div>
              <button
                aria-label={`移除 ${friend.name}`}
                onClick={() => onRemove(friend.id)}
              >
                <SFTrash size="sm" />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FlightSearchStep(props: {
  query: string;
  setQuery: (value: string) => void;
  mode: AddMode;
  setMode: (value: AddMode) => void;
  routeFrom: string;
  routeTo: string;
  routeDate: string;
  setRouteFrom: (value: string) => void;
  setRouteTo: (value: string) => void;
  setRouteDate: (value: string) => void;
  onClose: () => void;
  onAdd: (flight: Flight, verifiedSegment?: JourneySegment) => void;
  onCalendar: () => void;
  onRandom: () => void;
}) {
  const results = searchCatalog(props.query);
  const [flightDeparture, setFlightDeparture] = useState("09:00");
  const [verifiedFlight, setVerifiedFlight] = useState<Awaited<ReturnType<typeof lookupVerifiedFlight>> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const verifyFlight = async () => {
    const number = props.query.replace(/\s+/g, "").toUpperCase();
    if (!number) {
      setLookupError("请输入航班号，例如 CX548");
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    setVerifiedFlight(null);
    try {
      setVerifiedFlight(await lookupVerifiedFlight({
        number,
        date: props.routeDate,
        departure: flightDeparture,
      }));
    } catch (reason) {
      setLookupError(reason instanceof Error ? reason.message : "航班核验失败");
    } finally {
      setLookingUp(false);
    }
  };
  return (
    <section
      className="full-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="航班工具"
    >
      <SheetHeader
        title="航班工具"
        subtitle="输入航司、机场或航班号"
        onClose={props.onClose}
        back
      />
      <label className="sheet-search">
        <SFMagnifyingglass size="sm" />
        <input
          value={props.query}
          onChange={(event) => {
            props.setQuery(event.target.value);
            setVerifiedFlight(null);
            setLookupError(null);
          }}
          placeholder="国泰航空、HKG 或 CX123"
        />
      </label>
      {props.mode === "route" ? (
        <div className="route-builder">
          <label>
            <span>出发地</span>
            <select
              value={props.routeFrom}
              onChange={(event) => props.setRouteFrom(event.target.value)}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.code} — {airport.city}
                </option>
              ))}
            </select>
          </label>
          <SFArrowLeftArrowRight size="md" />
          <label>
            <span>目的地</span>
            <select
              value={props.routeTo}
              onChange={(event) => props.setRouteTo(event.target.value)}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.code} — {airport.city}
                </option>
              ))}
            </select>
          </label>
          <label className="route-date">
            <span>日期</span>
            <input
              type="date"
              value={props.routeDate}
              onChange={(event) => props.setRouteDate(event.target.value)}
            />
          </label>
          <button
            className="blue-button"
            disabled={props.routeFrom === props.routeTo}
            onClick={() =>
              props.onAdd(
                flightFromRoute(
                  props.routeFrom,
                  props.routeTo,
                  props.routeDate,
                ),
              )
            }
          >
            添加航线
          </button>
          <button
            className="text-button"
            onClick={() => props.setMode("suggested")}
          >
            返回推荐
          </button>
        </div>
      ) : (
        <div className="add-flight-scroll">
          <button
            className="add-row main-action"
            onClick={() => props.setMode("route")}
          >
            <SFArrowLeftArrowRight size="md" />
            <span>
              <strong>按航线查找</strong>
              <small>选择出发与到达机场</small>
            </span>
            <SFChevronRight size="sm" />
          </button>
          <button
            className="add-row main-action"
            onClick={() => props.setMode("number")}
          >
            <SFDocument size="md" />
            <span>
              <strong>按航班号查找</strong>
              <small>搜索任意航司的航班号</small>
            </span>
            <SFChevronRight size="sm" />
          </button>
          {props.mode === "number" && !props.query && (
            <p className="input-hint">
              输入航班号，例如 CX548。系统会先核验真实航线，再尝试连接 ADS-B 实时位置。
            </p>
          )}
          {props.mode === "number" && (
            <div className="verified-flight-fields">
              <label><span>出发日期</span><input type="date" value={props.routeDate} onChange={(event) => props.setRouteDate(event.target.value)} /></label>
              <label><span>计划时间</span><input type="time" value={flightDeparture} onChange={(event) => setFlightDeparture(event.target.value)} /></label>
            </div>
          )}
          {props.query && (
            <>
              <h3>搜索结果</h3>
              {results.length ? (
                results.map((result) => (
                  <button
                    className="add-row"
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      if (result.type === "flight") {
                        props.setMode("number");
                        props.setQuery(result.id);
                        setVerifiedFlight(null);
                        setLookupError(null);
                      }
                      else if (result.type === "airport") {
                        props.setRouteFrom(result.id);
                        props.setMode("route");
                      } else props.setQuery(result.id);
                    }}
                  >
                    <span className={`catalog-logo ${result.type}`}>
                      {result.type === "flight"
                        ? <SFAirplaneCircleFill size="sm" />
                        : result.type === "airport"
                          ? <SFLocationFill size="sm" />
                          : result.id.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                    </span>
                    <SFChevronRight size="sm" />
                  </button>
                ))
              ) : (
                <p className="input-hint">
                  本地目录没有记录。仍可通过公开航线数据库核验 {props.query.toUpperCase()}。
                </p>
              )}
              {props.mode === "number" && (
                <div className="verified-flight-action">
                  <button className="blue-button number-add" disabled={lookingUp} onClick={() => void verifyFlight()}>
                    {lookingUp ? "正在核验…" : `核验 ${props.query.toUpperCase()}`}
                  </button>
                  {lookupError && <p className="transport-lookup-error" role="alert">{lookupError}</p>}
                  {verifiedFlight && (
                    <section className="verified-transport-result">
                      <span className="verified-transport-icon"><SFAirplaneCircleFill size="md" /></span>
                      <span>
                        <small>{verifiedFlight.live ? "实时位置已连接" : "真实航线已核验"}</small>
                        <strong>{verifiedFlight.segment.origin.code} → {verifiedFlight.segment.destination.code}</strong>
                        <em>{verifiedFlight.flight.airline} · {verifiedFlight.flight.number}</em>
                      </span>
                      <button onClick={() => props.onAdd(verifiedFlight.flight, verifiedFlight.segment)}>添加</button>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
          {!props.query && (
            <>
              <h3>推荐</h3>
              {AIRLINES.slice(0, 2).map((airline) => (
                <button
                  className="add-row"
                  key={airline.code}
                  onClick={() => {
                    props.setMode("number");
                    props.setQuery(airline.code);
                  }}
                >
                  <span
                    className="catalog-logo airline"
                    style={{ color: airline.color }}
                  >
                    {airline.code.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{airline.name}</strong>
                    <small>
                      {airline.code} · {airline.icao}
                    </small>
                  </span>
                </button>
              ))}
              {AIRPORTS.slice(0, 2).map((airport) => (
                <button
                  className="add-row"
                  key={airport.code}
                  onClick={() => {
                    props.setRouteFrom(airport.code);
                    props.setMode("route");
                  }}
                >
                  <span className="catalog-logo airport">✹</span>
                  <span>
                    <strong>{airport.name}</strong>
                    <small>
                      {airport.code} · {airport.icao} · {airport.city}
                    </small>
                  </span>
                </button>
              ))}
              <h3>更多</h3>
              <button className="add-row" onClick={props.onCalendar}>
                <SFCalendarBadgePlus size="md" />
                <span>
                  <strong>从日历导入</strong>
                  <small>从 .ics 文件安全导入航班</small>
                </span>
              </button>
              <button className="add-row" onClick={props.onRandom}>
                <SFDiceFill size="md" />
                <span>
                  <strong>随机航班</strong>
                  <small>生成一段示例行程，体验完整功能</small>
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function WeatherSheet({
  value,
  basemap,
  onChange,
  onBasemapChange,
  onClose,
}: {
  value: WeatherMode;
  basemap: BasemapMode;
  onChange: (mode: WeatherMode) => void;
  onBasemapChange: (mode: BasemapMode) => void;
  onClose: () => void;
}) {
  const sheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .57, minimumHeight: 256 });
  return (
    <section
      className={`map-sheet weather-sheet ${sheet.dragging ? "is-dragging" : ""}`}
      {...sheet.sheetProps}
      style={{ "--sheet-height": `${sheet.fraction * 100}%` } as CSSProperties}
      role="dialog"
      aria-label="天气图层"
    >
      <SheetHeader
        title="天气图层"
        subtitle="查看全球降雨与降雪变化，天气图层会自动刷新。"
        onClose={onClose}
      />
      {(
        [
          { id: "us", title: "美国雷达", detail: "美国区域高清实时雷达" },
          {
            id: "global",
            title: "全球天气",
            detail: "当前全球综合天气雷达",
          },
          {
            id: "none",
            title: "关闭天气",
            detail: "仅显示所选地球底图",
          },
        ] as const
      ).map((item) => (
        <button
          className="weather-option"
          key={item.id}
          onClick={() => onChange(item.id)}
        >
          <span className={`weather-thumb ${item.id}`}>
            <SFGlobe size="lg" />
          </span>
          <span>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </span>
          <i className={value === item.id ? "selected" : ""}>
            {value === item.id && <SFCheckmarkCircleFill size="lg" />}
          </i>
        </button>
      ))}
      <section className="weather-map-layers" aria-labelledby="weather-map-layers-title">
        <header>
          <span>
            <strong id="weather-map-layers-title">地球图层</strong>
            <small>切换底图，不改变当前缩放与视角</small>
          </span>
          <em>{BASEMAP_OPTIONS.find((item) => item.id === basemap)?.label}</em>
        </header>
        <div className="weather-map-layer-options" role="radiogroup" aria-label="选择地球图层">
          {BASEMAP_OPTIONS.map((item) => (
            <button
              className={`weather-map-layer ${item.id} ${basemap === item.id ? "selected" : ""}`}
              key={item.id}
              role="radio"
              aria-checked={basemap === item.id}
              aria-label={`${item.label}图层`}
              onClick={() => onBasemapChange(item.id)}
            >
              <span><SFMapFill size="md" /></span>
              <strong>{item.label}</strong>
              {basemap === item.id && <SFCheckmarkCircleFill size="xs" />}
            </button>
          ))}
        </div>
      </section>
      <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">
        实时雷达数据由 RainViewer 提供
      </a>
    </section>
  );
}

function OnboardingSheet({
  step,
  name,
  setName,
  color,
  setColor,
  onClose,
  onContinue,
}: {
  step: Overlay;
  name: string;
  setName: (name: string) => void;
  color: string;
  setColor: (color: string) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const intro = step === "friends-intro" || step === "friends-ready";
  return (
    <section
      className="full-sheet onboarding-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="同行设置"
    >
      <button className="sheet-close" aria-label="关闭" onClick={onClose}>
        <SFXmark size="lg" />
      </button>
      <FriendGlobeArt
        compact={!intro}
        name={
          step === "profile-name" || step === "profile-avatar"
            ? name
            : undefined
        }
        color={color}
      />
      {intro ? (
        <>
          <div className="onboarding-copy">
            <h2>同行</h2>
            <p>
              添加家人和朋友后，会自动共享彼此的行程，在地图上看到对方的
              载具，并在起飞、到达或变更时收到实时更新。
            </p>
            <p>
              完全免费，再也不用手动把行程信息发给关心你的人。
            </p>
            <small>
              邀请码 48 小时后过期，且有使用次数限制。你可以随时移除同行人。
            </small>
          </div>
          <button
            className="blue-button onboarding-continue"
            onClick={onContinue}
          >
            继续
          </button>
        </>
      ) : step === "profile-name" ? (
        <>
          <div className="onboarding-copy">
            <h2>设置个人资料</h2>
            <p>
              填写你的名字和头像后继续。共享行程时，同行伙伴会看到它们。
            </p>
            <input
              className="profile-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="姓名"
            />
          </div>
          <button
            className="blue-button onboarding-continue"
            disabled={!name.trim()}
            onClick={onContinue}
          >
            继续
          </button>
        </>
      ) : (
        <>
          <div className="avatar-builder">
            <span className="avatar-preview" style={{ background: color }}>
              {initialsOf(name)}
            </span>
            <strong>{name || "我"}</strong>
            <div>
              {["#ec6f9a", "#58a6ff", "#8e7dff", "#38cfa0", "#ff9f4a"].map(
                (item) => (
                  <button
                    key={item}
                    aria-label={`使用 ${item} 头像颜色`}
                    className={color === item ? "active" : ""}
                    style={{ background: item }}
                    onClick={() => setColor(item)}
                  />
                ),
              )}
            </div>
            <small>
              <SFPencil size="xs" /> 自定义头像
            </small>
          </div>
          <button
            className="blue-button onboarding-continue"
            onClick={onContinue}
          >
            保存头像
          </button>
        </>
      )}
    </section>
  );
}

function FriendGlobeArt({
  compact,
  name,
  color,
}: {
  compact: boolean;
  name?: string;
  color: string;
}) {
  return (
    <div className={`friend-globe-art ${compact ? "compact" : ""}`}>
      <span className="orbit" />
      <span className="friend-bubble mom">
        妈妈<i>✈</i>
      </span>
      <span className="friend-bubble jenny">
        珍妮<i>✈</i>
      </span>
      <span className="friend-bubble you" style={{ background: color }}>
        {name ? initialsOf(name) : "我"}
        <i>✈</i>
      </span>
      <em>延误</em>
      <b>已到达</b>
    </div>
  );
}

function AddFriendSheet({
  code,
  setCode,
  onClose,
  onAdd,
}: {
  code: string;
  setCode: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <section
      className="full-sheet compact-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="添加同行人"
    >
      <SheetHeader
        title="添加同行人"
        subtitle="本地同行演示：输入示例邀请码，不会连接真实用户。"
        onClose={onClose}
      />
      <div className="add-friend-hero">
        <SFPersonBadgePlus size={74} />
        <h3>和在意的人，一起出发</h3>
        <p>当前为本地体验，真实共享尚未接入，不会发送或上传行程。</p>
      </div>
      <input
        className="friend-code-input"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="邀请码，例如 JENNY48"
      />
      <button
        className="blue-button"
        disabled={code.trim().length < 3}
        onClick={onAdd}
      >
        添加同行人
      </button>
    </section>
  );
}

function ProfileSheet({
  profile,
  name,
  setName,
  color,
  setColor,
  onClose,
  onSave,
  onReset,
  appearance,
  onAppearanceChange,
}: {
  profile: Profile | null;
  name: string;
  setName: (name: string) => void;
  color: string;
  setColor: (color: string) => void;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  appearance: AppearanceMode;
  onAppearanceChange: (mode: AppearanceMode) => void;
}) {
  return (
    <section
      className="full-sheet compact-sheet profile-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="个人资料"
    >
      <SheetHeader
        title="个人资料"
        subtitle={
          profile
            ? "资料保存在本机，不会上传或自动共享。"
            : "创建本地资料，体验同行功能。"
        }
        onClose={onClose}
      />
      <span className="avatar-preview" style={{ background: color }}>
        {initialsOf(name)}
      </span>
      <input
        className="friend-code-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="姓名"
      />
      <div className="avatar-colors">
        {["#ec6f9a", "#58a6ff", "#8e7dff", "#38cfa0", "#ff9f4a"].map((item) => (
          <button
            key={item}
            className={color === item ? "active" : ""}
            aria-label={`使用 ${item} 头像颜色`}
            style={{ background: item }}
            onClick={() => setColor(item)}
          />
        ))}
      </div>
      <section className="appearance-setting" aria-label="外观模式">
        <div>
          <strong>外观</strong>
          <small>深色、浅色或跟随系统</small>
        </div>
        <div className="appearance-picker" role="group" aria-label="选择外观模式">
          {(Object.keys(appearanceLabel) as AppearanceMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              className={appearance === mode ? "active" : ""}
              aria-pressed={appearance === mode}
              onClick={() => onAppearanceChange(mode)}
            >
              {appearanceLabel[mode]}
            </button>
          ))}
        </div>
      </section>
      <button className="blue-button" disabled={!name.trim()} onClick={onSave}>
        保存资料
      </button>
      <button className="reset-demo" onClick={onReset}>
        <SFTrash size="sm" /> 清除本地数据
      </button>
    </section>
  );
}

function profileFrom(name: string, color: string): Profile {
  return { name: name.trim() || "旅行者", color, initials: initialsOf(name) };
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1
      ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`
      : (parts[0]?.slice(0, 2) ?? "旅")
  ).toUpperCase();
}
