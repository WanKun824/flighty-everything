"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import SFArrowDownLeftAndArrowUpRight from "sf-symbols-lib/monochrome/SFArrowDownLeftAndArrowUpRight";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFGlobeAsiaAustraliaFill from "sf-symbols-lib/monochrome/SFGlobeAsiaAustraliaFill";
import SFHeart from "sf-symbols-lib/monochrome/SFHeart";
import SFHeartFill from "sf-symbols-lib/monochrome/SFHeartFill";
import SFLocationNorthFill from "sf-symbols-lib/monochrome/SFLocationNorthFill";
import SFPauseFill from "sf-symbols-lib/monochrome/SFPauseFill";
import SFPlayFill from "sf-symbols-lib/monochrome/SFPlayFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFSliderHorizontal3 from "sf-symbols-lib/monochrome/SFSliderHorizontal3";
import SFSparkles from "sf-symbols-lib/monochrome/SFSparkles";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import {
  FALLBACK_COMMUNITY,
  cloneCommunityJourney,
  fetchCommunityJourneys,
  likeCommunityJourney,
  publishCommunityJourney,
  type CommunityJourney,
} from "./communityData";
import FlightGlobe from "./FlightGlobe";
import JourneyComposer, { JourneyModeIcon } from "./JourneyComposer";
import { MODE_META, type JourneySegment } from "./journeyData";
import { useJourneyPreferences } from "./journeyPreferences";
import { useJourneyStore } from "./journeyStorage";

type Surface = "mine" | "discover";

export default function JourneyExperience() {
  const store = useJourneyStore();
  const { state } = store;
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
    void fetchCommunityJourneys()
      .then((journeys) => {
        if (cancelled) return;
        const next = journeys.length ? journeys : FALLBACK_COMMUNITY;
        setCommunity(next);
        setSelectedCommunityId((current) => next.some((item) => item.communityId === current) ? current : next[0].communityId);
        setCommunityStatus("live");
      })
      .catch(() => {
        if (!cancelled) setCommunityStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImmersive(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectedMine =
    state.segments.find((segment) => segment.id === state.selectedSegmentId) ??
    state.segments[0];
  const selectedCommunity =
    community.find((journey) => journey.communityId === selectedCommunityId) ??
    community[0];
  const selected = surface === "mine" ? selectedMine : selectedCommunity;
  const mapSegments = useMemo(
    () => (surface === "mine" ? state.segments : community),
    [surface, state.segments, community],
  );
  const selectedMapId = surface === "mine" ? selectedMine?.id : selectedCommunity?.id;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const shareJourney = async () => {
    if (!selected) return;
    const text = `${selected.title} · ${selected.origin.city} → ${selected.destination.city}`;
    try {
      if (navigator.share) await navigator.share({ title: selected.title, text });
      else await navigator.clipboard.writeText(text);
      notify("分享内容已准备好");
    } catch {
      /* Native share sheets can be dismissed without changing the journey. */
    }
  };

  const enterImmersive = async () => {
    setControlsOpen(false);
    setImmersive(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* iOS browsers still receive the chrome-free in-app immersive layout. */
    }
  };

  const exitImmersive = async () => {
    setImmersive(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* The layout exits immersive even if the native fullscreen API is unavailable. */
    }
  };

  const publish = async (segment: JourneySegment, creatorName: string, caption: string) => {
    const published = await publishCommunityJourney(segment, creatorName, caption);
    setCommunity((current) => [published, ...current.filter((item) => item.communityId !== published.communityId)]);
    setSelectedCommunityId(published.communityId);
    setSurface("discover");
    setPublishOpen(false);
    notify("行程已发布到发现");
  };

  const like = async (journey: CommunityJourney) => {
    if (likedIds.includes(journey.communityId)) return;
    setLikedIds((current) => [...current, journey.communityId]);
    setCommunity((current) => current.map((item) => item.communityId === journey.communityId ? { ...item, likes: item.likes + 1 } : item));
    if (journey.communityId.startsWith("fallback-")) return;
    try {
      const updated = await likeCommunityJourney(journey.communityId);
      setCommunity((current) => current.map((item) => item.communityId === updated.communityId ? updated : item));
    } catch {
      notify("已在本机收藏，网络恢复后可再次同步");
    }
  };

  const saveCommunity = (journey: CommunityJourney) => {
    const saved = cloneCommunityJourney(journey);
    store.addSegment(saved);
    setSurface("mine");
    notify("已保存到你的行程");
  };

  return (
    <main id="top" className={`journey-experience ${immersive ? "is-immersive" : ""}`}>
      <section className="journey-map-canvas" aria-label="实时行程地图">
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
          onJourneySegmentSelect={(id) => {
            if (surface === "mine") store.selectSegment(id);
            else {
              const journey = community.find((item) => item.id === id);
              if (journey) setSelectedCommunityId(journey.communityId);
            }
          }}
          onAirportSelect={() => undefined}
          onWeatherError={() => notify("天气图层暂不可用，已保留实时地球")}
        />
      </section>

      <header className="journey-glass-bar">
        <a className="journey-wordmark" href="#top" aria-label="flighty Everything 首页">
          <span><SFGlobeAsiaAustraliaFill size="sm" /></span>
          <b>flighty</b>
          <em>Everything</em>
        </a>
        <nav aria-label="行程内容">
          <button className={surface === "mine" ? "active" : ""} onClick={() => setSurface("mine")}>你的行程</button>
          <button className={surface === "discover" ? "active" : ""} onClick={() => setSurface("discover")}>发现</button>
        </nav>
        <div className="journey-header-actions">
          <button className="journey-icon-button" aria-label="分享当前行程" onClick={() => void shareJourney()}><SFSquareAndArrowUp size="sm" /></button>
          {surface === "mine" ? (
            <button className="journey-add-button" onClick={() => setComposerOpen(true)}><SFPlus size="xs" />新建行程</button>
          ) : (
            <button className="journey-add-button" onClick={() => setPublishOpen(true)}><SFSquareAndArrowUp size="xs" />发布行程</button>
          )}
          <button className="journey-avatar" aria-label="个人资料">VL</button>
        </div>
      </header>

      <div className="journey-map-intro">
        <small>{surface === "mine" ? "正在播放你的旅程" : "来自社区的实时路线"}</small>
        <h1>{surface === "mine" ? state.tripName : "发现值得出发的路线"}</h1>
        <p>{surface === "mine" ? "每一段行程都在地球上实时展开。" : "从真实路线获得灵感，再保存为自己的旅程。"}</p>
        {surface === "discover" && <span className={`community-status ${communityStatus}`}><i />{communityStatus === "live" ? "社区已同步" : communityStatus === "loading" ? "正在同步社区" : "离线精选"}</span>}
      </div>

      <div className="journey-map-actions">
        <button aria-label="进入沉浸模式" onClick={() => void enterImmersive()}><SFArrowDownLeftAndArrowUpRight size="sm" /><span>沉浸</span></button>
        <button className={controlsOpen ? "active" : ""} aria-label="打开动画调节" onClick={() => setControlsOpen((value) => !value)}><SFSliderHorizontal3 size="sm" /><span>调节</span></button>
        <button aria-label="重新定位地图" onClick={() => setResetToken((value) => value + 1)}><SFLocationNorthFill size="sm" /></button>
      </div>

      {selected && !immersive && (
        <aside className="journey-live-preview" style={{ "--journey-accent": MODE_META[selected.mode].color } as CSSProperties}>
          <div className="journey-live-model"><span><JourneyModeIcon mode={selected.mode} /></span></div>
          <div>
            <small>{surface === "mine" ? "LIVE JOURNEY" : `${selectedCommunity?.creatorName ?? "社区"} 分享`}</small>
            <strong>{selected.title}</strong>
            <span>{selected.origin.code}<i />{selected.destination.code}</span>
          </div>
        </aside>
      )}

      <section className="journey-card-dock" aria-label={surface === "mine" ? "你的行程列表" : "社区发现列表"}>
        <header>
          <div>
            <small>{surface === "mine" ? "YOUR JOURNEYS" : "DISCOVER"}</small>
            <strong>{surface === "mine" ? "你的行程" : "社区精选"}</strong>
          </div>
          <span>{mapSegments.length} 条路线</span>
        </header>
        <div className="journey-card-rail">
          {surface === "mine"
            ? state.segments.map((segment) => (
                <JourneyListingCard key={segment.id} segment={segment} active={segment.id === selectedMine?.id} onClick={() => store.selectSegment(segment.id)} />
              ))
            : community.map((journey) => (
                <JourneyListingCard key={journey.communityId} segment={journey} community={journey} active={journey.communityId === selectedCommunity?.communityId} liked={likedIds.includes(journey.communityId)} onClick={() => setSelectedCommunityId(journey.communityId)} onLike={() => void like(journey)} onSave={() => saveCommunity(journey)} />
              ))}
        </div>
      </section>

      {controlsOpen && !immersive && (
        <AnimationControls
          vehicleScale={preferences.vehicleScale}
          animationSpeed={preferences.animationSpeed}
          motionEnabled={preferences.motionEnabled}
          onScale={(vehicleScale) => updatePreferences({ vehicleScale })}
          onSpeed={(animationSpeed) => updatePreferences({ animationSpeed })}
          onMotion={(motionEnabled) => updatePreferences({ motionEnabled })}
          onReset={resetPreferences}
          onClose={() => setControlsOpen(false)}
        />
      )}

      {immersive && <button className="journey-exit-immersive" onClick={() => void exitImmersive()}><SFXmark size="xs" />退出沉浸</button>}
      {composerOpen && <JourneyComposer variant="desktop" onClose={() => setComposerOpen(false)} onAdd={store.addSegment} />}
      {publishOpen && <PublishJourneyDialog segments={state.segments} selectedId={selectedMine?.id} onClose={() => setPublishOpen(false)} onPublish={publish} />}
      {toast && <div className="journey-toast" role="status">{toast}</div>}
    </main>
  );
}

function JourneyListingCard({ segment, community, active, liked = false, onClick, onLike, onSave }: { segment: JourneySegment; community?: CommunityJourney; active: boolean; liked?: boolean; onClick: () => void; onLike?: () => void; onSave?: () => void }) {
  const meta = MODE_META[segment.mode];
  return (
    <article className={`journey-listing-card ${active ? "active" : ""}`} style={{ "--journey-accent": meta.color } as CSSProperties}>
      <button className="journey-card-select" aria-label={`在地图查看 ${segment.title}`} onClick={onClick}>
        <span className="journey-listing-visual"><i /><b>{segment.origin.code}</b><em>→</em><b>{segment.destination.code}</b><small>{meta.label}</small></span>
        <span className="journey-listing-copy">
          <span><strong>{segment.title}</strong><em>{segment.status === "active" ? "实时" : segment.date}</em></span>
          <small>{community ? `${community.creatorName} · ${community.caption}` : `${segment.service} · ${segment.departure}`}</small>
        </span>
      </button>
      {community && (
        <span className="community-card-actions">
          <button aria-label={`喜欢 ${segment.title}`} className={liked ? "liked" : ""} onClick={onLike}>{liked ? <SFHeartFill size="xs" /> : <SFHeart size="xs" />}<small>{community.likes}</small></button>
          <button onClick={onSave}><SFPlus size="xs" />保存</button>
        </span>
      )}
    </article>
  );
}

function AnimationControls({ vehicleScale, animationSpeed, motionEnabled, onScale, onSpeed, onMotion, onReset, onClose }: { vehicleScale: number; animationSpeed: number; motionEnabled: boolean; onScale: (value: number) => void; onSpeed: (value: number) => void; onMotion: (value: boolean) => void; onReset: () => void; onClose: () => void }) {
  return (
    <aside className="journey-quick-controls" aria-label="动画调节">
      <header><span><SFSparkles size="sm" />动画调节</span><button aria-label="关闭调节" onClick={onClose}><SFXmark size="xs" /></button></header>
      <label><span>载具大小 <b>×{vehicleScale.toFixed(1)}</b></span><input aria-label="载具大小" type="range" min="0.6" max="1.8" step="0.1" value={vehicleScale} onChange={(event) => onScale(Number(event.target.value))} /></label>
      <label><span>播放速度 <b>×{animationSpeed.toFixed(2)}</b></span><input aria-label="播放速度" type="range" min="0.25" max="2.5" step="0.25" value={animationSpeed} onChange={(event) => onSpeed(Number(event.target.value))} /></label>
      <div className="journey-motion-controls">
        <button className={motionEnabled ? "active" : ""} onClick={() => onMotion(!motionEnabled)}>{motionEnabled ? <SFPauseFill size="xs" /> : <SFPlayFill size="xs" />}{motionEnabled ? "暂停动画" : "继续播放"}</button>
        <button onClick={onReset}>恢复默认</button>
      </div>
    </aside>
  );
}

function PublishJourneyDialog({ segments, selectedId, onClose, onPublish }: { segments: JourneySegment[]; selectedId?: string; onClose: () => void; onPublish: (segment: JourneySegment, creatorName: string, caption: string) => Promise<void> }) {
  const [segmentId, setSegmentId] = useState(selectedId ?? segments[0]?.id ?? "");
  const [creatorName, setCreatorName] = useState("Vincent");
  const [caption, setCaption] = useState("把这段旅程分享给下一位出发的人。");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = segments.find((segment) => segment.id === segmentId);

  const submit = async () => {
    if (!selected || !creatorName.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onPublish(selected, creatorName.trim(), caption.trim());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "发布失败，请稍后重试");
      setSubmitting(false);
    }
  };

  return (
    <section className="publish-journey-dialog" role="dialog" aria-label="发布行程">
      <header><div><small>COMMUNITY</small><h2>发布你的行程</h2><p>公开路线、交通动画和实用备注，不会分享私人资料。</p></div><button aria-label="关闭发布" onClick={onClose}><SFXmark size="sm" /></button></header>
      <label><span>选择行程</span><select value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>{segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.title} · {segment.origin.code} → {segment.destination.code}</option>)}</select></label>
      <label><span>发布者名称</span><input value={creatorName} maxLength={40} onChange={(event) => setCreatorName(event.target.value)} /></label>
      <label><span>分享说明</span><textarea value={caption} maxLength={240} rows={3} onChange={(event) => setCaption(event.target.value)} /></label>
      <div className="publish-safety-note"><SFCheckmarkCircleFill size="sm" /><span><strong>只发布行程内容</strong><small>座位号、证件和精确住址不会进入社区。</small></span></div>
      {error && <p className="publish-error" role="alert">{error}</p>}
      <button className="publish-submit" disabled={!selected || !creatorName.trim() || submitting} onClick={() => void submit()}><SFSquareAndArrowUp size="sm" />{submitting ? "正在发布…" : "发布到发现"}</button>
    </section>
  );
}
