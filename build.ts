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
 *   3. Bun.build() deferred ESM entries + offline & standalone React apps
 *   4. Tailwind CLI for CSS (input.css → style.css, login-theme.css → login.css)
 *   5. Copy HTML files into dist/ with rewritten script paths
 */

import { rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, realpathSync, statSync, readdirSync, cpSync } from "fs";
import { resolve, basename } from "path";
import { homedir } from "os";
import { gzipSync, deflateRawSync } from "zlib";

const IS_PROD = process.argv.includes("--prod") || process.argv.includes("--production");

// Parse -a / --archive option (crx | xpi | zip)
let archiveType: "crx" | "xpi" | "zip" | null = null;
const aIdx = process.argv.indexOf("-a");
if (aIdx !== -1 && process.argv[aIdx + 1]) {
  archiveType = process.argv[aIdx + 1].toLowerCase() as any;
} else {
  const aArg = process.argv.find((a: string) => a.startsWith("--archive="));
  if (aArg) archiveType = aArg.split("=")[1].toLowerCase() as any;
}

if (archiveType && !["crx", "xpi", "zip"].includes(archiveType)) {
  console.error(`\x1b[31mError: Invalid archive type '${archiveType}'. Allowed: -a crx | xpi | zip\x1b[0m`);
  process.exit(1);
}

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

const ROOT = resolve(".");
const DIST = resolve("dist");

// The archive is named after the manifest version, never a hardcoded number.
const VERSION = JSON.parse(
  readFileSync(resolve(ROOT, "manifest.json"), "utf-8"),
).version as string;

// ── Step 0: Clean dist/ ──────────────────────────────────────────────
try { rmSync(DIST, { recursive: true, force: true }); } catch {}
try { mkdirSync(resolve(DIST, "assets"), { recursive: true }); } catch {}

const commonDefine = {
  __BUILD_NUMBER__: JSON.stringify(buildNumber),
  "process.env.NODE_ENV": JSON.stringify("production"),
  "import.meta.url": '""',
  "import.meta": "{}",
};

const ignoreCssPlugin = {
  name: "ignore-css",
  setup(build: import("bun").PluginBuilder) {
    build.onResolve({ filter: /\.css$/ }, (args: import("bun").OnResolveArgs) => {
      return { path: args.path, external: true };
    });
  },
};

// ── Step 1: Build content scripts (IIFE, no splitting) ──────────────
console.log("Building content scripts...");
const contentBuild = await Bun.build({
  entrypoints: [
    resolve(import.meta.dir, "src/content.ts"),
    resolve(import.meta.dir, "src/injected.ts"),
    resolve(import.meta.dir, "src/background.ts"),
    resolve(import.meta.dir, "src/webBridge.ts"),
  ],
  outdir: DIST,
  target: "browser",
  format: "iife",
  splitting: false,
  minify: IS_PROD,
  naming: "[name].[ext]",
  define: commonDefine,
  plugins: [ignoreCssPlugin],
});

if (!contentBuild.success) {
  console.error("Content script build failed:");
  for (const log of contentBuild.logs) console.error(log);
  process.exit(1);
}
console.log("  - content.js, injected.js, background.js, webBridge.js");

// ── Step 1b: Deferred ESM entries for the document_start bootstrapper ────
// content.js stays import-free so it can decide in the first task. These two
// entries are fetched at runtime with import(chrome.runtime.getURL(...)), which
// only works when they are real ES modules in their own chunk graph.
console.log("Building deferred entries...");
const deferredBuild = await Bun.build({
  entrypoints: [
    resolve(import.meta.dir, "src/content/login.tsx"),
    resolve(import.meta.dir, "src/content/dashboard.ts"),
  ],
  outdir: DIST,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: IS_PROD,
  naming: "[name].[ext]",
  define: commonDefine,
  plugins: [ignoreCssPlugin],
});

if (!deferredBuild.success) {
  console.error("Deferred entry build failed:");
  for (const log of deferredBuild.logs) console.error(log);
  process.exit(1);
}
console.log("  - login.js, dashboard.js");

// ── Step 2: Build offline & standalone React bundles ────────────────
console.log("Building offline & standalone...");
const popupBuild = await Bun.build({
  entrypoints: [
    resolve(import.meta.dir, "src/offline.tsx"),
    resolve(import.meta.dir, "src/standalone.tsx"),
  ],
  outdir: DIST,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: IS_PROD,
  naming: "[name].[ext]",
  define: commonDefine,
  plugins: [ignoreCssPlugin],
});

if (!popupBuild.success) {
  console.error("Offline/Standalone build failed:");
  for (const log of popupBuild.logs) console.error(log);
  process.exit(1);
}
console.log("  - offline.js, standalone.js");

// Post-process bundled JS files (import.meta removal)
const sanitizeBundle = (filePath: string) => {
  if (existsSync(filePath)) {
    let content = readFileSync(filePath, "utf-8");
    content = content.replace(/import\.meta\.url/g, '""');
    content = content.replace(/import\.meta/g, '({})');
    writeFileSync(filePath, content);
  }
};
["content.js", "injected.js", "background.js", "webBridge.js", "login.js", "dashboard.js", "offline.js", "standalone.js"].forEach((file) => {
  sanitizeBundle(resolve(DIST, file));
});

// ── Step 2b: Neutralize pdf.js's eager eval probe ───────────────────────
// pdf.js detects eval support by calling `new Function("")` at module load.
// getretop.web.app forbids unsafe-eval, so that throws a CSP EvalError on every
// page and logs it, even though pdf.js catches it and falls back to its
// non-eval rendering path. The probe is rewritten to take the fallback branch
// directly.
//
// injected.js is skipped on purpose: its `new Function` is an intentional,
// validated call into VTOP's own main world.
let patchedProbes = 0;
for (const file of readdirSync(DIST)) {
  if (!file.endsWith(".js") || file === "injected.js") continue;
  const p = resolve(DIST, file);
  let src = readFileSync(p, "utf-8");
  if (!src.includes("new Function")) continue;
  const before = src;
  // Throwing makes the surrounding try/catch return false, which is exactly the
  // value a blocked probe already produced.
  src = src.replace(
    /new Function\(\s*(["'])\1\s*\)/g,
    "(() => { throw 0 })()",
  );
  if (src !== before) {
    patchedProbes++;
    writeFileSync(p, src);
  }
}
if (patchedProbes > 0) {
  console.log(`  - neutralized eval probe in ${patchedProbes} bundle file(s)`);
}

// ── Step 3: Tailwind CSS via CLI ────────────────────────────────────
console.log("Building CSS with Tailwind...");

const cssBuilds: [string, string, string][] = [
  ["src/input.css", "style.css", "style.css"],
  ["src/login-theme.css", "login.css", "login.css"],
];

const tailwindCli = resolve(ROOT, "node_modules/@tailwindcss/cli/dist/index.mjs");
for (const [srcRel, outRel, label] of cssBuilds) {
  const proc = Bun.spawnSync([
    process.execPath, tailwindCli,
    "-i", resolve(ROOT, srcRel),
    "-o", resolve(DIST, outRel),
    ...(IS_PROD ? ["--minify"] : []),
  ], { cwd: ROOT, stdio: ["inherit", "inherit", "inherit"] });

  if (proc.exitCode !== 0) {
    console.error(`Tailwind build failed for ${srcRel}`);
    process.exit(1);
  }
  console.log(`  - ${label}`);
}

// ── Step 4: Copy + rewrite HTML files ───────────────────────────────
console.log("Processing HTML...");

function processHtml(srcPath: string, outName: string, jsEntryName: string) {
  let html = readFileSync(srcPath, "utf-8");
  // Replace source script tags with built JS
  html = html.replace(
    /<script\s+type="module"\s+src="[^"]*">\s*<\/script>/,
    `<script type="module" src="/${jsEntryName}.js"></script>`
  );
  writeFileSync(resolve(DIST, outName), html);
}

processHtml(resolve(ROOT, "offline.html"), "offline.html", "offline");
console.log("  - offline.html");
processHtml(resolve(ROOT, "index.html"), "index.html", "standalone");
console.log("  - index.html");

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

// Copy PWA assets (manifest.webmanifest, sw.js)
const pwaManifest = resolve(ROOT, "public/manifest.webmanifest");
if (existsSync(pwaManifest)) {
  copyFileSync(pwaManifest, resolve(DIST, "manifest.webmanifest"));
  console.log("  - manifest.webmanifest");
}

const pwaSw = resolve(ROOT, "public/sw.js");
if (existsSync(pwaSw)) {
  copyFileSync(pwaSw, resolve(DIST, "sw.js"));
  console.log("  - sw.js");
}

// Copy icons
const iconsDir = resolve(ROOT, "icons");
const distIconsDir = resolve(DIST, "icons");
if (existsSync(iconsDir)) {
  mkdirSync(distIconsDir, { recursive: true });
  for (const file of new Bun.Glob("*").scanSync(iconsDir)) {
    copyFileSync(resolve(iconsDir, file), resolve(distIconsDir, file));
  }
  console.log("  - icons/");
}

// Copy PDF.js worker files for pdf-compress
const pdfjsSrcDir = resolve(ROOT, "node_modules/@quicktoolsone/pdf-compress/dist/pdf.js");
const pdfjsDistDir = resolve(DIST, "pdf.js");
if (existsSync(pdfjsSrcDir)) {
  mkdirSync(pdfjsDistDir, { recursive: true });
  for (const file of new Bun.Glob("*").scanSync(pdfjsSrcDir)) {
    copyFileSync(resolve(pdfjsSrcDir, file), resolve(pdfjsDistDir, file));
  }
  console.log("  - pdf.js/");
}

// Copy manifests for dist/
function writeDistManifest(srcPath: string, outName: string) {
  if (!existsSync(srcPath)) return;
  copyFileSync(srcPath, resolve(DIST, outName));
  console.log(`  - ${outName}`);
}

if (archiveType === "xpi" && existsSync(resolve(ROOT, "manifest.firefox.json"))) {
  writeDistManifest(resolve(ROOT, "manifest.firefox.json"), "manifest.json");
} else {
  writeDistManifest(resolve(ROOT, "manifest.json"), "manifest.json");
}
writeDistManifest(resolve(ROOT, "manifest.firefox.json"), "manifest.firefox.json");




// ── Done: Report sizes ──────────────────────────────────────────────

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

// ── Optional Archiving Step (-a crx | xpi | zip) ────────────────────
function crc32(buf: Uint8Array): number {
  let table = (globalThis as any).__crcTable;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    (globalThis as any).__crcTable = table;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createZipArchive(sourceDir: string, outputFile: string) {
  const fileEntries: {
    relPath: string;
    compressedData: Uint8Array;
    crc: number;
    uncompressedSize: number;
    compressedSize: number;
  }[] = [];

  function collectFiles(dir: string, base = "") {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = resolve(dir, item.name);
      const relPath = base ? `${base}/${item.name}` : item.name;
      if (item.isDirectory()) {
        collectFiles(fullPath, relPath);
      } else {
        const uncompressedData = new Uint8Array(readFileSync(fullPath));
        const compressedData = new Uint8Array(deflateRawSync(uncompressedData));
        const crc = crc32(uncompressedData);
        fileEntries.push({
          relPath,
          compressedData,
          crc,
          uncompressedSize: uncompressedData.length,
          compressedSize: compressedData.length,
        });
      }
    }
  }

  collectFiles(sourceDir);

  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let currentOffset = 0;

  for (const file of fileEntries) {
    const nameBytes = new TextEncoder().encode(file.relPath);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 8, true); // Method 8 = Deflate
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, file.crc, true);
    view.setUint32(18, file.compressedSize, true);
    view.setUint32(22, file.uncompressedSize, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localHeaders.push(localHeader);
    localHeaders.push(file.compressedData);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(centralHeader.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 8, true); // Method 8 = Deflate
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, file.crc, true);
    cView.setUint32(20, file.compressedSize, true);
    cView.setUint32(24, file.uncompressedSize, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, currentOffset, true);
    centralHeader.set(nameBytes, 46);

    centralHeaders.push(centralHeader);
    currentOffset += localHeader.length + file.compressedData.length;
  }

  const centralDirOffset = currentOffset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, fileEntries.length, true);
  eView.setUint16(10, fileEntries.length, true);
  eView.setUint32(12, centralDirSize, true);
  eView.setUint32(16, centralDirOffset, true);
  eView.setUint16(20, 0, true);

  const allParts = [...localHeaders, ...centralHeaders, eocd];
  const totalArchiveSize = allParts.reduce((acc, p) => acc + p.length, 0);
  const finalZip = new Uint8Array(totalArchiveSize);
  let writeOffset = 0;
  for (const part of allParts) {
    finalZip.set(part, writeOffset);
    writeOffset += part.length;
  }

  try {
    if (existsSync(outputFile)) {
      rmSync(outputFile, { force: true });
    }
    writeFileSync(outputFile, finalZip);
  } catch (err: any) {
    if (err.code === "EUNKNOWN" || err.code === "EBUSY" || err.code === "EPERM") {
      console.warn(`\n\x1b[33mWarning: ${outputFile} is locked by another program (likely Firefox).\x1b[0m`);
      const fallbackFile = outputFile.replace(/\.(zip|xpi)$/, `-${Date.now()}.$1`);
      console.log(`Writing to fallback file instead: ${fallbackFile}`);
      writeFileSync(fallbackFile, finalZip);
    } else {
      throw err;
    }
  }
}

if (archiveType) {
  // Alias crx to zip since CRX requires private key signing. Chrome expects ZIP for Web Store or unpacked.
  const actualArchiveType = archiveType === "crx" ? "zip" : archiveType;
  const archiveFilename = `retop-v${VERSION}.${actualArchiveType}`;
  const archivePath = resolve(ROOT, archiveFilename);

  if (archiveType === "xpi" && existsSync(resolve(ROOT, "manifest.firefox.json"))) {
    writeDistManifest(resolve(ROOT, "manifest.firefox.json"), "manifest.json");
  }

  console.log(`\n\x1b[36mCreating ${archiveType.toUpperCase()} archive:\x1b[0m ${archiveFilename}...`);
  createZipArchive(DIST, archivePath);

  const archiveSize = statSync(archivePath).size;
  console.log(`\x1b[32m✓ Archive Created!\x1b[0m (${formatBytes(archiveSize)}) → ${archiveFilename}`);
}

const shouldCopy = process.argv.includes("--copy") || process.argv.includes("--sync");
if (shouldCopy) {
  const target = resolve(homedir(), "storage/documents/dist");
  try {
    mkdirSync(resolve(homedir(), "storage/documents"), { recursive: true });
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
    cpSync(DIST, target, { recursive: true });
    console.log(`\x1b[32m✓ Synced dist/ -> ${target}\x1b[0m`);
  } catch (err) {
    console.warn(`\x1b[33mWarning: Failed to copy to ${target}\x1b[0m`, err);
  }
}

