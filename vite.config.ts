import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),

        canvasParticles: resolve(import.meta.dirname, "demos/canvas-particles/index.html"),

        staticWebgl2: resolve(import.meta.dirname, "demos/static-webgl2/index.html"),

        dynamicWebgl2: resolve(import.meta.dirname, "demos/dynamic-webgl2/index.html"),
      },
    },
  },
});
