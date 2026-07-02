import { useState } from "react";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { ResultScreen } from "./screens/ResultScreen.tsx";
import { CollectionScreen } from "./screens/CollectionScreen.tsx";
import { BadgeDetailScreen } from "./screens/BadgeDetailScreen.tsx";
import { loadState } from "./lib/storage.ts";
import { BADGE_BY_ID, TOTAL_BADGES } from "./data/breeds.ts";
import type { ScanOutcome, StoredState } from "./types.ts";
import "./App.css";

type Screen = "home" | "result" | "collection" | "detail";

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [state, setState] = useState<StoredState>(() => loadState());
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  const unlockedCount = state.unlockedBadges.length;

  function handleScanned(next: ScanOutcome) {
    setOutcome(next);
    setState(loadState()); // reflect the newly recorded scan/unlock
    setScreen("result");
  }

  function goCollection() {
    setState(loadState());
    setScreen("collection");
  }

  const selectedBadge = selectedBadgeId ? BADGE_BY_ID[selectedBadgeId] : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="paw">🐾</span> PawScan
        </div>
        <button
          className="counter-pill"
          onClick={goCollection}
          aria-label="View collection"
        >
          {unlockedCount}/{TOTAL_BADGES} badges
        </button>
      </header>

      <main className="screen">
        {screen === "home" && <HomeScreen onScanned={handleScanned} />}

        {screen === "result" && outcome && (
          <ResultScreen
            outcome={outcome}
            onScanAgain={() => setScreen("home")}
            onViewCollection={goCollection}
          />
        )}

        {screen === "collection" && (
          <CollectionScreen
            state={state}
            onSelectBadge={(id) => {
              setSelectedBadgeId(id);
              setScreen("detail");
            }}
          />
        )}

        {screen === "detail" && selectedBadge && (
          <BadgeDetailScreen
            badge={selectedBadge}
            state={state}
            onBack={() => setScreen("collection")}
          />
        )}
      </main>

      {(screen === "home" || screen === "collection") && (
        <nav className="tabbar">
          <button
            className={`tab ${screen === "home" ? "active" : ""}`}
            onClick={() => setScreen("home")}
          >
            📷<span>Scan</span>
          </button>
          <button
            className={`tab ${screen === "collection" ? "active" : ""}`}
            onClick={goCollection}
          >
            🏅<span>Collection</span>
          </button>
        </nav>
      )}
    </div>
  );
}
