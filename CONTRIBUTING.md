# Contributing to retop

Thank you for your interest in improving retop! This guide covers repository setup, architectural design seams, testing procedures, and code standards.

---

## 1. Local Development Setup

### Prerequisites
- [Bun](https://bun.sh) (v1.1 or higher)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/lavan8t/retop.git
cd retop
bun install
```

### Building the Extension
Build the development bundle:
```bash
bun run build
```
This runs TypeScript type checking (`tsc --noEmit`), compiles CSS via Tailwind, bundles JavaScript modules via Bun, and populates the `dist/` directory.

### Loading into your Browser
1. **Google Chrome / Brave / Edge / Chromium:**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select the `dist/` folder
2. **Mozilla Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on...**
   - Select `manifest.firefox.json` in the repository root

---

## 2. Architecture & Seams

Retop operates as a client-side layer directly inside the university portal. When developing new features, respect these architectural seams:

1. **Pure Parsers (`src/parsers/`):**
   - Parsers receive an HTML string or `Document` and return pure TypeScript data structures.
   - Parsers must never touch `window`, `localStorage`, or React stores.
   - All parser functions return `Versioned<T>` using `validateParsed(data, moduleId)`.
2. **Teardown Invariant (`src/utils/bridge.ts`):**
   - If an unhandled error occurs on live portal pages, `dismantleRetopMods()` restores native VTOP immediately without displaying intrusive crash screens or locking the browser body scrollbar.
3. **Storage & Cache (`src/utils/storageAdapter.ts` & `src/utils/cache.ts`):**
   - Storage uses a three-tier model: `chrome.storage.local` -> `IndexedDB` -> `localStorage`.
   - Never write raw un-scoped keys into `localStorage` directly from UI components. Always use the central store slices or `setCachedData`.

---

## 3. Testing & Verification

Before opening a pull request, run the test suite and verify compilation:
```bash
# Run unit tests
bun test

# Build production bundle
bun run build:prod
```
All pull requests must pass automated CI checks.
