import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The frontend builds into the server's static directory so the single Node
// server can serve the SPA, the REST API and the collab WebSocket on one port.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../server/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/collab": { target: "ws://localhost:3000", ws: true },
    },
    fs: {
      // Allow importing the shared /common sources during dev.
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname)],
    },
  },
});
