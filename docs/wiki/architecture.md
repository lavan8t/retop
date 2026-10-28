# retop Architecture & Invariants

This document outlines the core architectural boundaries, extension lifecycles, and engineering rules that govern **retop**.

---

## 1. Extension Lifecycle & Architecture Map

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser Tab                              │
│                      vtop.vit.ac.in                              │
│                                                                  │
│  ┌─ injected.ts ─────────────────────────┐ (MAIN WORLD)          │
│  │  Legacy bridge + captcha solver hook  │                       │
│  └──────────────────┬────────────────────┘                       │
│                     │ CustomEvent                                │
│  ┌─ content.ts ─────▼──────────────────────────────────────┐     │
│  │  Document-start Bootstrapper (~2 KB, zero imports)      │     │
│  │  • Reads role from localStorage                         │     │
│  │  • On login routes: window.stop() + mount shadow root   │     │
│  │  • On auth routes: cloaks body & imports dashboard.js   │     │
│  └──────────────────┬──────────────────────────────────────┘     │
│                     │ dynamic import()                           │
│  ┌──────────────────▼──────────────────────────────────────┐     │
│  │  Shadow DOM Host: #retop-host                           │     │
│  │  ┌─ login.js (Sign-in card)                             │     │
│  │  └─ dashboard.js (React 19 App + Zustand Data Stores)   │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Invariants

1. **Keep Shadow DOM Isolated:**
   All retop React components mount inside the `#retop-host` Shadow DOM. Never inject styling rules into the host document head that could interfere with native VTOP pages.
2. **Teardown Safety Guarantee:**
   If an uncaught exception or unrecoverable error occurs, retop calls `dismantleRetopMods()` to immediately tear down injected elements, uncloak the native document, and restore standard portal controls. VTOP must never be left in an unusable state.
3. **Pure HTML Parsers:**
   All parsers in `src/parsers/` receive raw HTML strings and return pure typed objects. Parsers never make network requests, access `localStorage`, or read UI state.
4. **Schema Versioning:**
   Every parser module exports a `SCHEMA_VERSION`. Cached objects wrapped with `Versioned<T>` carry metadata that automatically purges stale records whenever portal markup evolves.
5. **Three-Tier Storage Model:**
   Storage flows through `chrome.storage.local` → `IndexedDB` → `localStorage`. Scoped keys use registration numbers to ensure complete data isolation between different user accounts.
6. **Zero External Backend:**
   retop runs entirely client-side in the browser. It never transmits passwords, credentials, or student academic data to any third-party server.
