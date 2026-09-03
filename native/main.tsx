import { StrictMode, lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CommunityJourney } from "../app/communityData";
import "../app/globals.css";
import "../app/journey-theme.css";
import "../app/journey-refinement.css";
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
