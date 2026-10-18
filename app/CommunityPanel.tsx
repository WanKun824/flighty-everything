"use client";

import { useEffect, useState } from "react";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import { FALLBACK_COMMUNITY, fetchCommunityJourneys, likeCommunityJourney, publishCommunityJourney, cloneCommunityJourney, type CommunityJourney } from "./communityData";
import { JourneyCard, PublishDialog } from "./JourneyCommunityUI";
import { JourneyModeIcon } from "./JourneyComposer";
import SheetHeader from "./SheetHeader";
import { MODE_META, type JourneySegment } from "./journeyData";
import { shareContent } from "./nativeInteractions";
import { useMobileNavigation } from "./useMobileNavigation";
import { useSheetAccessibility } from "./useSheetAccessibility";

/** Details replace the feed; only the publishing form uses a modal backdrop. */
export default function CommunityPanel({ segments, onSave, onPreview, notify, onPageChange }: {
  segments: JourneySegment[];
  onSave: (segment: JourneySegment) => void;
  onPreview: (segment: JourneySegment) => void;
  notify: (message: string) => void;
  onPageChange: (page: "feed" | "detail" | "publish") => void;
}) {
  const [journeys, setJourneys] = useState<CommunityJourney[]>(FALLBACK_COMMUNITY);
  const [status, setStatus] = useState("正在同步社区…");
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState<"feed" | "publish" | CommunityJourney>("feed");
  const [likes, setLikes] = useState<string[]>([]);
  const pageKey = typeof page === "string" ? page : "detail";
  const back = () => setPage("feed");
  useMobileNavigation(pageKey === "feed" ? null : `community-${pageKey}`, back);
  useSheetAccessibility(pageKey === "feed" ? null : `community-${pageKey}`, back);
  useEffect(() => { onPageChange(pageKey); }, [pageKey, onPageChange]);
  useEffect(() => () => onPageChange("feed"), [onPageChange]);
  useEffect(() => {
    let live = true;
    void fetchCommunityJourneys().then(items => {
      if (!live) return;
      setJourneys(items.length ? items : FALLBACK_COMMUNITY);
      setStatus(items.length ? "已同步公开行程" : "精选示例 · 暂无公开行程");
    }).catch(() => { if (live) setStatus("离线精选 · 点此重试同步"); });
    return () => { live = false; };
  }, [retry]);
  const like = async (journey: CommunityJourney) => {
    if (likes.includes(journey.communityId)) return;
    setLikes(current => [...current, journey.communityId]);
    if (journey.communityId.startsWith("fallback-")) return;
    try {
      const result = await likeCommunityJourney(journey.communityId);
      setJourneys(current => current.map(item => item.communityId === result.communityId ? result : item));
    } catch {
      setLikes(current => current.filter(id => id !== journey.communityId));
      notify("点赞未保存，请联网后重试");
    }
  };
  if (page === "publish") return <div className="community-panel-scroll community-form">
    <PublishDialog segments={segments} onClose={() => setPage("feed")} onPublish={async (segment, name, caption) => {
      const result = await publishCommunityJourney(segment, name, caption);
      setJourneys(current => [result, ...current]); setPage("feed"); notify("行程已发布");
    }} />
  </div>;
  if (page !== "feed") return <div className="community-panel-scroll community-push" role="dialog" aria-label="社区行程详情">
    <SheetHeader title="行程分享" subtitle={page.creatorName} back onClose={() => setPage("feed")} />
    <div className="community-detail-card">
      <span className="community-mode"><JourneyModeIcon mode={page.mode} />{MODE_META[page.mode].label}</span>
      <h3>{page.title}</h3><p>{page.caption}</p>
      <dl><dt>班次</dt><dd>{page.service}</dd><dt>出发站</dt><dd>{page.origin.name} · {page.departure}</dd><dt>到达站</dt><dd>{page.destination.name} · {page.arrival}</dd></dl>
      <button className="blue-button" onClick={() => { onSave(cloneCommunityJourney(page)); notify("已保存到当前旅程"); }}>保存到我的行程</button>
      <button className="text-button" onClick={() => { onPreview(page); notify("已在地图预览这段路线"); }}>在地图预览</button>
      <button className="text-button" onClick={() => { void shareContent(page.title, `${page.origin.name} → ${page.destination.name} · ${page.service}`).catch(() => notify("未分享，内容仍保留在本机")); }}>分享路线</button>
    </div>
  </div>;
  return <div className="community-panel-scroll">
    <div className="community-feed-heading"><button className="community-sync-status" onClick={() => setRetry(value => value + 1)}>{status}</button><button aria-label="发布行程" disabled={!segments.length} onClick={() => setPage("publish")}><SFPlus size="sm" />发布</button></div>
    <p className="community-disclaimer">公开路线供参考，不代表载具实时位置。</p>
    <div className="community-feed">
      {journeys.map(journey => <JourneyCard key={journey.communityId} segment={journey} community={journey} active={false} liked={likes.includes(journey.communityId)} onClick={() => { setPage(journey); onPreview(journey); }} onLike={() => void like(journey)} onSave={() => { onSave(cloneCommunityJourney(journey)); notify("已保存到当前旅程"); }} onDetail={() => setPage(journey)} />)}
    </div>
  </div>;
}
