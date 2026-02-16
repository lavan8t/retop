import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "dist",
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.ts"),
        injected: resolve(__dirname, "src/injected.ts"),
        style: resolve(__dirname, "src/input.css"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "style.css";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
});
