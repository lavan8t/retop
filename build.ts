/**
 * build.ts — Bun-native build script replacing Vite.
 *
 * Usage:
 *   bun run build.ts           # dev build
 *   bun run build.ts --prod    # production (minified)
 *
 * Steps:
 *   1. Clean dist/
 *   2. Bun.build() content scripts (content.ts, injected.ts, background.ts)
 *   3. Bun.build() popup + offline React apps
 *   4. Tailwind CLI for CSS (input.css → style.css, login-theme.css → login.css)
 *   5. Copy HTML files into dist/ with rewritten script paths
 */

import { rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename } from "path";

const IS_PROD = process.argv.includes("--prod") || process.argv.includes("--production");

// Build number
const d = new Date();
const pad = (n: number) => n.toString().padStart(2, "0");
const buildNumber =
  d.getFullYear() +
  pad(d.getMonth() + 1) +
  pad(d.getDate()) +
  "_" +
  pad(d.getHours()) +
  pad(d.getMinutes()) +
  pad(d.getSeconds());

const ROOT = import.meta.dir;
const DIST = resolve(ROOT, "dist");

// ── Step 0: Clean dist/ ──────────────────────────────────────────────
console.log("Cleaning dist/...");
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
mkdirSync(resolve(DIST, "assets"), { recursive: true });

// ── Step 1: Build content scripts (IIFE, no splitting) ──────────────
console.log("Building content scripts...");
const contentBuild = await Bun.build({
  entrypoints: [
    resolve(ROOT, "src/content.ts"),
    resolve(ROOT, "src/injected.ts"),
    resolve(ROOT, "src/background.ts"),
  ],
  outdir: DIST,
  target: "browser",
  format: "esm",
  splitting: false,
  minify: IS_PROD,
  naming: "[name].[ext]",
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    "process.env.NODE_ENV": JSON.stringify(IS_PROD ? "production" : "production"),
  },
  plugins: [{
    name: "ignore-css",
    setup(build) {
      build.onResolve({ filter: /\.css$/ }, (args) => {
        return { path: args.path, external: true };
      });
    },
  }],
});

if (!contentBuild.success) {
  console.error("Content script build failed:");
  for (const log of contentBuild.logs) console.error(log);
  process.exit(1);
}
console.log("  - content.js, injected.js, background.js");

// ── Step 2: Build offline React bundle ──────────────────────────────
console.log("Building offline...");
const popupBuild = await Bun.build({
  entrypoints: [
    resolve(ROOT, "src/offline.tsx"),
  ],
  outdir: DIST,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: IS_PROD,
  naming: "[name].[ext]",
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    "process.env.NODE_ENV": JSON.stringify(IS_PROD ? "production" : "production"),
  },
  // CSS handled by Tailwind CLI — tell Bun to ignore .css imports
  plugins: [{
    name: "ignore-css",
    setup(build) {
      build.onResolve({ filter: /\.css$/ }, (args) => {
        return { path: args.path, external: true };
      });
    },
  }],
});

if (!popupBuild.success) {
  console.error("Offline build failed:");
  for (const log of popupBuild.logs) console.error(log);
  process.exit(1);
}
console.log("  - offline.js");

// ── Step 3: Tailwind CSS via CLI ────────────────────────────────────
console.log("Building CSS with Tailwind...");

// input.css → dist/style.css
const tailwindProc = Bun.spawnSync([
  "bunx", "tailwindcss",
  "-i", resolve(ROOT, "src/input.css"),
  "-o", resolve(DIST, "style.css"),
  ...(IS_PROD ? ["--minify"] : []),
], { cwd: ROOT, stdio: ["inherit", "inherit", "inherit"] });

if (tailwindProc.exitCode !== 0) {
  console.error("Tailwind build failed for input.css");
  process.exit(1);
}
console.log("  - style.css");

// login-theme.css → dist/login.css
const loginCssProc = Bun.spawnSync([
  "bunx", "tailwindcss",
  "-i", resolve(ROOT, "src/login-theme.css"),
  "-o", resolve(DIST, "login.css"),
  ...(IS_PROD ? ["--minify"] : []),
], { cwd: ROOT, stdio: ["inherit", "inherit", "inherit"] });

if (loginCssProc.exitCode !== 0) {
  console.error("Tailwind build failed for login-theme.css");
  process.exit(1);
}
console.log("  - login.css");

// prelogin.css → dist/prelogin.css
const preloginCssProc = Bun.spawnSync([
  "bunx", "tailwindcss",
  "-i", resolve(ROOT, "src/styles/prelogin.css"),
  "-o", resolve(DIST, "prelogin.css"),
  ...(IS_PROD ? ["--minify"] : []),
], { cwd: ROOT, stdio: ["inherit", "inherit", "inherit"] });

if (preloginCssProc.exitCode !== 0) {
  console.error("Tailwind build failed for prelogin.css");
  process.exit(1);
}
console.log("  - prelogin.css");

// ── Step 4: Copy + rewrite HTML files ───────────────────────────────
console.log("Processing HTML...");

function processHtml(srcPath: string, outName: string, jsEntryName: string) {
  let html = readFileSync(srcPath, "utf-8");
  // Replace source script tags with built JS
  html = html.replace(
    /<script\s+type="module"\s+src="[^"]*">\s*<\/script>/,
    `<script type="module" src="./${jsEntryName}.js"></script>`
  );
  writeFileSync(resolve(DIST, outName), html);
}

processHtml(resolve(ROOT, "offline.html"), "offline.html", "offline");
console.log("  - offline.html");

// ── Step 5: Copy static assets ──────────────────────────────────────
console.log("Copying static assets...");

// Copy fonts
const fontsDir = resolve(DIST, "fonts");
mkdirSync(fontsDir, { recursive: true });
const publicFontsDir = resolve(ROOT, "public/fonts");
if (existsSync(publicFontsDir)) {
  for (const file of new Bun.Glob("*.woff2").scanSync(publicFontsDir)) {
    copyFileSync(resolve(publicFontsDir, file), resolve(fontsDir, file));
  }
  console.log("  - fonts/");
}

// Copy public assets
const publicAssetsDir = resolve(ROOT, "public/assets");
const distAssetsDir = resolve(DIST, "assets");
if (existsSync(publicAssetsDir)) {
  for (const file of new Bun.Glob("*").scanSync(publicAssetsDir)) {
    copyFileSync(resolve(publicAssetsDir, file), resolve(distAssetsDir, file));
  }
  console.log("  - assets/");
}

// ── Done: Report sizes ──────────────────────────────────────────────
import { statSync, readdirSync, readFileSync } from "fs";
import { gzipSync } from "zlib";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

console.log("\nOutput Sizes:");

let totalSize = 0;
let totalGzipSize = 0;

function reportSizes(dir: string, prefix = "dist/") {
  const files = readdirSync(dir, { withFileTypes: true });
  for (const entry of files) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      reportSizes(p, prefix + entry.name + "/");
    } else {
      const size = statSync(p).size;
      const content = readFileSync(p);
      const gzipSize = gzipSync(content).length;
      
      totalSize += size;
      totalGzipSize += gzipSize;
      
      const fileStr = prefix + entry.name;
      const paddingLength = Math.max(1, 48 - fileStr.length);
      const padding = ".".repeat(paddingLength);
      
      const sizeStr = formatBytes(size).padStart(9, " ");
      const gzipStr = formatBytes(gzipSize).padStart(9, " ");
      
      console.log(`\x1b[36m${fileStr}\x1b[0m ${padding} \x1b[33m${sizeStr}\x1b[0m \x1b[90m│ gzip:\x1b[0m \x1b[33m${gzipStr}\x1b[0m`);
    }
  }
}

reportSizes(DIST);

const totalPaddingLength = Math.max(1, 48 - "Total Size".length);
const totalPadding = ".".repeat(totalPaddingLength);
console.log(`\x1b[1mTotal Size\x1b[0m ${totalPadding} \x1b[33m${formatBytes(totalSize).padStart(9, " ")}\x1b[0m \x1b[90m│ gzip:\x1b[0m \x1b[33m${formatBytes(totalGzipSize).padStart(9, " ")}\x1b[0m`);

console.log(`\n\x1b[32m✓ Build Complete! (${IS_PROD ? "Production" : "Development"})\x1b[0m`);
console.log(`Build Number: ${buildNumber}`);
