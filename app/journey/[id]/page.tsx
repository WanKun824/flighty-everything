import type { Metadata } from "next";
import CommunityDetailClientShell from "../../CommunityDetailClientShell";
import { rowToCommunityJourney } from "../../communityData";
import { MODE_META } from "../../journeyData";
import { findCommunityJourneyRow } from "../../../db/communityQueries";

type PageProps = { params: Promise<{ id: string }> };

async function loadJourney(id: string) {
  try {
    const row = await findCommunityJourneyRow(id);
    return row ? rowToCommunityJourney(row) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const journey = await loadJourney(id);
  if (!journey) {
    return {
      title: "社区行程未找到 · fly everything",
      description: "这条社区行程不存在或暂时无法访问。",
      openGraph: { images: [] },
      twitter: { images: [] },
    };
  }
  const mode = MODE_META[journey.mode].label;
  const description = `${journey.creatorName} 分享的${mode}行程：${journey.origin.name} → ${journey.destination.name}，${journey.service}。`;
  return {
    title: `${journey.title} · fly everything`,
    description,
    openGraph: { title: journey.title, description, type: "article", images: [] },
    twitter: { card: "summary", title: journey.title, description, images: [] },
  };
}

export default async function JourneyPage({ params }: PageProps) {
  const { id } = await params;
  const journey = await loadJourney(id);
  if (!journey) {
    return (
      <main className="community-not-found">
        <span>404</span><h1>没有找到这条社区行程</h1>
        <p>它可能已被移除，或者社区服务暂时不可用。</p>
        <a href="/community">返回 fly everything 社区</a>
      </main>
    );
  }
  return <CommunityDetailClientShell journey={journey} />;
}
