import type { BadgeDef, DetectResult, Scan, ScanOutcome } from "../types.ts";
import { BADGES, MYSTERY_MIX } from "../data/breeds.ts";
import { recordScan } from "./storage.ts";

// Confidence below this (for the top guess) is treated as a Mystery Mix — a
// fun outcome per the spec, not a failure.
const MYSTERY_THRESHOLD = 0.4;

function createScanId(): string {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  if (typeof browserCrypto?.getRandomValues === "function") {
    const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10).join("")
    );
  }

  return "scan-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Precomputed match keys for each badge: its slug plus notable name tokens.
const MATCHERS: Array<{ badge: BadgeDef; slug: string; tokens: string[] }> = BADGES.map(
  (badge) => {
    const slug = slugify(badge.breed);
    const tokens = badge.breed
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length >= 4); // ignore short words like "dog", "the"
    return { badge, slug, tokens };
  },
);

/**
 * Map a free-text breed name from the model to a known BadgeDef.
 * Tries exact slug, then substring, then token overlap. Unknown → null.
 */
export function matchBadge(breedName: string): BadgeDef | null {
  const slug = slugify(breedName);
  if (!slug) return null;

  // 1. Exact slug match.
  const exact = MATCHERS.find((m) => m.slug === slug);
  if (exact) return exact.badge;

  // 2. Slug containment (handles "labrador" vs "labrador-retriever", "corgi" etc).
  const contained = MATCHERS.find((m) => m.slug.includes(slug) || slug.includes(m.slug));
  if (contained) return contained.badge;

  // 3. Token overlap (e.g. "german shepherd dog" → German Shepherd).
  const nameTokens = new Set(breedName.toLowerCase().split(/[^a-z]+/).filter(Boolean));
  const scored = MATCHERS.map((m) => ({
    badge: m.badge,
    score: m.tokens.filter((t) => nameTokens.has(t)).length,
  })).sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score > 0) return scored[0].badge;

  return null;
}

/**
 * Turn a raw detection into a resolved badge + unlock outcome, persisting the
 * scan. Applies the spec's rules: low confidence or unknown breed → Mystery
 * Mix; first scan of a breed unlocks permanently; duplicates just increment.
 */
export function resolveAndRecord(result: DetectResult): ScanOutcome {
  const top = result.breeds?.[0];
  const topConfidence = top?.confidence ?? 0;

  let badge: BadgeDef | null = null;
  if (top && topConfidence >= MYSTERY_THRESHOLD && !result.isMixed) {
    badge = matchBadge(top.name);
  }
  if (!badge) badge = MYSTERY_MIX;

  const scan: Scan = {
    id: createScanId(),
    breed: badge.breed,
    badgeId: badge.badgeId,
    confidence: topConfidence,
    timestamp: new Date().toISOString(),
  };

  const { isNewUnlock, scanCountForBreed } = recordScan(scan);

  return {
    badge,
    confidence: topConfidence,
    isNewUnlock,
    scanCountForBreed,
    isMixed: result.isMixed || badge.badgeId === "mystery-mix",
    notes: result.notes || badge.funFact,
  };
}
