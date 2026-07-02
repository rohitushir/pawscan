import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local dev, `vercel dev` serves /api/* functions. If you run plain
// `vite` without vercel, set DETECT_PROXY to a running proxy origin and the
// dev server will forward /api requests there (see README / dev shim).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: process.env.DETECT_PROXY
      ? { "/api": { target: process.env.DETECT_PROXY, changeOrigin: true } }
      : undefined,
  },
});
