"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const JourneyExperience27 = lazy(() => import("./JourneyExperience27"));

function CommunityBootScreen() {
  return (
    <main className="journey-experience journey-27 community-boot-screen">
      <strong>flighty <em>Everything</em></strong>
      <span>正在连接旅行社区…</span>
    </main>
  );
}

export default function CommunityClientShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!mounted) return <CommunityBootScreen />;
  return <Suspense fallback={<CommunityBootScreen />}><JourneyExperience27 /></Suspense>;
}
