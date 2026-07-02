// Smoke-test a deployed /api/detect endpoint.
//
// Usage:
//   node scripts/smoke-detect.mjs <endpoint-url> [image.jpg]
//   DETECT_URL=https://your-app.vercel.app/api/detect node scripts/smoke-detect.mjs
//
// If PAWSCAN_APP_TOKEN is set in the env, it's sent as the x-app-token header.
// With no image, a 1x1 PNG is sent — the pipeline should still return a valid
// (low-confidence "Mystery Mix") shape, which is enough to prove it works.
import { readFileSync } from "node:fs";

const endpoint = process.argv[2] || process.env.DETECT_URL;
if (!endpoint) {
  console.error("Provide the endpoint: node scripts/smoke-detect.mjs <url> [image]");
  process.exit(1);
}

const imagePath = process.argv[3];
const appToken = process.env.PAWSCAN_APP_TOKEN || process.env.VITE_PAWSCAN_APP_TOKEN;

// 1x1 transparent PNG fallback.
const ONE_PX_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const imageBase64 = imagePath
  ? readFileSync(imagePath).toString("base64")
  : ONE_PX_PNG;
const mediaType = imagePath?.match(/\.(png)$/i)
  ? "image/png"
  : imagePath?.match(/\.(webp)$/i)
    ? "image/webp"
    : imagePath?.match(/\.(gif)$/i)
      ? "image/gif"
      : imagePath
        ? "image/jpeg"
        : "image/png";

const headers = { "Content-Type": "application/json" };
if (appToken) headers["x-app-token"] = appToken;

async function post() {
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ imageBase64, mediaType }),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, retryAfter: res.headers.get("retry-after"), body };
}

console.log(`→ Endpoint: ${endpoint}`);
console.log(`→ Image:    ${imagePath || "(built-in 1x1 png)"}`);
console.log(`→ Token:    ${appToken ? "sending x-app-token" : "none"}\n`);

// --- Test 1: a single detection request ------------------------------------
const first = await post();
console.log(`[1] Single request → HTTP ${first.status}`);
console.log("    body:", JSON.stringify(first.body));
if (first.status === 200 && Array.isArray(first.body?.breeds)) {
  console.log("    ✓ valid detection shape\n");
} else if (first.status === 401) {
  console.log("    ✗ 401 — token gate is on; set PAWSCAN_APP_TOKEN to match the server\n");
  process.exit(1);
} else {
  console.log("    ✗ unexpected response — check ANTHROPIC_API_KEY / logs\n");
  process.exit(1);
}

// --- Test 2: burst to confirm the rate limiter trips -----------------------
const BURST = Number(process.env.BURST || 30);
console.log(`[2] Firing ${BURST} rapid requests to trip the rate limit...`);
const results = await Promise.all(Array.from({ length: BURST }, post));
const codes = results.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});
console.log("    status counts:", JSON.stringify(codes));
if (codes[429]) {
  console.log(`    ✓ rate limiter tripped (${codes[429]}× 429)\n`);
} else {
  console.log(
    "    ⚠ no 429s — limit may be higher than the burst, or Upstash isn't the bottleneck.\n" +
      "      Raise BURST (e.g. BURST=60) or lower RATE_LIMIT_MAX to confirm.\n",
  );
}

console.log("Done.");
