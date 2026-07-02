// Tiny dev shim so `npm run dev` works without the Vercel CLI.
// It runs the same api/detect.ts handler behind a plain Node HTTP server.
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... npm run proxy   (port 3001)
//   then run:  DETECT_PROXY=http://localhost:3001 npm run dev
import { createServer } from "node:http";
const PORT = Number(process.env.DEV_PROXY_PORT || 3001);

const { default: handler } = await import("../api/detect.ts");

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

createServer(async (req, res) => {
  if (!req.url?.startsWith("/api/detect")) {
    res.writeHead(404).end("Not found");
    return;
  }
  const rawBody = await readBody(req);
  const shim = {
    status(code) {
      res.statusCode = code;
      return shim;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    json(body) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    },
  };
  await handler({ method: req.method, body: rawBody }, shim);
}).listen(PORT, () => {
  console.log(`[dev-proxy] /api/detect on http://localhost:${PORT}`);
  console.log(`[dev-proxy] now run:  DETECT_PROXY=http://localhost:${PORT} npm run dev`);
});
