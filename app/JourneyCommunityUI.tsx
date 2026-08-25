"use client";

import { useState, type CSSProperties } from "react";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFHeart from "sf-symbols-lib/monochrome/SFHeart";
import SFHeartFill from "sf-symbols-lib/monochrome/SFHeartFill";
import SFPauseFill from "sf-symbols-lib/monochrome/SFPauseFill";
import SFPlayFill from "sf-symbols-lib/monochrome/SFPlayFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFSparkles from "sf-symbols-lib/monochrome/SFSparkles";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import { communityJourneyHref, type CommunityJourney } from "./communityData";
import { MODE_META, type JourneySegment } from "./journeyData";

export function JourneyCard({ segment, community, active, liked = false, onClick, onLike, onSave }: {
  segment: JourneySegment;
  community?: CommunityJourney;
  active: boolean;
  liked?: boolean;
  onClick: () => void;
  onLike?: () => void;
  onSave?: () => void;
}) {
  const meta = MODE_META[segment.mode];
  const detailHref = community && !community.communityId.startsWith("fallback-")
    ? communityJourneyHref(community.communityId)
    : null;
  return (
    <article className={`journey-listing-card ${active ? "active" : ""}`} style={{ "--journey-accent": meta.color } as CSSProperties}>
      <button className="journey-card-select" aria-label={`在地图查看 ${segment.title}`} onClick={onClick}>
        <span className="journey-listing-visual"><i /><b>{segment.origin.code}</b><em>→</em><b>{segment.destination.code}</b><small>{meta.label}</small></span>
        <span className="journey-listing-copy">
          <span><strong>{segment.title}</strong><em>{segment.service}</em></span>
          <small>{segment.origin.name} → {segment.destination.name}</small>
          {community && <small>{community.creatorName} · {community.caption}</small>}
        </span>
      </button>
      {community && (
        <span className="community-card-actions">
          <button aria-label={`喜欢 ${segment.title}`} className={liked ? "liked" : ""} onClick={onLike}>{liked ? <SFHeartFill size="xs" /> : <SFHeart size="xs" />}<small>{community.likes}</small></button>
          {detailHref && <a href={detailHref}>详情</a>}
          <button onClick={onSave}><SFPlus size="xs" />保存</button>
        </span>
      )}
    </article>
  );
}

export function AnimationControls({ vehicleScale, animationSpeed, motionEnabled, onScale, onSpeed, onMotion, onReset, onClose }: {
  vehicleScale: number;
  animationSpeed: number;
  motionEnabled: boolean;
  onScale: (value: number) => void;
  onSpeed: (value: number) => void;
  onMotion: (value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="journey-quick-controls" aria-label="动画设置">
      <header><span><SFSparkles size="sm" />3D 动画</span><button aria-label="关闭动画设置" onClick={onClose}><SFXmark size="xs" /></button></header>
      <label><span>载具大小 <b>×{vehicleScale.toFixed(1)}</b></span><input aria-label="载具大小" type="range" min="0.6" max="1.8" step="0.1" value={vehicleScale} onChange={(event) => onScale(Number(event.target.value))} /></label>
      <label><span>播放速度 <b>×{animationSpeed.toFixed(2)}</b></span><input aria-label="播放速度" type="range" min="0.25" max="2.5" step="0.25" value={animationSpeed} onChange={(event) => onSpeed(Number(event.target.value))} /></label>
      <div className="journey-motion-controls">
        <button className={motionEnabled ? "active" : ""} onClick={() => onMotion(!motionEnabled)}>{motionEnabled ? <SFPauseFill size="xs" /> : <SFPlayFill size="xs" />}{motionEnabled ? "暂停动画" : "继续动画"}</button>
        <button onClick={onReset}>恢复默认</button>
      </div>
    </aside>
  );
}

export function PublishDialog({ segments, selectedId, onClose, onPublish }: {
  segments: JourneySegment[];
  selectedId?: string;
  onClose: () => void;
  onPublish: (segment: JourneySegment, creatorName: string, caption: string) => Promise<void>;
}) {
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
    <section className="publish-journey-dialog" role="dialog" aria-modal="true" aria-label="发布行程">
      <header><div><small>COMMUNITY</small><h2>发布你的行程</h2><p>社区会显示载具、班次和起终站，不发布座位号或证件信息。</p></div><button aria-label="关闭发布" onClick={onClose}><SFXmark size="sm" /></button></header>
      <label><span>选择行程</span><select value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>{segments.map((segment) => <option key={segment.id} value={segment.id}>{MODE_META[segment.mode].label} · {segment.origin.code} → {segment.destination.code}</option>)}</select></label>
      <label><span>发布者名称</span><input value={creatorName} maxLength={40} onChange={(event) => setCreatorName(event.target.value)} /></label>
      <label><span>分享说明</span><textarea value={caption} maxLength={240} rows={3} onChange={(event) => setCaption(event.target.value)} /></label>
      <div className="publish-safety-note"><SFCheckmarkCircleFill size="sm" /><span><strong>只发布行程内容</strong><small>座位号、证件和精确住址不会进入社区。</small></span></div>
      {error && <p className="publish-error" role="alert">{error}</p>}
      <button className="publish-submit" disabled={!selected || !creatorName.trim() || submitting} onClick={() => void submit()}><SFSquareAndArrowUp size="sm" />{submitting ? "正在发布…" : "发布到社区"}</button>
    </section>
  );
}
