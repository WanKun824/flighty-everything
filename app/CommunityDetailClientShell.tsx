"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { CommunityJourney } from "./communityData";

const CommunityJourneyPage = lazy(() => import("./CommunityJourneyPage"));

function DetailBootScreen({ title }: { title: string }) {
  return (
    <main className="journey-experience journey-27 community-boot-screen">
      <strong>fly <em>everything</em></strong>
      <span>正在打开 {title}…</span>
    </main>
  );
}

export default function CommunityDetailClientShell({ journey }: { journey: CommunityJourney }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const fallback = <DetailBootScreen title={journey.title} />;
  if (!mounted) return fallback;
  return <Suspense fallback={fallback}><CommunityJourneyPage journey={journey} /></Suspense>;
}
