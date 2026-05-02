import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Pre-bundle deps that are only reached through lazy-loaded routes so the
  // dev server doesn't return 504 (Outdated Optimize Dep) the first time the
  // user navigates to the route. Required for Leaflet because MapPage is
  // lazy-imported via React.lazy.
  optimizeDeps: {
    include: [
      "leaflet",
      "react-leaflet",
      "react-leaflet-cluster",
      "leaflet.markercluster",
    ],
  },
}));
