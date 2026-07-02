import Anthropic from "@anthropic-ai/sdk";

/**
 * Serverless proxy: browser sends a base64 dog photo, we call Claude vision
 * with a structured-output schema and return { breeds, isMixed, notes }.
 * The API key lives only here (process.env), never in the client bundle.
 *
 * Deployed as a Vercel Node function. Runs locally via `vercel dev` or the
 * dev shim in scripts/dev-proxy.mjs.
 */

const MODEL = process.env.PAWSCAN_MODEL || "claude-opus-4-8";

// --- Abuse protection -------------------------------------------------------
// This endpoint is a proxy to a paid vision API, so it needs guardrails against
// anyone who finds the URL and tries to burn the API budget.

// Reject oversized payloads before they ever reach Claude (cost + DoS guard).
// A ~1400px JPEG at quality 78 is well under 1M base64 chars; the default cap
// (~4.5M chars ≈ 3.3MB decoded) also sits under Vercel's request-body limit.
const MAX_IMAGE_BASE64_CHARS = Number(process.env.MAX_IMAGE_BASE64_CHARS || 4_500_000);

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

// Optional shared secret. When PAWSCAN_APP_TOKEN is set, callers must send a
// matching `x-app-token` header. NOTE: a mobile bundle can be extracted, so a
// baked-in token is a low-friction deterrent, not strong auth — it only raises
// the bar for casual abuse on top of the rate limit. Leave unset to disable.
const APP_TOKEN = process.env.PAWSCAN_APP_TOKEN || "";

// Upstash Redis (REST) gives a real deployment-wide limit that survives across
// serverless instances. When these are unset we fall back to the in-memory
// limiter below (per warm instance only). Any Upstash error also fails over to
// in-memory so a Redis outage can't take the endpoint down.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const rateHits = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Req): string {
  const xff = req.headers?.["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  const ip = raw?.split(",")[0]?.trim();
  return ip || "unknown";
}

function header(req: Req, name: string): string {
  const v = req.headers?.[name];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Constant-time-ish compare so token checks don't leak length/prefix via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function inMemoryRateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Opportunistically prune expired entries so the map can't grow unbounded.
  if (rateHits.size > 5000) {
    rateHits.forEach((v, k) => {
      if (now >= v.resetAt) rateHits.delete(k);
    });
  }

  const entry = rateHits.get(key);
  if (!entry || now >= entry.resetAt) {
    rateHits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

// Fixed-window counter in Upstash: INCR a per-window bucket key and give it a
// TTL. Returns null (not a decision) if Upstash isn't configured or errors, so
// the caller can fall back to the in-memory limiter.
async function upstashRateLimit(
  key: string,
): Promise<{ ok: boolean; retryAfter: number } | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;

  const now = Date.now();
  const windowSec = Math.max(1, Math.round(RATE_LIMIT_WINDOW_MS / 1000));
  const bucket = Math.floor(now / RATE_LIMIT_WINDOW_MS);
  const redisKey = `pawscan:rl:${key}:${bucket}`;

  try {
    const resp = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
      ]),
      // Don't let a slow Redis stall the request; fail over instead.
      signal: AbortSignal.timeout(1500),
    });
    if (!resp.ok) throw new Error(`Upstash HTTP ${resp.status}`);

    const results = (await resp.json()) as Array<{ result?: number; error?: string }>;
    const count = results?.[0]?.result;
    if (typeof count !== "number") throw new Error("Upstash: unexpected pipeline result");

    const retryAfter = windowSec - Math.floor((now % RATE_LIMIT_WINDOW_MS) / 1000);
    return { ok: count <= RATE_LIMIT_MAX, retryAfter: Math.max(1, retryAfter) };
  } catch (err) {
    console.error("[detect] Upstash rate-limit failed, using in-memory:", err);
    return null;
  }
}

async function rateLimit(key: string): Promise<{ ok: boolean; retryAfter: number }> {
  return (await upstashRateLimit(key)) ?? inMemoryRateLimit(key);
}

const ALLOWED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PROMPT = `Identify the dog breed(s) in this image.
If the image does not contain a dog, or the breed is genuinely unclear, that is fine —
return a low-confidence result (the app treats that as a fun "Mystery Mix").
Return breeds sorted by confidence, highest first. "notes" should be a short, fun,
one-sentence fact about the top breed (or about mixed-breed dogs if it's a mix).`;

// Structured-output schema — guarantees the JSON shape, no fragile parsing.
const SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    breeds: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name", "confidence"],
        additionalProperties: false,
      },
    },
    isMixed: { type: "boolean" },
    notes: { type: "string" },
  },
  required: ["breeds", "isMixed", "notes"],
  additionalProperties: false,
};

interface DetectRequestBody {
  imageBase64?: string;
  mediaType?: string;
}

// Minimal request/response typing so this compiles without @vercel/node types.
interface Req {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Optional shared-token gate (only enforced when PAWSCAN_APP_TOKEN is set).
  if (APP_TOKEN && !safeEqual(header(req, "x-app-token"), APP_TOKEN)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const limit = await rateLimit(clientKey(req));
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    res.status(429).json({ error: "Too many scans. Please wait a moment and try again." });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Don't reveal server config details to the client.
    console.error("[detect] ANTHROPIC_API_KEY is not set");
    res.status(500).json({ error: "The detector is temporarily unavailable." });
    return;
  }

  const body: DetectRequestBody =
    typeof req.body === "string" ? JSON.parse(req.body) : (req.body as DetectRequestBody) ?? {};

  const { imageBase64, mediaType } = body;

  if (!imageBase64 || !mediaType || !ALLOWED_MEDIA.has(mediaType)) {
    res.status(400).json({ error: "Provide imageBase64 and a supported mediaType (jpeg/png/webp/gif)" });
    return;
  }

  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    res.status(413).json({ error: "Image is too large. Try a smaller photo." });
    return;
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(502).json({ error: "No result from model" });
      return;
    }

    const parsed = JSON.parse(textBlock.text);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(parsed);
  } catch (err) {
    // Log the real error server-side; return a generic message so we don't
    // leak upstream/internal details (or key-related messages) to the client.
    console.error("[detect] detection failed:", err);
    // Opt-in diagnostic: set DETECT_DEBUG=1 in the env to include the real
    // error in the response while troubleshooting. Turn it OFF for production.
    const detail = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      error: "Detection failed. Please try again.",
      ...(process.env.DETECT_DEBUG === "1" ? { detail } : {}),
    });
  }
}
