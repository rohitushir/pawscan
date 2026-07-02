Dog Breed Scanner — MVP Specs

1. Concept

Scan a dog with your camera → app identifies the breed(s) → unlock a collectible badge. Build a personal "dog passport" over time. Fun-first, shareable, weekend-buildable.

2. Goals for v1


Prove the core loop is fun (scan → reveal → collect)
Shippable in a weekend
No accounts, no backend, no payments
Something people will screenshot and post


Out of scope for v1: login/auth, leaderboards, social feed, push notifications, monetization, custom-trained ML model.

Platform: iOS only for v1 (mobile-web or native — TBD). Android is a later expansion, not part of this scope.


3. User Flow


Open app → camera view with a "Scan" button
Take/upload photo of a dog
Loading state (short, playful — "Sniffing out the breed…")
Result screen: breed name(s) + confidence %, badge reveal animation
Badge added to collection
Option to share result card (image) or scan another dog
Collection screen: grid of unlocked badges + locked silhouettes for undiscovered ones



4. Screens

ScreenPurposeKey elementsHome / ScanEntry pointCamera preview, "Scan" button, mini collection counter (e.g. "12/40 badges")ResultReveal breed + badgeBreed name, confidence %, badge artwork, "Share" + "Scan Again" buttonsCollectionTrack progressGrid of badges (unlocked = full color, locked = grey silhouette), tap for detailBadge DetailInfo per breedBadge art, breed name, fun fact, rarity tier, date first scanned


5. Tech Stack (fast-to-ship choices)


Frontend: React (mobile-web, responsive, targeting Safari/iOS) — or plain HTML/JS if going even leaner. Native Swift is an option later but adds build time; mobile-web is the faster v1 path even while scoped to iOS only
Camera input: native <input type="file" accept="image/*" capture="environment"> — works fine in iOS Safari, no custom camera component needed in v1
Breed detection: Vision-capable LLM API (e.g. Claude or GPT-4V) with a structured prompt — returns breed name(s) + confidence, no model training required
Storage: Browser localStorage — scan history + unlocked badges (per device, no accounts)
Badge assets: Pre-made static images (~30–40 badges), stored locally or in a simple assets folder
Share export: Render result card to canvas → export as PNG for sharing



6. Breed Detection — API Contract

Prompt pattern:

Identify the dog breed(s) in this image.
Return only JSON:
{
  "breeds": [{"name": "Labrador Retriever", "confidence": 0.82}],
  "isMixed": false,
  "notes": "short fun fact about the breed"
}

Fallback: if confidence is low across the board, return a "Mystery Mix" result — this is a good outcome, not a failure state (it's genuinely more fun for mixed breeds).


7. Badge System


Tiers: Common (popular breeds: Labrador, Golden Retriever, etc.), Uncommon, Rare (less common breeds), Mystery (unidentifiable/mixed)
Mapping: simple lookup table — breedName → { badgeId, tier, artwork, funFact }
Unlock rule: first scan of a breed unlocks its badge permanently in localStorage
Duplicate scans: don't unlock anything new, but can show "Already in your collection!" with scan count for that breed



8. Data Model (localStorage)

json{
  "scans": [
    { "id": "uuid", "breed": "Labrador Retriever", "confidence": 0.82, "timestamp": "..." }
  ],
  "unlockedBadges": ["labrador-retriever", "mystery-mix"]
}


9. Weekend Build Plan

TimeTaskDay 1 AMCamera/upload UI, wire up vision API call, display raw JSON resultDay 1 PMBadge mapping logic + reveal animationDay 2 AMCollection grid screen (locked/unlocked states)Day 2 PMShareable card export, visual polish, bug pass


10. Success Criteria for v1


Can scan a real photo and get a plausible breed back
Badge reveal feels satisfying (this is the whole game — worth extra polish time)
Collection screen makes you want to "complete the set"
At least one person outside yourself says "let me try this on my dog"



11. Possible v2 Ideas (not now)


Accounts + cloud sync
Leaderboard among friends
Seasonal/limited-edition badges
B2B white-label for vet clinics / pet brands