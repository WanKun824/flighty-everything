import { StrictMode, lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CommunityJourney } from "../app/communityData";
import "../app/globals.css";
import "../app/journey-theme.css";
import "../app/journey-refinement.css";
import "../app/native-layout.css";
import "./transportBridge";

const FlightyApp = lazy(() => import("../app/FlightyApp"));
const JourneyExperience27 = lazy(() => import("../app/JourneyExperience27"));
const CommunityJourneyPage = lazy(() => import("../app/CommunityJourneyPage"));

type NativeScreen =
  | { name: "home" }
  | { name: "community" }
  | { name: "detail"; journey: CommunityJourney };

function NativeBootScreen() {
  return (
    <main className="native-boot-screen" aria-label="flighty Everything 正在启动">
      <span>flighty <em>Everything</em></span>
      <i />
    </main>
  );
}

function NativeApp() {
  const [screen, setScreen] = useState<NativeScreen>({ name: "home" });
  useEffect(() => {
    if (screen.name === "home") return;
    const handler = (window as Window & { webkit?: { messageHandlers?: { flightyChrome?: { postMessage: (payload: unknown) => void } } } }).webkit?.messageHandlers?.flightyChrome;
    handler?.postMessage({ bars: [], backEnabled: true });
    const back = (event: Event) => {
      const { phase, distance = 0 } = (event as CustomEvent<{ phase: string; distance: number }>).detail;
      const page = document.querySelector<HTMLElement>(".community-detail, .journey-experience");
      if (page) {
        page.style.translate = phase === "change" ? `${distance}px 0` : "0 0";
      }
      if (phase === "end") setScreen(screen.name === "detail" ? { name: "community" } : { name: "home" });
    };
    window.addEventListener("flighty-native-back", back);
    return () => { window.removeEventListener("flighty-native-back", back); handler?.postMessage({ bars: [], backEnabled: false }); };
  }, [screen.name]);
  return (
    <Suspense fallback={<NativeBootScreen />}>
      {screen.name === "home" && (
        <FlightyApp onOpenCommunity={() => setScreen({ name: "community" })} />
      )}
      {screen.name === "community" && (
        <JourneyExperience27
          onHome={() => setScreen({ name: "home" })}
          onOpenCommunity={(journey) => setScreen({ name: "detail", journey })}
        />
      )}
      {screen.name === "detail" && (
        <CommunityJourneyPage
          journey={screen.journey}
          onBack={() => setScreen({ name: "community" })}
        />
      )}
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NativeApp />
  </StrictMode>,
);
