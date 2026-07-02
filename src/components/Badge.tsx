import type { BadgeDef, Tier } from "../types.ts";
import "./Badge.css";

const TIER_CLASS: Record<Tier, string> = {
  Common: "tier-common",
  Uncommon: "tier-uncommon",
  Rare: "tier-rare",
  Mystery: "tier-mystery",
};

interface BadgeProps {
  badge: BadgeDef;
  locked?: boolean;
  size?: number; // px diameter of the medallion
  showLabel?: boolean;
  onClick?: () => void;
}

/**
 * A pure CSS/SVG collectible medallion. Unlocked = full tier color;
 * locked = grey silhouette with a "?" glyph.
 */
export function Badge({
  badge,
  locked = false,
  size = 96,
  showLabel = true,
  onClick,
}: BadgeProps) {
  const tierClass = TIER_CLASS[badge.tier];
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      className={`badge ${tierClass} ${locked ? "locked" : ""} ${onClick ? "clickable" : ""}`}
      style={{ ["--badge-size" as string]: `${size}px` }}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={locked ? "Undiscovered badge" : `${badge.breed} (${badge.tier})`}
    >
      <span className="badge-ring" aria-hidden="true" />
      <span className="badge-shine" aria-hidden="true" />
      <span className="badge-glyph" aria-hidden="true">
        {locked ? "?" : badge.emoji}
      </span>
      {showLabel && (
        <span className="badge-label">{locked ? "???" : badge.breed}</span>
      )}
    </Wrapper>
  );
}
