# 🐾 PawScan

Scan a dog with your camera → the app identifies the breed(s) → unlock a collectible
badge and build a personal "dog passport." Fun-first, no accounts, built as an iOS app with a web fallback.

Built from `Specs.md`. React + Vite (TypeScript) frontend wrapped with Capacitor for iOS, a tiny serverless proxy for
the Claude vision call, CSS/SVG-generated badges, and `localStorage` for the collection.

## How it works

```
Camera/upload → /api/detect (serverless) → Claude vision (structured JSON)
             → match breed to a badge → unlock in localStorage → reveal + collect
```

- **`api/detect.ts`** — serverless proxy. Holds `ANTHROPIC_API_KEY` (never shipped to the
  browser), calls Claude with the image + a JSON-schema `output_config` so the
  `{ breeds, isMixed, notes }` shape is guaranteed. Low confidence / no dog → "Mystery Mix."
- **`src/data/breeds.ts`** — the badge table (Common / Uncommon / Rare / Mystery). Add a row
  to add a breed.
- **`src/lib/unlock.ts`** — maps a free-text breed name to a badge and applies the unlock
  rules (first scan unlocks; duplicates just increment a counter).
- **`src/lib/shareCard.ts`** — renders a share card to `<canvas>` → PNG, shared via the Web
  Share API (iOS) with a download fallback.

## Run locally

Set your key first:

```sh
cp .env.example .env.local   # then edit ANTHROPIC_API_KEY
```

**Option A — Vercel CLI (closest to production):**

```sh
npm install
npx vercel dev            # serves the app + /api/detect together
```

**Option B — Vite + dev proxy shim (no Vercel needed):**

```sh
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run proxy                 # terminal 1 (port 3001)
DETECT_PROXY=http://localhost:3001 npm run dev            # terminal 2 (port 5173)
```

Open the printed URL on your phone (same network) or in a mobile-emulated browser.

## iOS app

The native app is generated in `ios/` with Capacitor. For device/TestFlight builds, deploy the API first and set the app to call that hosted endpoint:

```sh
VITE_DETECT_API_URL=https://your-vercel-app.vercel.app/api/detect npm run ios:sync
npm run ios:open
```

Then build/run from Xcode. The native app uses Capacitor Camera for camera/photo-library capture and compresses selected photos before sending them to the detector. Keep `ANTHROPIC_API_KEY` only on the deployed serverless API, never in the iOS app.

## Deploy

Deploy to Vercel; set `ANTHROPIC_API_KEY` (and optional `PAWSCAN_MODEL`) as environment
variables in the project settings. `vercel.json` handles the SPA rewrite and the
`api/` function.

## Config

| Env var             | Purpose                                                    |
| ------------------- | --------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Required. Used only by the serverless proxy.              |
| `PAWSCAN_MODEL`     | Optional. Vision model (default `claude-opus-4-8`). Cost lever: `claude-haiku-4-5` / `claude-sonnet-5`. |
| `VITE_DETECT_API_URL` | Required for native iOS builds. Full URL to the deployed `/api/detect` endpoint. |
