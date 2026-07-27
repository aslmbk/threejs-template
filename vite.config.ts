import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), glsl()],
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
