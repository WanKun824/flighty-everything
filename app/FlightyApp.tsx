"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ElementType,
} from "react";
import SFAirplaneArrival from "sf-symbols-lib/monochrome/SFAirplaneArrival";
import SFAirplaneCircleFill from "sf-symbols-lib/monochrome/SFAirplaneCircleFill";
import SFAirplaneDeparture from "sf-symbols-lib/monochrome/SFAirplaneDeparture";
import SFArrowLeftArrowRight from "sf-symbols-lib/monochrome/SFArrowLeftArrowRight";
import SFBookClosedFill from "sf-symbols-lib/monochrome/SFBookClosedFill";
import SFCalendarBadgePlus from "sf-symbols-lib/monochrome/SFCalendarBadgePlus";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFChevronDown from "sf-symbols-lib/monochrome/SFChevronDown";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFCloudFill from "sf-symbols-lib/monochrome/SFCloudFill";
import SFDiceFill from "sf-symbols-lib/monochrome/SFDiceFill";
import SFDocument from "sf-symbols-lib/monochrome/SFDocument";
import SFEllipsis from "sf-symbols-lib/monochrome/SFEllipsis";
import SFGlobe from "sf-symbols-lib/monochrome/SFGlobe";
import SFLine3Horizontal from "sf-symbols-lib/monochrome/SFLine3Horizontal";
import SFListBullet from "sf-symbols-lib/monochrome/SFListBullet";
import SFLocationFill from "sf-symbols-lib/monochrome/SFLocationFill";
import SFMapFill from "sf-symbols-lib/monochrome/SFMapFill";
import SFMagnifyingglass from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFPerson2Fill from "sf-symbols-lib/monochrome/SFPerson2Fill";
import SFPersonBadgePlus from "sf-symbols-lib/monochrome/SFPersonBadgePlus";
import SFPlusCircleFill from "sf-symbols-lib/monochrome/SFPlusCircleFill";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFStar from "sf-symbols-lib/monochrome/SFStar";
import SFStarFill from "sf-symbols-lib/monochrome/SFStarFill";
import SFTrash from "sf-symbols-lib/monochrome/SFTrash";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import FlightGlobe from "./FlightGlobe";
import {
  appearanceLabel,
  useAppearance,
  type AppearanceMode,
} from "./appearance";
import JourneyComposer from "./JourneyComposer";
import {
  MobileJourneyDetail,
  MobileJourneyPassport,
  MobileJourneysPanel,
} from "./MobileJourney";
import {
  AIRLINES,
  AIRPORTS,
  SAMPLE_FLIGHTS,
  airportByCode,
  calendarFlightNumbers,
  flightFromNumber,
  flightFromRoute,
  formatDuration,
  makeFriend,
  searchCatalog,
  statsForFlights,
  type Airport,
  type Flight,
  type Region,
} from "./flightyData";
import { segmentFromFlight } from "./journeyData";
import { useJourneyStore, type JourneyTrip } from "./journeyStorage";
import { useSheetDetents } from "./useSheetDetents";
import {
  useFlightyStore,
  type Profile,
  type WeatherMode,
} from "./flightyStorage";

type Tab = "flights" | "friends" | "passport";
type Overlay =
  | null
  | "add-flight"
  | "add-journey"
  | "airports"
  | "airport-detail"
  | "weather"
  | "flight-detail"
  | "journey-detail"
  | "journey-names"
  | "friends-intro"
  | "profile-name"
  | "profile-avatar"
  | "friends-ready"
  | "add-friend"
  | "profile"
  | "flight-stats"
  | "delay-stats"
  | "aircraft-stats";
type AddMode = "suggested" | "route" | "number";

const tabs: Array<{ id: Tab; label: string; icon: ElementType }> = [
  { id: "flights", label: "行程", icon: SFAirplaneCircleFill },
  { id: "friends", label: "同行", icon: SFPerson2Fill },
  { id: "passport", label: "旅迹", icon: SFBookClosedFill },
];

export default function FlightyApp({ onOpenCommunity }: { onOpenCommunity?: () => void } = {}) {
  return <MobileFlighty onOpenCommunity={onOpenCommunity} />;
}

function MobileFlighty({ onOpenCommunity }: { onOpenCommunity?: () => void }) {
  const store = useFlightyStore();
  const journeyStore = useJourneyStore();
  const appearance = useAppearance();
  const { state } = store;
  const [activeTab, setActiveTab] = useState<Tab>("flights");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [selectedFlight] = useState<Flight | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(
    null,
  );
  const [resetToken, setResetToken] = useState(0);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("suggested");
  const [routeFrom, setRouteFrom] = useState("HKG");
  const [routeTo, setRouteTo] = useState("NRT");
  const [routeDate, setRouteDate] = useState("2026-09-18");
  const [airportRegion, setAirportRegion] = useState<"All" | Region>("All");
  const [friendFilter, setFriendFilter] = useState<"Everyone" | "Today">(
    "Everyone",
  );
  const [friendCode, setFriendCode] = useState("");
  const [draftName, setDraftName] = useState("Vincent");
  const [draftCollectionName, setDraftCollectionName] = useState("我的行程");
  const [draftTripName, setDraftTripName] = useState("");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState("#ec6f9a");
  const [randomIndex, setRandomIndex] = useState(0);
  const mainSheet = useSheetDetents({
    detents: [0.31, 0.47, 0.82],
    initial: 0.47,
  });
  const calendarRef = useRef<HTMLInputElement>(null);
  const stats = useMemo(() => statsForFlights(state.flights), [state.flights]);
  const selectedJourney =
    journeyStore.state.segments.find(
      (segment) => segment.id === selectedJourneyId,
    ) ?? null;
  const currentTrip = journeyStore.state.trips.find(
    (trip) => trip.id === journeyStore.state.activeTripId,
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const chooseTab = (tab: Tab) => {
    if (tab === "friends" && !state.profile) {
      setOverlay("friends-intro");
      return;
    }
    setOverlay(null);
    setSelectedAirport(null);
    setActiveTab(tab);
  };

  const addFlight = (flight: Flight) => {
    store.addFlight(flight);
    journeyStore.addSegment(segmentFromFlight(flight));
    setActiveTab("flights");
    setOverlay(null);
    setQuery("");
    notify(`${flight.number} 已加入我的行程`);
  };

  const openAddJourney = () => setOverlay("add-journey");

  const openJourneyNames = (trip: JourneyTrip = currentTrip ?? journeyStore.state.trips[0]) => {
    if (!trip) return;
    setEditingTripId(trip.id);
    setDraftCollectionName(journeyStore.state.collectionName);
    setDraftTripName(trip.name);
    setOverlay("journey-names");
  };

  const openAirport = (code: string) => {
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
      if (navigator.share) await navigator.share({ title, text });
      else await navigator.clipboard.writeText(text);
      notify("分享内容已准备好");
    } catch {
      /* The native share sheet can be dismissed without an error state. */
    }
  };

  const importCalendar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const numbers = calendarFlightNumbers(await file.text());
    numbers.forEach((number) => {
      const flight = flightFromNumber(number);
      store.addFlight(flight);
      journeyStore.addSegment(segmentFromFlight(flight));
    });
    setOverlay(null);
    setActiveTab("flights");
    notify(
      numbers.length
        ? `已从日历导入 ${numbers.length} 个航班`
        : "日历中没有找到航班号",
    );
    event.target.value = "";
  };

  const title =
    activeTab === "flights"
      ? journeyStore.state.collectionName
      : activeTab === "friends"
        ? "同行"
        : "旅行护照";
  const initials = state.profile?.initials ?? "V";
  const profileColor = state.profile?.color ?? "#ec6f9a";
  const mapOverlayOpen = overlay === "airports" || overlay === "airport-detail";

  return (
    <main className="flighty-page" data-theme={appearance.resolved}>
      <section
        className="flighty-device"
        aria-label="flighty Everything flight tracker"
      >
        <FlightGlobe
          airportsVisible={mapOverlayOpen}
          selectedAirport={selectedAirport}
          weatherMode="none"
          resetToken={resetToken}
          journeySegments={journeyStore.state.segments}
          selectedJourneySegmentId={selectedJourneyId}
          onJourneySegmentSelect={(id) => {
            journeyStore.selectSegment(id);
            setSelectedJourneyId(id);
            setOverlay("journey-detail");
          }}
          onAirportSelect={openAirport}
          onWeatherError={(message) => notify(`${message}，已切换为卫星地图。`)}
          theme={appearance.resolved}
          followVehicle={followVehicle}
        />
        <StatusBar />

        {activeTab !== "passport" &&
          ![
            "add-flight",
            "flight-stats",
            "delay-stats",
            "aircraft-stats",
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
                aria-label="打开机场动态"
                onClick={() => {
                  setSelectedAirport(null);
                  setOverlay(overlay === "airports" ? null : "airports");
                }}
              >
                <SFMapFill size="md" />
              </button>
              <button
                className={followVehicle ? "active" : ""}
                aria-label="跟随载具视角"
                aria-pressed={followVehicle}
                onClick={() => setFollowVehicle((value) => !value)}
              >
                <SFLocationFill size="md" />
              </button>
            </div>
          )}

        <section
          className={`flight-panel has-sheet-handle ${mainSheet.dragging ? "is-dragging" : ""}`}
          style={{ "--sheet-height": `${mainSheet.fraction * 100}%` } as CSSProperties}
        >
          <button
            className="sheet-drag-handle"
            aria-label="拖动调整行程面板高度"
            {...mainSheet.handleProps}
          >
            <span />
          </button>
          <header className="panel-titlebar">
            <div className="panel-title-copy">
              <h1>{title}</h1>
              {activeTab === "flights" && <button aria-label="编辑我的行程名称" onClick={() => openJourneyNames()}><SFPencil size="xs" /></button>}
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
              <a
                className="round-button community-button"
                href="/community"
                aria-label="打开旅行社区"
                title="旅行社区"
                onClick={(event) => {
                  if (!onOpenCommunity) return;
                  event.preventDefault();
                  onOpenCommunity();
                }}
              >
                <SFGlobe size="md" />
              </a>
              <button
                className="round-button"
                aria-label={`Share ${title}`}
                onClick={() =>
                  void share(title, `My ${title} in flighty Everything`)
                }
              >
                <SFSquareAndArrowUp size="md" />
              </button>
              <button
                className="round-button profile-button avatar-letter"
                style={{ background: profileColor }}
                aria-label="打开个人资料"
                onClick={() => {
                  setDraftName(state.profile?.name ?? "Vincent");
                  setAvatarColor(profileColor);
                  setOverlay("profile");
                }}
              >
                {initials}
              </button>
            </div>
          </header>

          {activeTab === "flights" && (
            <MobileJourneysPanel
              tripName={journeyStore.state.tripName}
              segments={journeyStore.state.segments}
              onOpen={(segment) => {
                journeyStore.selectSegment(segment.id);
                setSelectedJourneyId(segment.id);
                setOverlay("journey-detail");
              }}
              onAdd={openAddJourney}
              onEditNames={() => openJourneyNames()}
              savedToPassport={Boolean(currentTrip?.savedToPassportAt)}
              onSaveToPassport={() => {
                journeyStore.saveCurrentTripToPassport();
                setActiveTab("passport");
                notify("已保存到旅迹");
              }}
            />
          )}
          {activeTab === "friends" && (
            <FriendsPanel
              filter={friendFilter}
              setFilter={setFriendFilter}
              friends={state.friends}
              onAdd={() => setOverlay("add-friend")}
              onRemove={store.removeFriend}
            />
          )}
          {activeTab === "passport" && (
            <MobileJourneyPassport
              trips={journeyStore.state.trips}
              activeTripId={journeyStore.state.activeTripId}
              onSelect={(id) => {
                journeyStore.selectTrip(id);
                setSelectedJourneyId(null);
              }}
              onEdit={(trip) => openJourneyNames(trip)}
            />
          )}

          <BottomBar
            activeTab={activeTab}
            chooseTab={chooseTab}
            onSearch={openAddJourney}
          />
        </section>

        {overlay === "add-flight" && (
          <AddFlightSheet
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
            onClose={() => setOverlay(null)}
            onAdd={addFlight}
            onCalendar={() => calendarRef.current?.click()}
            onRandom={() => {
              const flight = {
                ...SAMPLE_FLIGHTS[randomIndex % SAMPLE_FLIGHTS.length],
                id: `random-${Date.now()}`,
              };
              setRandomIndex((value) => value + 1);
              addFlight(flight);
            }}
          />
        )}
        {overlay === "add-journey" && (
          <JourneyComposer
            variant="mobile"
            tripName={journeyStore.state.tripName}
            initialOrigin={journeyStore.state.segments.at(-1)?.destination}
            onClose={() => setOverlay(null)}
            onAddMany={(segments, tripName) => {
              journeyStore.renameTrip(tripName);
              journeyStore.addSegments(segments);
              notify(`已加入 ${segments.length} 段行程`);
            }}
            onFlightTools={() => setOverlay("add-flight")}
          />
        )}
        {overlay === "journey-names" && (
          <JourneyNamesSheet
            collectionName={draftCollectionName}
            tripName={draftTripName}
            setCollectionName={setDraftCollectionName}
            setTripName={setDraftTripName}
            onClose={() => setOverlay(null)}
            onSave={() => {
              journeyStore.renameCollection(draftCollectionName);
              if (editingTripId) journeyStore.renameTripById(editingTripId, draftTripName);
              setOverlay(null);
              notify("行程名称已更新");
            }}
            onSaveToPassport={editingTripId === journeyStore.state.activeTripId ? () => {
              journeyStore.renameCollection(draftCollectionName);
              journeyStore.renameTrip(draftTripName);
              journeyStore.saveCurrentTripToPassport();
              setOverlay(null);
              setActiveTab("passport");
              notify("已保存到旅迹");
            } : undefined}
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
            onFavorite={store.toggleFavorite}
            onAirport={openAirport}
            onClose={() => setOverlay(null)}
            onShare={() =>
              void share(
                "Airports",
                "Live airport conditions in flighty Everything",
              )
            }
          />
        )}
        {overlay === "airport-detail" && selectedAirport && (
          <AirportDetailSheet
            airport={airportByCode(selectedAirport) ?? AIRPORTS[0]}
            favorite={state.favorites.includes(selectedAirport)}
            onFavorite={() => store.toggleFavorite(selectedAirport)}
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
            onChange={(value) => {
              store.setWeatherMode(value);
              setResetToken((token) => token + 1);
            }}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay === "flight-detail" && selectedFlight && (
          <FlightDetailSheet
            flight={selectedFlight}
            onClose={() => setOverlay(null)}
            onDelete={() => {
              store.removeFlight(selectedFlight.id);
              setOverlay(null);
              notify(`${selectedFlight.number} removed`);
            }}
          />
        )}
        {overlay === "journey-detail" && selectedJourney && (
          <MobileJourneyDetail
            segment={selectedJourney}
            onClose={() => setOverlay(null)}
            onToggleComplete={() =>
              journeyStore.toggleComplete(selectedJourney.id)
            }
            onDelete={() => {
              journeyStore.removeSegment(selectedJourney.id);
              setSelectedJourneyId(null);
              setOverlay(null);
              notify("已删除这段行程");
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
              notify(`${friend.name} 已开始与你共享行程`);
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
              notify("Profile updated");
            }}
            onReset={() => {
              store.reset();
              setOverlay(null);
              setActiveTab("flights");
              notify("Local demo data cleared");
            }}
            appearance={appearance.mode}
            onAppearanceChange={appearance.setMode}
          />
        )}

        {overlay === "flight-stats" && (
          <FlightStatsSheet stats={stats} onClose={() => setOverlay(null)} />
        )}
        {overlay === "delay-stats" && (
          <DelayStatsSheet stats={stats} onClose={() => setOverlay(null)} />
        )}
        {overlay === "aircraft-stats" && (
          <AircraftStatsSheet
            flights={state.flights}
            stats={stats}
            onClose={() => setOverlay(null)}
          />
        )}
        {toast && (
          <div className="flighty-toast" role="status">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}

function JourneyNamesSheet({
  collectionName,
  tripName,
  setCollectionName,
  setTripName,
  onClose,
  onSave,
  onSaveToPassport,
}: {
  collectionName: string;
  tripName: string;
  setCollectionName: (value: string) => void;
  setTripName: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onSaveToPassport?: () => void;
}) {
  const sheet = useSheetDetents({
    detents: [0.31, 0.5, 0.72],
    initial: 0.5,
    dismissible: true,
    onDismiss: onClose,
  });
  return (
    <section
      className={`map-sheet journey-names-sheet ${sheet.dragging ? "is-dragging" : ""}`}
      style={{ "--sheet-height": `${sheet.fraction * 100}%` } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="编辑行程名称"
    >
      <button className="sheet-drag-handle" aria-label="拖动调整名称面板高度" {...sheet.handleProps}><span /></button>
      <header><div><small>TRIP NAMES</small><h2>编辑行程名称</h2><p>上方是行程主页名称，下方是这一次旅行的名称。</p></div><button aria-label="关闭" onClick={onClose}><SFXmark size="sm" /></button></header>
      <label><span>我的行程名称</span><input value={collectionName} maxLength={32} onChange={(event) => setCollectionName(event.target.value)} /></label>
      <label><span>当前行程名称</span><input value={tripName} maxLength={48} onChange={(event) => setTripName(event.target.value)} /></label>
      <button className="journey-name-save" disabled={!collectionName.trim() || !tripName.trim()} onClick={onSave}>保存名称</button>
      {onSaveToPassport && <button className="journey-name-passport" disabled={!tripName.trim()} onClick={onSaveToPassport}><SFBookClosedFill size="xs" />保存到旅迹</button>}
    </section>
  );
}

function StatusBar() {
  return (
    <header className="ios-status" aria-hidden="true">
      <strong>10:57</strong>
      <span className="dynamic-island">
        <i />
      </span>
      <span className="status-signals">▮▮▮ ◓ ▰</span>
    </header>
  );
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
      <nav aria-label="Primary navigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeTab === id ? "active" : ""}
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

export function FlightsPanel({
  flights,
  onOpen,
  onAdd,
}: {
  flights: Flight[];
  onOpen: (flight: Flight) => void;
  onAdd: () => void;
}) {
  if (!flights.length)
    return (
      <button className="empty-state empty-button" onClick={onAdd}>
        <strong>Let’s Fly Somewhere</strong>
        <span>Tap Search to add your next flight</span>
      </button>
    );
  return (
    <div className="panel-scroll flight-list">
      <div className="timeline-label">UPCOMING</div>
      {flights.map((flight) => (
        <button
          className="flight-card"
          key={flight.id}
          onClick={() => onOpen(flight)}
        >
          <span
            className={`status-dot ${flight.status === "Delayed" ? "delayed" : ""}`}
          />
          <div className="flight-card-head">
            <span>
              <b>{flight.number}</b>
              <small>{flight.airline}</small>
            </span>
            <em>{flight.status}</em>
          </div>
          <div className="route-line">
            <strong>{flight.from}</strong>
            <i />
            <SFAirplaneCircleFill size="md" />
            <i />
            <strong>{flight.to}</strong>
          </div>
          <div className="flight-times">
            <span>
              {flight.departure}
              <small>{airportByCode(flight.from)?.city}</small>
            </span>
            <b>{formatDuration(flight.durationMinutes)}</b>
            <span>
              {flight.arrival}
              <small>{airportByCode(flight.to)?.city}</small>
            </span>
          </div>
          <footer>
            <span>{flight.date}</span>
            <SFChevronRight size="xs" />
          </footer>
        </button>
      ))}
    </div>
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
          <strong>
            {filter === "Today" ? "今天没有行程" : "添加同行人的行程"}
          </strong>
          <span>
            {filter === "Today"
              ? "接下来 24 小时很安静"
              : "输入邀请码后，就能自动看到对方共享的行程"}
          </span>
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

export function PassportPanel({
  flights,
  stats,
  onStats,
}: {
  flights: Flight[];
  stats: ReturnType<typeof statsForFlights>;
  onStats: (overlay: Overlay) => void;
}) {
  const [sort, setSort] = useState<"Date" | "Airline">("Date");
  const rows = [...flights].sort((a, b) =>
    sort === "Airline"
      ? a.airline.localeCompare(b.airline)
      : b.date.localeCompare(a.date),
  );
  return (
    <div className="passport-scroll">
      <span className="time-pill">All-Time</span>
      <section className="passport-card">
        <div>
          <small>ALL-TIME FLIGHT PASSPORT</small>
          <b>{stats.flights}</b>
          <span>FLIGHTS</span>
        </div>
        <div>
          <b>{stats.distanceKm.toLocaleString()} km</b>
          <span>DISTANCE</span>
        </div>
        <div>
          <b>{formatDuration(stats.totalMinutes)}</b>
          <span>FLIGHT TIME</span>
        </div>
        <div>
          <b>{stats.airports}</b>
          <span>AIRPORTS</span>
        </div>
        <button onClick={() => onStats("flight-stats")}>
          All Flight Stats <SFChevronRight size="sm" />
        </button>
      </section>
      <section className="delay-card">
        <SFAirplaneArrival size="xl" />
        <div>
          <b>{stats.delayMinutes}</b>
          <strong>minutes lost from delays</strong>
          <span>Delayed flights averaged {stats.averageDelay}m late</span>
        </div>
        <button onClick={() => onStats("delay-stats")}>
          All Delay Stats <SFChevronRight size="sm" />
        </button>
      </section>
      <section className="aircraft-card">
        <SFAirplaneCircleFill size={94} />
        <div>
          <strong>Most flown aircraft</strong>
          <b>{stats.mostFlownAircraft}</b>
          <span>
            {flights.length
              ? `${stats.flights} tracked flight${stats.flights === 1 ? "" : "s"}`
              : "No flights with a real plane yet."}
          </span>
        </div>
        <button onClick={() => onStats("aircraft-stats")}>
          All Aircraft Stats <SFChevronRight size="sm" />
        </button>
      </section>
      <button className="pro-card">
        <span>
          <b>PRO</b> Complete Your Map & Stats
        </span>
        <small>Upgrade to add flights older than 12 months.</small>
        <SFChevronRight size="sm" />
      </button>
      <section className="past-flights">
        <header>
          <h2>Past Flights</h2>
          <span>
            <button className="active">
              <SFLine3Horizontal size="sm" />
            </button>
            <button>
              <SFListBullet size="sm" />
            </button>
          </span>
        </header>
        <div className="sort-row">
          <button
            className={sort === "Date" ? "active" : ""}
            onClick={() => setSort("Date")}
          >
            Date ↓
          </button>
          <button>From</button>
          <button>To</button>
          <button
            className={sort === "Airline" ? "active" : ""}
            onClick={() => setSort("Airline")}
          >
            Airline ↑
          </button>
        </div>
        {rows.length ? (
          rows.map((flight) => (
            <div className="past-flight-row" key={flight.id}>
              <span>{flight.date}</span>
              <b>{flight.from}</b>
              <i>→</i>
              <b>{flight.to}</b>
              <small>{flight.airline}</small>
            </div>
          ))
        ) : (
          <p>No past flights yet. Added flights will appear here.</p>
        )}
      </section>
    </div>
  );
}

function AddFlightSheet(props: {
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
  onAdd: (flight: Flight) => void;
  onCalendar: () => void;
  onRandom: () => void;
}) {
  const results = searchCatalog(props.query);
  return (
    <section
      className="full-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Add Flight"
    >
      <SheetHeader
        title="Add Flight"
        subtitle="Enter airline, airport, or flight"
        onClose={props.onClose}
      />
      <label className="sheet-search">
        <SFMagnifyingglass size="sm" />
        <input
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="Cathay Pacific, HKG, or CX123"
        />
      </label>
      {props.mode === "route" ? (
        <div className="route-builder">
          <label>
            <span>FROM</span>
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
            <span>TO</span>
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
            <span>DATE</span>
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
            Add Route
          </button>
          <button
            className="text-button"
            onClick={() => props.setMode("suggested")}
          >
            Back to suggestions
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
              <strong>Find by Route</strong>
              <small>Choose departure and arrival airports</small>
            </span>
            <SFChevronRight size="sm" />
          </button>
          <button
            className="add-row main-action"
            onClick={() => props.setMode("number")}
          >
            <SFDocument size="md" />
            <span>
              <strong>Find by Flight Number</strong>
              <small>Search any airline flight code</small>
            </span>
            <SFChevronRight size="sm" />
          </button>
          {props.mode === "number" && !props.query && (
            <p className="input-hint">
              Type a flight number above, such as CX520.
            </p>
          )}
          {props.query && (
            <>
              <h3>RESULTS</h3>
              {results.length ? (
                results.map((result) => (
                  <button
                    className="add-row"
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      if (result.type === "flight")
                        props.onAdd(flightFromNumber(result.id));
                      else if (result.type === "airport") {
                        props.setRouteFrom(result.id);
                        props.setMode("route");
                      } else props.setQuery(result.id);
                    }}
                  >
                    <span className={`catalog-logo ${result.type}`}>
                      {result.type === "flight"
                        ? "✈"
                        : result.type === "airport"
                          ? "●"
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
                  No exact match. Press “Add {props.query.toUpperCase()}” to
                  create a tracked flight.
                </p>
              )}
              {props.mode === "number" && (
                <button
                  className="blue-button number-add"
                  onClick={() => props.onAdd(flightFromNumber(props.query))}
                >
                  Add {props.query.toUpperCase()}
                </button>
              )}
            </>
          )}
          {!props.query && (
            <>
              <h3>SUGGESTED</h3>
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
              <h3>MORE</h3>
              <button className="add-row" onClick={props.onCalendar}>
                <SFCalendarBadgePlus size="md" />
                <span>
                  <strong>Sync from Calendar</strong>
                  <small>Import flights securely from an .ics file</small>
                </span>
              </button>
              <button className="add-row" onClick={props.onRandom}>
                <SFDiceFill size="md" />
                <span>
                  <strong>Random Flight</strong>
                  <small>Try flighty Everything for free</small>
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AirportsSheet({
  region,
  setRegion,
  favorites,
  onFavorite,
  onAirport,
  onClose,
  onShare,
}: {
  region: "All" | Region;
  setRegion: (region: "All" | Region) => void;
  favorites: string[];
  onFavorite: (code: string) => void;
  onAirport: (code: string) => void;
  onClose: () => void;
  onShare: () => void;
}) {
  const filtered = AIRPORTS.filter(
    (airport) => region === "All" || airport.region === region,
  );
  return (
    <section
      className="map-sheet airports-sheet"
      role="dialog"
      aria-label="Airports"
    >
      <SheetHeader title="Airports" onClose={onClose} onShare={onShare} />
      <div className="region-tabs">
        <button>
          Now <SFChevronDown size="xs" />
        </button>
        {(["All", "Asia", "North America", "Europe"] as const).map((item) => (
          <button
            key={item}
            className={region === item ? "active" : ""}
            onClick={() => setRegion(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="airport-intro">
        <strong>For You</strong>
        <span>Favorites and airports from your active flights</span>
        <small>
          {favorites.length
            ? `${favorites.length} favorite airport${favorites.length === 1 ? "" : "s"}`
            : "No Favorites — Tap ★ in an airport to favorite"}
        </small>
      </div>
      <h3>Major Issues</h3>
      <div className="map-sheet-scroll">
        {filtered.map((airport) => (
          <article className="airport-row" key={airport.code}>
            <button
              className="airport-main"
              onClick={() => onAirport(airport.code)}
            >
              <span
                className={`airport-signal ${airport.issue ? "issue" : ""}`}
              />
              <div>
                <strong>{airport.name}</strong>
                <em>{airport.issue ?? "Operations Normal"}</em>
                <div className="airport-metrics">
                  <span>
                    <small>ON TIME</small>
                    <b>↗ {airport.departureOnTime}%</b>
                    <b>↘ {airport.arrivalOnTime}%</b>
                  </span>
                  <span>
                    <small>AVG. DELAY</small>
                    <b>{airport.departureDelay}m</b>
                    <b>{airport.arrivalDelay}m</b>
                  </span>
                  <span>
                    <small>CANCELLED</small>
                    <b>{airport.cancelled}%</b>
                    <b>{airport.cancelled}%</b>
                  </span>
                </div>
              </div>
            </button>
            <button
              className="favorite-button"
              aria-label={`Favorite ${airport.name}`}
              onClick={() => onFavorite(airport.code)}
            >
              {favorites.includes(airport.code) ? (
                <SFStarFill size="sm" />
              ) : (
                <SFStar size="sm" />
              )}
            </button>
            <small className="airport-code">{airport.code}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function AirportDetailSheet({
  airport,
  favorite,
  onFavorite,
  onBack,
}: {
  airport: Airport;
  favorite: boolean;
  onFavorite: () => void;
  onBack: () => void;
}) {
  return (
    <section
      className="map-sheet airport-detail-sheet"
      role="dialog"
      aria-label={`${airport.name} details`}
    >
      <div className="airport-tags">
        <span>{airport.code}</span>
        <span>{airport.icao}</span>
        <span>10:57 PM GMT+8</span>
      </div>
      <SheetHeader
        title={airport.name}
        subtitle={`${airport.flag} ${airport.city.toUpperCase()}, ${airport.country.toUpperCase()}`}
        onClose={onBack}
      />
      <button
        className="detail-favorite"
        aria-label="Toggle airport favorite"
        onClick={onFavorite}
      >
        {favorite ? <SFStarFill size="sm" /> : <SFStar size="sm" />}
      </button>
      <section className={`issue-card ${airport.issue ? "" : "normal"}`}>
        <header>
          <span className="airport-signal issue" />
          <h3>{airport.issue ? "Major Issues" : "Operations Normal"}</h3>
        </header>
        <div>
          <SFAirplaneDeparture size="lg" />
          <span>
            <strong>Departures</strong>
            <p>
              Flights are taking off {airport.departureDelay}m late on average.
            </p>
          </span>
        </div>
        <div>
          <SFAirplaneArrival size="lg" />
          <span>
            <strong>Arrivals</strong>
            <p>Flights are landing {airport.arrivalDelay}m late on average.</p>
          </span>
        </div>
        <div>
          <SFCloudFill size="lg" />
          <span>
            <strong>Weather</strong>
            <p>
              {airport.issueDetail ??
                "Good operating conditions around the field."}
            </p>
          </span>
        </div>
        <button>
          View Full Operational Report <SFChevronRight size="xs" />
        </button>
      </section>
      <div className="airport-performance">
        <span>
          <b>{airport.departureOnTime}%</b>
          <small>departures on time</small>
        </span>
        <span>
          <b>{airport.arrivalOnTime}%</b>
          <small>arrivals on time</small>
        </span>
      </div>
    </section>
  );
}

function WeatherSheet({
  value,
  onChange,
  onClose,
}: {
  value: WeatherMode;
  onChange: (mode: WeatherMode) => void;
  onClose: () => void;
}) {
  return (
    <section
      className="map-sheet weather-sheet"
      role="dialog"
      aria-label="Weather Layers"
    >
      <SheetHeader
        title="Weather Layers"
        subtitle="See what’s coming. All layers automatically refresh, support snow, and work on all maps."
        onClose={onClose}
      />
      <button className="pro-weather">
        <span>✓ PRO</span>
        <b>
          Enjoying complimentary access?
          <br />
          Upgrade to flighty Pro now.
        </b>
        <SFChevronRight size="sm" />
      </button>
      {(
        [
          { id: "us", title: "US Radar", detail: "Real-time radar in HD" },
          {
            id: "global",
            title: "Global Estimate",
            detail: "Current worldwide composite radar",
          },
          {
            id: "none",
            title: "None",
            detail: "Satellite map without weather",
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
      <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">
        Live radar data by RainViewer
      </a>
    </section>
  );
}

function FlightDetailSheet({
  flight,
  onClose,
  onDelete,
}: {
  flight: Flight;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <section
      className="map-sheet flight-detail-sheet"
      role="dialog"
      aria-label={`${flight.number} details`}
    >
      <SheetHeader
        title={flight.number}
        subtitle={`${flight.airline} · ${flight.date}`}
        onClose={onClose}
      />
      <span
        className={`flight-status-pill ${flight.status === "Delayed" ? "delayed" : ""}`}
      >
        {flight.status}
      </span>
      <div className="detail-route">
        <span>
          <b>{flight.departure}</b>
          <strong>{flight.from}</strong>
          <small>{airportByCode(flight.from)?.name}</small>
        </span>
        <i />
        <SFAirplaneCircleFill size="xl" />
        <i />
        <span>
          <b>{flight.arrival}</b>
          <strong>{flight.to}</strong>
          <small>{airportByCode(flight.to)?.name}</small>
        </span>
      </div>
      <div className="detail-grid">
        <span>
          <small>DURATION</small>
          <b>{formatDuration(flight.durationMinutes)}</b>
        </span>
        <span>
          <small>DISTANCE</small>
          <b>{flight.distanceKm.toLocaleString()} km</b>
        </span>
        <span>
          <small>AIRCRAFT</small>
          <b>{flight.aircraftFamily}</b>
        </span>
        <span>
          <small>SEAT</small>
          <b>
            {flight.seatClass} · {flight.seat}
          </b>
        </span>
      </div>
      <button className="delete-flight" onClick={onDelete}>
        <SFTrash size="sm" /> Remove Flight
      </button>
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
      aria-label="Flighty Friends setup"
    >
      <button className="sheet-close" aria-label="Close" onClick={onClose}>
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
            <h2>Flighty Friends</h2>
            <p>
              Add friends and family to automatically share upcoming flights,
              see each other fly on the map, and get live updates when flights
              take off, land, or change.
            </p>
            <p>
              It’s free, and saves you from ever hearing “Send me your flight
              info!” again.
            </p>
            <small>
              Invites expire after 48 hours and can only be used a limited
              number of times. You can remove friends at any time.
            </small>
          </div>
          <button
            className="blue-button onboarding-continue"
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      ) : step === "profile-name" ? (
        <>
          <div className="onboarding-copy">
            <h2>Set Up Your Profile</h2>
            <p>
              Add your name and photo to continue. Your friends will see this
              when you share flights.
            </p>
            <input
              className="profile-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full Name"
            />
          </div>
          <button
            className="blue-button onboarding-continue"
            disabled={!name.trim()}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <div className="avatar-builder">
            <span className="avatar-preview" style={{ background: color }}>
              {initialsOf(name)}
            </span>
            <strong>{name || "You"}</strong>
            <div>
              {["#ec6f9a", "#58a6ff", "#8e7dff", "#38cfa0", "#ff9f4a"].map(
                (item) => (
                  <button
                    key={item}
                    aria-label={`Use ${item} avatar color`}
                    className={color === item ? "active" : ""}
                    style={{ background: item }}
                    onClick={() => setColor(item)}
                  />
                ),
              )}
            </div>
            <small>
              <SFPencil size="xs" /> Customize Avatar
            </small>
          </div>
          <button
            className="blue-button onboarding-continue"
            onClick={onContinue}
          >
            Save Avatar
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
        MOM<i>✈</i>
      </span>
      <span className="friend-bubble jenny">
        JENNY<i>✈</i>
      </span>
      <span className="friend-bubble you" style={{ background: color }}>
        {name ? initialsOf(name) : "MIKE"}
        <i>✈</i>
      </span>
      <em>DELAYED</em>
      <b>LANDED</b>
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
        subtitle="输入邀请码，即可自动共享彼此的行程。"
        onClose={onClose}
      />
      <div className="add-friend-hero">
        <SFPersonBadgePlus size={74} />
        <h3>同行信息，自动更新</h3>
        <p>对方始终掌控自己的信息，也可以随时停止共享。</p>
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
      aria-label="Profile"
    >
      <SheetHeader
        title="Your Profile"
        subtitle={
          profile
            ? "Visible to friends you share flights with."
            : "Create a profile to use Flighty Friends."
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
        placeholder="Full Name"
      />
      <div className="avatar-colors">
        {["#ec6f9a", "#58a6ff", "#8e7dff", "#38cfa0", "#ff9f4a"].map((item) => (
          <button
            key={item}
            className={color === item ? "active" : ""}
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
        Save Profile
      </button>
      <button className="reset-demo" onClick={onReset}>
        <SFTrash size="sm" /> Clear local demo data
      </button>
    </section>
  );
}

function FlightStatsSheet({
  stats,
  onClose,
}: {
  stats: ReturnType<typeof statsForFlights>;
  onClose: () => void;
}) {
  return (
    <section className="stats-sheet" role="dialog" aria-label="Flight Stats">
      <StatsHeader title="Flight Stats" onClose={onClose} />
      <span className="time-pill">ALL-TIME</span>
      <div className="blueprint-hero">
        <SFAirplaneCircleFill size={90} />
        <b>{stats.flights}</b>
        <span>flights tracked</span>
      </div>
      <div className="stats-content">
        <h2>All-Time Flight Passport</h2>
        <div className="stats-grid">
          <span>
            <b>{stats.distanceKm.toLocaleString()}</b>
            <small>kilometres</small>
          </span>
          <span>
            <b>{formatDuration(stats.totalMinutes)}</b>
            <small>in the air</small>
          </span>
          <span>
            <b>{stats.airports}</b>
            <small>airports</small>
          </span>
          <span>
            <b>{stats.airlines}</b>
            <small>airlines</small>
          </span>
        </div>
        <h3>Travel Footprint</h3>
        <p>
          Your passport updates instantly whenever a flight is added, imported,
          or removed.
        </p>
      </div>
    </section>
  );
}

function DelayStatsSheet({
  stats,
  onClose,
}: {
  stats: ReturnType<typeof statsForFlights>;
  onClose: () => void;
}) {
  return (
    <section
      className="stats-sheet delay-stats-sheet"
      role="dialog"
      aria-label="Delay Report"
    >
      <StatsHeader title="Delay Report" onClose={onClose} />
      <span className="time-pill">ALL-TIME</span>
      <div className="delay-report">
        <header>
          <SFAirplaneArrival size="lg" />
          <b>flighty</b>
          <strong>All-Time Delay Report</strong>
        </header>
        <b className="delay-percent">{stats.delayPercent}%</b>
        <h2>My flights delayed</h2>
        <p>
          {stats.delayedFlights} of my {stats.flights} flights arrived later
          than scheduled
        </p>
        <div className="flip-minutes">
          {String(stats.delayMinutes)
            .padStart(5, "0MIN-")
            .slice(-5)
            .split("")
            .map((character, index) => (
              <span key={`${character}-${index}`}>{character}</span>
            ))}
        </div>
        <h2>Lost to Delays</h2>
        <p>Delayed flights averaged {stats.averageDelay}m late</p>
        <h2>Worst Delay</h2>
        <strong className="worst-delay">
          {stats.delayMinutes
            ? `${Math.max(...[stats.averageDelay, stats.delayMinutes])} MINUTES`
            : "NONE"}
        </strong>
      </div>
    </section>
  );
}

function AircraftStatsSheet({
  flights,
  stats,
  onClose,
}: {
  flights: Flight[];
  stats: ReturnType<typeof statsForFlights>;
  onClose: () => void;
}) {
  const classes = [
    "Economy",
    "Premium Economy",
    "Business",
    "First Class",
  ] as const;
  return (
    <section
      className="stats-sheet aircraft-stats-sheet"
      role="dialog"
      aria-label="Aircraft Stats"
    >
      <StatsHeader title="Aircraft Stats" onClose={onClose} />
      <span className="time-pill">ALL-TIME</span>
      <div className="aircraft-blueprint">
        <SFAirplaneCircleFill size={94} />
        <strong>{stats.mostFlownAircraft}</strong>
      </div>
      <div className="stats-content aircraft-content">
        <h2>Aircraft Types</h2>
        <b className="big-total">
          {stats.aircraft}
          <span> total aircraft</span>
        </b>
        <p>Including sub-type variants according to ICAO</p>
        <div className="metric-tabs">
          <button className="active">Flights</button>
          <button>Time</button>
          <button>Distance</button>
        </div>
        <h2>Class and Seat</h2>
        {classes.map((seatClass, index) => {
          const count = flights.filter(
            (flight) => flight.seatClass === seatClass,
          ).length;
          return (
            <div className="class-row" key={seatClass}>
              <i
                style={{
                  background: ["#9cdcff", "#5dc8ef", "#169ed6", "#2769dc"][
                    index
                  ],
                }}
              />
              <span>{seatClass}</span>
              <b>{count}</b>
              <small>
                {flights.length
                  ? Math.round((count / flights.length) * 100)
                  : 0}
                %
              </small>
            </div>
          );
        })}
        <h2>Most Frequent Tails</h2>
        <b className="big-total small">{flights[0]?.aircraft ?? "None"}</b>
        <p>
          {flights.length
            ? "Most frequently logged aircraft registration"
            : "No repeat planes yet."}
        </p>
      </div>
    </section>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
  onShare,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onShare?: () => void;
}) {
  return (
    <header className="sheet-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <span>
        {onShare && (
          <button aria-label="分享" onClick={onShare}>
            <SFSquareAndArrowUp size="md" />
          </button>
        )}
        <button aria-label="关闭" onClick={onClose}>
          <SFXmark size="md" />
        </button>
      </span>
    </header>
  );
}

function StatsHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <header className="stats-header">
      <button aria-label="Close" onClick={onClose}>
        <SFXmark size="lg" />
      </button>
      <h1>{title}</h1>
      <button aria-label="Share">
        <SFSquareAndArrowUp size="md" />
      </button>
    </header>
  );
}

function profileFrom(name: string, color: string): Profile {
  return { name: name.trim() || "Vincent", color, initials: initialsOf(name) };
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1
      ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`
      : (parts[0]?.slice(0, 2) ?? "V")
  ).toUpperCase();
}
