"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import SFArrowDownLeftAndArrowUpRight from "sf-symbols-lib/monochrome/SFArrowDownLeftAndArrowUpRight";
import SFGlobeAsiaAustraliaFill from "sf-symbols-lib/monochrome/SFGlobeAsiaAustraliaFill";
import SFLocationNorthFill from "sf-symbols-lib/monochrome/SFLocationNorthFill";
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
import FlightGlobe from "./FlightGlobe";
import { AnimationControls, JourneyCard, PublishDialog } from "./JourneyCommunityUI";
import JourneyComposer from "./JourneyComposer";
import { MODE_META, type JourneySegment } from "./journeyData";
import { useJourneyPreferences } from "./journeyPreferences";
import { useJourneyStore } from "./journeyStorage";
import Vehicle3D from "./Vehicle3D";

type Surface = "mine" | "discover";

export default function JourneyExperience27() {
  const store = useJourneyStore();
  const { state } = store;
  const appearance = useAppearance();
  const { preferences, update: updatePreferences, reset: resetPreferences } = useJourneyPreferences();
  const [surface, setSurface] = useState<Surface>("mine");
  const [immersive, setImmersive] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
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
          weatherMode={state.weatherMode}
          resetToken={resetToken}
          journeySegments={mapSegments}
          selectedJourneySegmentId={selectedMapId ?? null}
          vehicleScale={preferences.vehicleScale}
          animationSpeed={preferences.animationSpeed}
          motionEnabled={preferences.motionEnabled}
          theme={appearance.resolved}
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
        <a className="journey-wordmark" href="#top" aria-label="flighty Everything 首页"><span><SFGlobeAsiaAustraliaFill size="sm" /></span><b>flighty</b><em>Everything</em></a>
        <nav aria-label="行程视图">
          <button className={surface === "mine" ? "active" : ""} onClick={() => setSurface("mine")}>我的行程</button>
          <button className={surface === "discover" ? "active" : ""} onClick={() => setSurface("discover")}>社区</button>
        </nav>
        <div className="journey-header-actions">
          <button className="journey-icon-button" aria-label={`切换到${appearance.resolved === "dark" ? "浅色" : "深色"}模式`} onClick={appearance.cycle}>{appearance.resolved === "dark" ? <SFSunMaxFill size="sm" /> : <SFMoonStarsFill size="sm" />}</button>
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

      <div className="journey-map-actions liquid-glass-control">
        <button aria-label="进入沉浸模式" onClick={() => void enterImmersive()}><SFArrowDownLeftAndArrowUpRight size="sm" /><span>沉浸</span></button>
        <button className={controlsOpen ? "active" : ""} aria-label="打开动画设置" onClick={() => setControlsOpen((value) => !value)}><SFSliderHorizontal3 size="sm" /><span>动画</span></button>
        <button aria-label="重新定位地图" onClick={() => setResetToken((value) => value + 1)}><SFLocationNorthFill size="sm" /></button>
      </div>

      {selected && !immersive && (
        <aside className="journey-live-preview" style={{ "--journey-accent": MODE_META[selected.mode].color } as CSSProperties}>
          <div className="journey-live-model"><Vehicle3D kind={selected.mode} view="hero" progress={selected.progress} rate={preferences.animationSpeed} /></div>
          <div><small>{surface === "mine" ? "LIVE 3D JOURNEY" : `${selectedCommunity?.creatorName ?? "旅行者"} 分享`}</small><strong>{selected.title}</strong><span>{selected.origin.code}<i />{selected.destination.code}</span></div>
        </aside>
      )}

      <section className="journey-card-dock" aria-label={surface === "mine" ? "我的行程列表" : "社区行程列表"}>
        <header><div><small>{surface === "mine" ? "YOUR JOURNEYS" : "COMMUNITY"}</small><strong>{surface === "mine" ? "我的行程" : "社区分享"}</strong></div><span>{mapSegments.length} 条路线</span></header>
        <div className="journey-card-rail">
          {surface === "mine" ? state.segments.map((segment) => (
            <JourneyCard key={segment.id} segment={segment} active={segment.id === selectedMine?.id} onClick={() => store.selectSegment(segment.id)} />
          )) : community.map((journey) => (
            <JourneyCard key={journey.communityId} segment={journey} community={journey} active={journey.communityId === selectedCommunity?.communityId} liked={likedIds.includes(journey.communityId)} onClick={() => setSelectedCommunityId(journey.communityId)} onLike={() => void like(journey)} onSave={() => saveCommunity(journey)} />
          ))}
        </div>
      </section>

      {controlsOpen && !immersive && <AnimationControls vehicleScale={preferences.vehicleScale} animationSpeed={preferences.animationSpeed} motionEnabled={preferences.motionEnabled} onScale={(vehicleScale) => updatePreferences({ vehicleScale })} onSpeed={(animationSpeed) => updatePreferences({ animationSpeed })} onMotion={(motionEnabled) => updatePreferences({ motionEnabled })} onReset={resetPreferences} onClose={() => setControlsOpen(false)} />}
      {immersive && <button className="journey-exit-immersive" onClick={() => setImmersive(false)}><SFXmark size="xs" />退出沉浸</button>}
      {composerOpen && <JourneyComposer variant="desktop" onClose={() => setComposerOpen(false)} onAdd={store.addSegment} />}
      {publishOpen && <PublishDialog segments={state.segments} selectedId={selectedMine?.id} onClose={() => setPublishOpen(false)} onPublish={publish} />}
      {toast && <div className="journey-toast" role="status">{toast}</div>}
    </main>
  );
}
