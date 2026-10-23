import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The dev-server proxy: the page is served from 5173, but any request under
// /api is forwarded to the backend (3100 locally, since 3000 is taken on this
// machine). Without this, /api calls would hit vite.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Vite bundles for the browser and can't see Deno workspace members,
      // so point the shared package at its source file.
      "@toybox/shared": fileURLToPath(new URL("../shared/mod.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3100",
    },
  },
});
