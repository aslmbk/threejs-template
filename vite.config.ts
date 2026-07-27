import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Both are large enough that discovering them mid-session triggers a
    // re-optimize and a full page reload in dev. Pre-bundling them keeps the
    // first import quiet.
    include: ["three/webgpu", "three/tsl"],
  },
  build: {
    rollupOptions: {
      output: {
        // Three changes far less often than app code, so giving it its own
        // chunk lets it stay cached across deploys. The draco decoder is loaded
        // on demand by DRACOLoader and must keep its own lazy chunk.
        manualChunks: (id: string) =>
          id.includes("node_modules/three/") && !id.includes("/draco/")
            ? "three"
            : undefined,
      },
    },
  },
});
