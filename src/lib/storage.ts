import type { Scan, StoredState } from "../types.ts";

const KEY = "pawscan.v1";

const EMPTY: StoredState = { scans: [], unlockedBadges: [] };

/** Read the persisted state, tolerating corrupt/absent data. */
export function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      scans: Array.isArray(parsed.scans) ? parsed.scans : [],
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function saveState(state: StoredState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled — the game still works for the session */
  }
}

/** Append a scan and unlock its badge if new. Returns the updated state. */
export function recordScan(
  scan: Scan,
): { state: StoredState; isNewUnlock: boolean; scanCountForBreed: number } {
  const state = loadState();
  state.scans.push(scan);

  const already = state.unlockedBadges.includes(scan.badgeId);
  const isNewUnlock = !already;
  if (isNewUnlock) state.unlockedBadges.push(scan.badgeId);

  const scanCountForBreed = state.scans.filter((s) => s.badgeId === scan.badgeId).length;

  saveState(state);
  return { state, isNewUnlock, scanCountForBreed };
}

/** First-scan timestamp for a badge, or null if never scanned. */
export function firstScannedAt(badgeId: string, state: StoredState): string | null {
  const hits = state.scans
    .filter((s) => s.badgeId === badgeId)
    .map((s) => s.timestamp)
    .sort();
  return hits[0] ?? null;
}

/** Number of times a given badge's breed has been scanned. */
export function scanCount(badgeId: string, state: StoredState): number {
  return state.scans.filter((s) => s.badgeId === badgeId).length;
}
