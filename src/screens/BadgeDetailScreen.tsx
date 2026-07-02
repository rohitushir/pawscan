import type { BadgeDef, StoredState } from "../types.ts";
import { Badge } from "../components/Badge.tsx";
import { firstScannedAt, scanCount } from "../lib/storage.ts";
import "./BadgeDetailScreen.css";

interface BadgeDetailScreenProps {
  badge: BadgeDef;
  state: StoredState;
  onBack: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Detail view for a single unlocked badge. */
export function BadgeDetailScreen({ badge, state, onBack }: BadgeDetailScreenProps) {
  const count = scanCount(badge.badgeId, state);
  const first = firstScannedAt(badge.badgeId, state);

  return (
    <div className="detail">
      <button className="link-btn detail-back" onClick={onBack}>
        ← Collection
      </button>

      <div className="detail-hero">
        <Badge badge={badge} size={148} showLabel={false} />
        <span className={`detail-tier tier-${badge.tier.toLowerCase()}`}>
          {badge.tier}
        </span>
        <h1 className="detail-breed">{badge.breed}</h1>
      </div>

      <div className="detail-card">
        <p className="detail-fact">{badge.funFact}</p>
      </div>

      <div className="detail-stats">
        <div className="stat">
          <span className="stat-value">{formatDate(first)}</span>
          <span className="stat-label muted">First scanned</span>
        </div>
        <div className="stat">
          <span className="stat-value">{count}×</span>
          <span className="stat-label muted">Times scanned</span>
        </div>
      </div>
    </div>
  );
}
