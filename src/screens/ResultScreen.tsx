import { useEffect, useState } from "react";
import type { ScanOutcome } from "../types.ts";
import { Badge } from "../components/Badge.tsx";
import { shareOutcome } from "../lib/shareCard.ts";
import "./ResultScreen.css";

interface ResultScreenProps {
  outcome: ScanOutcome;
  onScanAgain: () => void;
  onViewCollection: () => void;
}

/** Reveal screen — the emotional payoff of the loop. */
export function ResultScreen({ outcome, onScanAgain, onViewCollection }: ResultScreenProps) {
  const [revealed, setRevealed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const pct = Math.round(outcome.confidence * 100);
  const isMystery = outcome.badge.badgeId === "mystery-mix";

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(id);
  }, []);

  async function handleShare() {
    setSharing(true);
    try {
      await shareOutcome(outcome);
    } catch {
      /* share/download failed silently — nothing actionable for the user */
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="result">
      <p className={`result-banner ${outcome.isNewUnlock ? "new" : "dupe"}`}>
        {outcome.isNewUnlock
          ? "✨ New badge unlocked!"
          : `Already in your collection! · scanned ${outcome.scanCountForBreed}×`}
      </p>

      <div className={`result-stage ${revealed ? "revealed" : ""}`}>
        {revealed && outcome.isNewUnlock && (
          <div className="sparkles" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        )}
        <div className="result-badge-wrap">
          <Badge badge={outcome.badge} size={168} showLabel={false} />
        </div>
      </div>

      <div className="result-info">
        <span className={`result-tier tier-${outcome.badge.tier.toLowerCase()}`}>
          {outcome.badge.tier}
        </span>
        <h1 className="result-breed">{outcome.badge.breed}</h1>
        <p className="result-confidence muted">
          {isMystery ? "A one-of-a-kind mystery mix!" : `${pct}% match`}
        </p>
        <p className="result-notes">{outcome.notes}</p>
      </div>

      <div className="result-actions">
        <button className="btn" onClick={() => void handleShare()} disabled={sharing}>
          {sharing ? "Preparing…" : "📤 Share Result"}
        </button>
        <button className="btn secondary" onClick={onScanAgain}>
          🔄 Scan Another Dog
        </button>
        <button className="link-btn" onClick={onViewCollection}>
          View collection →
        </button>
      </div>
    </div>
  );
}
