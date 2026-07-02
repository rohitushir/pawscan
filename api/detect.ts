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

// Best-effort in-memory per-IP rate limit. NOTE: serverless instances don't
// share memory, so this bounds a single warm instance rather than the whole
// deployment. For hard, global limits back this with a shared store (Upstash /
// Vercel KV) keyed the same way.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

const rateHits = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Req): string {
  const xff = req.headers?.["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  const ip = raw?.split(",")[0]?.trim();
  return ip || "unknown";
}

function rateLimit(key: string): { ok: boolean; retryAfter: number } {
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

  const limit = rateLimit(clientKey(req));
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
    res.status(502).json({ error: "Detection failed. Please try again." });
  }
}
