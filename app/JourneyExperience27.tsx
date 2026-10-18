"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import SFArrowDownLeftAndArrowUpRight from "sf-symbols-lib/monochrome/SFArrowDownLeftAndArrowUpRight";
import SFGlobeAsiaAustraliaFill from "sf-symbols-lib/monochrome/SFGlobeAsiaAustraliaFill";
import SFLocationNorthFill from "sf-symbols-lib/monochrome/SFLocationNorthFill";
import SFMapFill from "sf-symbols-lib/monochrome/SFMapFill";
import SFMoonStarsFill from "sf-symbols-lib/monochrome/SFMoonStarsFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFSliderHorizontal3 from "sf-symbols-lib/monochrome/SFSliderHorizontal3";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFSunMaxFill from "sf-symbols-lib/monochrome/SFSunMaxFill";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import { useAppearance } from "./appearance";
import {
  FALLBACK_COMMUNITY,
  cloneCommunityJourney,
  communityJourneyHref,
  fetchCommunityJourneys,
  likeCommunityJourney,
  publishCommunityJourney,
  type CommunityJourney,
} from "./communityData";
import FlightGlobe, { BASEMAP_OPTIONS, type BasemapMode } from "./FlightGlobe";
import { AnimationControls, JourneyCard, PublishDialog } from "./JourneyCommunityUI";
import JourneyComposer, { JourneyModeIcon } from "./JourneyComposer";
import { TripManagerDialog, TripPassportStrip } from "./JourneyPassportUI";
import { MODE_META, type JourneySegment } from "./journeyData";
import { useJourneyPreferences } from "./journeyPreferences";
import { useJourneyStore } from "./journeyStorage";
import type { RoadTrafficRoute } from "./roadTraffic";

type Surface = "mine" | "discover";

export default function JourneyExperience27({ onHome, onOpenCommunity }: {
  onHome?: () => void;
  onOpenCommunity?: (journey: CommunityJourney) => void;
} = {}) {
  const store = useJourneyStore();
  const { state } = store;
  const appearance = useAppearance();
  const { preferences, update: updatePreferences, reset: resetPreferences } = useJourneyPreferences();
  const [surface, setSurface] = useState<Surface>("discover");
  const [immersive, setImmersive] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [tripManagerOpen, setTripManagerOpen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapMode>("standard");
  const [followVehicle, setFollowVehicle] = useState(false);
  const [roadTraffic, setRoadTraffic] = useState<Record<string, RoadTrafficRoute>>({});
  const [publishOpen, setPublishOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityJourney[]>(FALLBACK_COMMUNITY);
  const [communityStatus, setCommunityStatus] = useState<"loading" | "live" | "offline">("loading");
  const [selectedCommunityId, setSelectedCommunityId] = useState(FALLBACK_COMMUNITY[0].communityId);
  const [likedIds, setLikedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchCommunityJourneys().then((journeys) => {
      if (cancelled) return;
      const next = journeys.length ? journeys : FALLBACK_COMMUNITY;
      setCommunity(next);
      setSelectedCommunityId((current) => next.some((item) => item.communityId === current) ? current : next[0].communityId);
      setCommunityStatus("live");
    }).catch(() => {
      if (!cancelled) setCommunityStatus("offline");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => { if (!document.fullscreenElement) setImmersive(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setImmersive(false); };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectedMine = state.segments.find((item) => item.id === state.selectedSegmentId) ?? state.segments[0];
  const activeTrip = state.trips.find((item) => item.id === state.activeTripId) ?? state.trips[0];
  const selectedCommunity = community.find((item) => item.communityId === selectedCommunityId) ?? community[0];
  const selected = surface === "mine" ? selectedMine : selectedCommunity;
  const mapSegments = useMemo(() => surface === "mine" ? state.segments : community, [surface, state.segments, community]);
  const selectedMapId = surface === "mine" ? selectedMine?.id : selectedCommunity?.id;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const shareJourney = async () => {
    if (!selected) return;
    const url = selectedCommunity && surface === "discover" && !selectedCommunity.communityId.startsWith("fallback-")
      ? communityJourneyHref(selectedCommunity.communityId, window.location.origin)
      : window.location.origin;
    const text = `${selected.title} · ${MODE_META[selected.mode].label} · ${selected.origin.name} → ${selected.destination.name}`;
    try {
      if (navigator.share) await navigator.share({ title: selected.title, text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
      notify("分享内容已准备好");
    } catch { /* Native share sheets may be dismissed. */ }
  };

  const enterImmersive = async () => {
    setControlsOpen(false);
    setImmersive(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch { /* iOS keeps the chrome-free layout without browser fullscreen. */ }
  };

  const publish = async (segment: JourneySegment, creatorName: string, caption: string) => {
    const published = await publishCommunityJourney(segment, creatorName, caption);
    setCommunity((current) => [published, ...current.filter((item) => item.communityId !== published.communityId)]);
    setSelectedCommunityId(published.communityId);
    setSurface("discover");
    setPublishOpen(false);
    notify("行程已发布，其他人现在可以查看");
  };

  const like = async (journey: CommunityJourney) => {
    if (likedIds.includes(journey.communityId)) return;
    setLikedIds((current) => [...current, journey.communityId]);
    setCommunity((current) => current.map((item) => item.communityId === journey.communityId ? { ...item, likes: item.likes + 1 } : item));
    if (journey.communityId.startsWith("fallback-")) return;
    try {
      const updated = await likeCommunityJourney(journey.communityId);
      setCommunity((current) => current.map((item) => item.communityId === updated.communityId ? updated : item));
    } catch { notify("点赞已保留，联网后可再次同步"); }
  };

  const saveCommunity = (journey: CommunityJourney) => {
    store.addSegment(cloneCommunityJourney(journey));
    setSurface("mine");
    notify("已保存到我的行程");
  };

  return (
    <main id="top" className={`journey-experience journey-27 ${immersive ? "is-immersive" : ""}`}>
      <section className="journey-map-canvas" aria-label="3D 实时行程地图">
        <FlightGlobe
          airportsVisible={false}
          selectedAirport={null}
          weatherMode="none"
          resetToken={resetToken}
          journeySegments={mapSegments}
          selectedJourneySegmentId={selectedMapId ?? null}
          vehicleScale={preferences.vehicleScale}
          animationSpeed={preferences.animationSpeed}
          motionEnabled={preferences.motionEnabled}
          theme={appearance.resolved}
          basemap={basemap}
          followVehicle={followVehicle}
          onRoadTrafficChange={setRoadTraffic}
          onJourneySegmentSelect={(id) => {
            if (surface === "mine") store.selectSegment(id);
            else {
              const journey = community.find((item) => item.id === id);
              if (journey) setSelectedCommunityId(journey.communityId);
            }
          }}
          onAirportSelect={() => undefined}
          onWeatherError={() => notify("天气图层暂不可用，已保留地图")}
        />
      </section>

      <header className="journey-glass-bar liquid-glass-control">
        <a className="journey-wordmark" href="#top" aria-label="fly everything 首页" onClick={(event) => {
          event.preventDefault();
          if (onHome) onHome();
          else window.location.assign("/");
        }}><span><SFGlobeAsiaAustraliaFill size="sm" /></span><b>fly</b><em>everything</em></a>
        <nav aria-label="行程视图">
          <button className={surface === "mine" ? "active" : ""} onClick={() => setSurface("mine")}>我的行程</button>
          <button className={surface === "discover" ? "active" : ""} onClick={() => setSurface("discover")}>社区</button>
        </nav>
        <div className="journey-header-actions">
          <button className="journey-icon-button" aria-label="分享当前行程" onClick={() => void shareJourney()}><SFSquareAndArrowUp size="sm" /></button>
          <button className="journey-add-button" onClick={() => setPublishOpen(true)}><SFSquareAndArrowUp size="xs" />发布行程</button>
          <button className="journey-icon-button journey-new-button" aria-label="新建行程" onClick={() => setComposerOpen(true)}><SFPlus size="sm" /></button>
        </div>
      </header>

      <div className="journey-map-intro">
        <small>{surface === "mine" ? "正在播放你的旅程" : "公开社区 · 实时路线"}</small>
        <h1>{surface === "mine" ? state.tripName : "看看大家如何抵达远方"}</h1>
        <p>{surface === "mine" ? "飞机、列车、汽车和轮船沿真实路线运行。" : "每张卡片都会显示载具、班次与起终站。"}</p>
        {surface === "discover" && <span className={`community-status ${communityStatus}`}><i />{communityStatus === "live" ? "社区已同步" : communityStatus === "loading" ? "正在同步社区" : "离线精选"}</span>}
      </div>

      <div className="journey-map-actions liquid-glass-control" aria-label="地图菜单">
        <button className={mapMenuOpen ? "active" : ""} aria-label="打开地图菜单" onClick={() => setMapMenuOpen((value) => !value)}><SFMapFill size="sm" /><span>地图</span></button>
        <button className={followVehicle ? "active" : ""} aria-pressed={followVehicle} aria-label="跟随载具视角" onClick={() => setFollowVehicle((value) => !value)}><SFLocationNorthFill size="sm" /><span>跟随</span></button>
        <button aria-label="重新定位地图" onClick={() => { setFollowVehicle(false); setResetToken((value) => value + 1); }}><SFGlobeAsiaAustraliaFill size="sm" /><span>全览</span></button>
      </div>

      {mapMenuOpen && !immersive && (
        <aside className="journey-map-menu-popover" aria-label="地图显示设置">
          <header><span><SFMapFill size="sm" />地图显示</span><button aria-label="关闭地图菜单" onClick={() => setMapMenuOpen(false)}><SFXmark size="xs" /></button></header>
          <section><small>地图图层</small><div className="map-menu-options">{BASEMAP_OPTIONS.map((item) => <button key={item.id} className={basemap === item.id ? "active" : ""} aria-pressed={basemap === item.id} onClick={() => setBasemap(item.id)}>{item.label}</button>)}</div></section>
          <section><small>界面模式</small><div className="map-menu-options appearance">{(["system", "light", "dark"] as const).map((mode) => <button key={mode} className={appearance.mode === mode ? "active" : ""} aria-pressed={appearance.mode === mode} onClick={() => appearance.setMode(mode)}>{mode === "system" ? "跟随系统" : mode === "light" ? <><SFSunMaxFill size="xs" />浅色</> : <><SFMoonStarsFill size="xs" />深色</>}</button>)}</div></section>
          <div className="map-menu-utilities">
            <button onClick={() => { setControlsOpen(true); setMapMenuOpen(false); }}><SFSliderHorizontal3 size="xs" />3D 动画</button>
            <button onClick={() => void enterImmersive()}><SFArrowDownLeftAndArrowUpRight size="xs" />沉浸地图</button>
          </div>
          <p>天气已移入行程票卡，地图上不再显示天气标记。</p>
        </aside>
      )}

      {selected && !immersive && (
        <aside className={`journey-live-preview ${surface}`} style={{ "--journey-accent": MODE_META[selected.mode].color } as CSSProperties}>
          <div className="journey-live-model"><span><JourneyModeIcon mode={selected.mode} /></span></div>
          <div><small>{surface === "mine" ? "旅程动画预览" : `${selectedCommunity?.creatorName ?? "旅行者"} 分享`}</small><strong>{selected.title}</strong><span>{selected.origin.code}<i />{selected.destination.code}</span></div>
        </aside>
      )}

      <section className={`journey-card-dock ${surface}`} aria-label={surface === "mine" ? "我的行程列表" : "社区行程列表"}>
        {surface === "mine" && <TripPassportStrip trips={state.trips} activeTripId={state.activeTripId} onSelect={store.selectTrip} onCreate={() => { store.createTrip(); setComposerOpen(true); }} onManage={() => setTripManagerOpen(true)} />}
        <header><div><small>{surface === "mine" ? "我的旅程" : "旅行社区"}</small><strong>{surface === "mine" ? "我的行程" : "社区分享"}</strong></div><span>{mapSegments.length} 条路线</span></header>
        <div className="journey-card-rail">
          {surface === "mine" ? state.segments.map((segment) => (
            <JourneyCard key={segment.id} segment={segment} active={segment.id === selectedMine?.id} roadTraffic={roadTraffic[segment.id]} onClick={() => store.selectSegment(segment.id)} />
          )) : community.map((journey) => (
            <JourneyCard key={journey.communityId} segment={journey} community={journey} active={journey.communityId === selectedCommunity?.communityId} liked={likedIds.includes(journey.communityId)} onClick={() => setSelectedCommunityId(journey.communityId)} onLike={() => void like(journey)} onSave={() => saveCommunity(journey)} onDetail={onOpenCommunity ? () => onOpenCommunity(journey) : undefined} />
          ))}
        </div>
      </section>

      {controlsOpen && !immersive && <AnimationControls vehicleScale={preferences.vehicleScale} animationSpeed={preferences.animationSpeed} motionEnabled={preferences.motionEnabled} onScale={(vehicleScale) => updatePreferences({ vehicleScale })} onSpeed={(animationSpeed) => updatePreferences({ animationSpeed })} onMotion={(motionEnabled) => updatePreferences({ motionEnabled })} onReset={resetPreferences} onClose={() => setControlsOpen(false)} />}
      {immersive && <button className="journey-exit-immersive" onClick={() => setImmersive(false)}><SFXmark size="xs" />退出沉浸</button>}
      {composerOpen && <JourneyComposer variant="desktop" tripName={state.tripName} initialOrigin={state.segments.at(-1)?.destination} onClose={() => setComposerOpen(false)} onAddMany={(segments, tripName) => { store.renameTrip(tripName); store.addSegments(segments); }} />}
      {tripManagerOpen && activeTrip && <TripManagerDialog trip={activeTrip} tripCount={state.trips.length} onClose={() => setTripManagerOpen(false)} onRename={store.renameTrip} onAppearance={store.updateTripAppearance} onDelete={() => { store.deleteTrip(activeTrip.id); setTripManagerOpen(false); }} onCreate={store.createTrip} onUpdateSegment={store.updateSegment} onRemoveSegment={store.removeSegment} />}
      {publishOpen && <PublishDialog segments={state.segments} selectedId={selectedMine?.id} onClose={() => setPublishOpen(false)} onPublish={publish} />}
      {toast && <div className="journey-toast" role="status">{toast}</div>}
    </main>
  );
}
