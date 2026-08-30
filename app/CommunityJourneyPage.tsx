"use client";

import { useState, type CSSProperties } from "react";
import SFArrowLeft from "sf-symbols-lib/monochrome/SFArrowLeft";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFMoonStarsFill from "sf-symbols-lib/monochrome/SFMoonStarsFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFSunMaxFill from "sf-symbols-lib/monochrome/SFSunMaxFill";
import { useAppearance } from "./appearance";
import { cloneCommunityJourney, type CommunityJourney } from "./communityData";
import FlightGlobe from "./FlightGlobe";
import { JourneyModeIcon } from "./JourneyComposer";
import { formatJourneyDuration, MODE_META } from "./journeyData";
import { useJourneyStore } from "./journeyStorage";

export default function CommunityJourneyPage({ journey, onBack }: { journey: CommunityJourney; onBack?: () => void }) {
  const appearance = useAppearance();
  const store = useJourneyStore();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const meta = MODE_META[journey.mode];

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const share = async () => {
    const text = `${journey.creatorName} 分享的${meta.label}行程：${journey.origin.name} → ${journey.destination.name}`;
    try {
      if (navigator.share) await navigator.share({ title: journey.title, text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      notify("分享内容已准备好");
    } catch { /* Native share sheets may be dismissed. */ }
  };

  const save = () => {
    store.addSegment(cloneCommunityJourney(journey));
    setSaved(true);
    notify("已保存到我的行程");
  };

  return (
    <main className="community-detail" style={{ "--journey-accent": meta.color } as CSSProperties}>
      <section className="community-detail-map" aria-label={`${journey.title} 3D 路线地图`}>
        <FlightGlobe airportsVisible={false} selectedAirport={null} weatherMode="none" resetToken={0} journeySegments={[journey]} selectedJourneySegmentId={journey.id} theme={appearance.resolved} onJourneySegmentSelect={() => undefined} onAirportSelect={() => undefined} onWeatherError={() => undefined} />
      </section>
      <header className="community-detail-toolbar liquid-glass-control">
        <a href="/community" aria-label="返回社区" onClick={(event) => {
          if (!onBack) return;
          event.preventDefault();
          onBack();
        }}><SFArrowLeft size="sm" /><span>社区</span></a>
        <strong>flighty <em>Everything</em></strong>
        <span>
          <button aria-label={`切换到${appearance.resolved === "dark" ? "浅色" : "深色"}模式`} onClick={appearance.cycle}>{appearance.resolved === "dark" ? <SFSunMaxFill size="sm" /> : <SFMoonStarsFill size="sm" />}</button>
          <button aria-label="分享此行程" onClick={() => void share()}><SFSquareAndArrowUp size="sm" /></button>
        </span>
      </header>
      <article className="community-detail-sheet">
        <div className="community-detail-model"><span><JourneyModeIcon mode={journey.mode} /></span></div>
        <div className="community-detail-copy">
          <span className="community-mode-pill">{meta.label} · {journey.service}</span>
          <p className="community-creator">{journey.creatorName} 分享 · {journey.likes} 人喜欢</p>
          <h1>{journey.title}</h1>
          <p className="community-caption">{journey.caption}</p>
          <div className="community-route-stations">
            <span><small>出发站</small><strong>{journey.origin.code}</strong><b>{journey.origin.name}</b><em>{journey.origin.city}</em></span>
            <i><b>→</b><small>{formatJourneyDuration(journey.durationMinutes)}</small></i>
            <span><small>到达站</small><strong>{journey.destination.code}</strong><b>{journey.destination.name}</b><em>{journey.destination.city}</em></span>
          </div>
          <dl className="community-detail-facts">
            <div><dt>日期</dt><dd>{journey.date}</dd></div>
            <div><dt>时间</dt><dd>{journey.departure}—{journey.arrival}</dd></div>
            <div><dt>距离</dt><dd>{journey.distanceKm.toLocaleString()} km</dd></div>
            <div><dt>载具</dt><dd>{meta.label}</dd></div>
          </dl>
          <button className={`community-save-button ${saved ? "saved" : ""}`} onClick={save} disabled={saved}>{saved ? <SFCheckmarkCircleFill size="sm" /> : <SFPlus size="sm" />}{saved ? "已保存到我的行程" : "保存到我的行程"}</button>
        </div>
      </article>
      {toast && <div className="journey-toast" role="status">{toast}</div>}
    </main>
  );
}
