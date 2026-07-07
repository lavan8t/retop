import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const d = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const buildNumber = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());

export default defineConfig({
  base: "",
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
  },
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "dist",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.ts"),
        injected: resolve(__dirname, "src/injected.ts"),
        background: resolve(__dirname, "src/background.ts"),
        style: resolve(__dirname, "src/input.css"),
        login: resolve(__dirname, "src/login-theme.css"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css" || assetInfo.name === "login.css" || assetInfo.name === "login-theme.css") {
            return "[name].css";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
});
