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
    modulePreload: false,
    emptyOutDir: false,
    outDir: "dist",
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        offline: resolve(__dirname, "offline.html"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion', 'zustand']
        }
      },
    },
  },
});
