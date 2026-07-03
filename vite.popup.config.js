import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  base: "",
  plugins: [react()],
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
