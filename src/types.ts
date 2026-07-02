export type Tier = "Common" | "Uncommon" | "Rare" | "Mystery";

/** One detected breed candidate from the vision API. */
export interface BreedGuess {
  name: string;
  confidence: number; // 0..1
}

/** Raw result returned by the detection proxy (mirrors the spec's contract). */
export interface DetectResult {
  breeds: BreedGuess[];
  isMixed: boolean;
  notes: string;
}

/** A badge definition from the breed lookup table. */
export interface BadgeDef {
  badgeId: string;
  breed: string; // canonical display name
  tier: Tier;
  funFact: string;
  emoji: string; // glyph shown on the medallion
}

/** A recorded scan, persisted to localStorage. */
export interface Scan {
  id: string;
  breed: string; // canonical breed name (matches a BadgeDef.breed)
  badgeId: string;
  confidence: number;
  timestamp: string; // ISO 8601
}

/** The full persisted app state. */
export interface StoredState {
  scans: Scan[];
  unlockedBadges: string[]; // badgeIds
}

/** Outcome of processing a detection through the unlock rules. */
export interface ScanOutcome {
  badge: BadgeDef;
  confidence: number;
  isNewUnlock: boolean;
  scanCountForBreed: number;
  isMixed: boolean;
  notes: string;
}
