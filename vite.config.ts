import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

export default defineConfig({
  base: "/APLamp/",
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
