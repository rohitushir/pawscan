import { BADGES, TOTAL_BADGES } from "../data/breeds.ts";
import type { StoredState } from "../types.ts";
import { Badge } from "../components/Badge.tsx";
import "./CollectionScreen.css";

interface CollectionScreenProps {
  state: StoredState;
  onSelectBadge: (badgeId: string) => void;
}

/** Grid of all badges: unlocked in color, locked as grey silhouettes. */
export function CollectionScreen({ state, onSelectBadge }: CollectionScreenProps) {
  const unlocked = new Set(state.unlockedBadges);
  const count = unlocked.size;
  const pct = Math.round((count / TOTAL_BADGES) * 100);

  return (
    <div className="collection">
      <div className="collection-head">
        <h1 className="collection-title">Your Collection</h1>
        <p className="collection-sub muted">
          {count} of {TOTAL_BADGES} badges discovered
        </p>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="badge-grid">
        {BADGES.map((badge) => {
          const isUnlocked = unlocked.has(badge.badgeId);
          return (
            <Badge
              key={badge.badgeId}
              badge={badge}
              locked={!isUnlocked}
              size={72}
              onClick={isUnlocked ? () => onSelectBadge(badge.badgeId) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
