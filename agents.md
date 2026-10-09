# retop-ext project intelligence and agent rules

> Living documentation for retop architecture, constraints, and operational rules for human developers and AI assistants. Update this file when project conventions change.

---

## Project identity

retop is a browser extension for Chrome and Firefox that replaces VIT University's legacy VTOP portal with a fast Material 3 interface. It intercepts network requests, parses raw HTML responses into typed data, and renders the UI inside an isolated Shadow DOM.

### What retop is
- A Manifest V3 browser extension running on `vtop.vit.ac.in` and `vtopcc.vit.ac.in`.
- A React application mounted inside an isolated Shadow DOM (`#retop-host`).
- A cache-first client where views hydrate immediately from IndexedDB or chrome storage.
- A companion PWA (`getretop.web.app`) for offline access.
- A zero-refresh client-side router built on `window.history.pushState`.
- A workspace companion supporting Google Drive backup and iCal calendar export.

### What retop is not
- Not a standard web application or Next.js app.
- Not a REST API consumer. It parses server-rendered HTML pages directly.
- Not a standalone service. It runs on top of active VTOP student sessions.

---

## Architecture map

```
┌──────────────────────────────────────────────────────┐
│                    Browser Tab                       │
│  vtop.vit.ac.in                                      │
│                                                      │
│  ┌─ injected.ts ──────────────┐  (MAIN WORLD)        │
│  │  Intercepts captcha token  │                      │
│  └────────────┬───────────────┘                      │
│               │ CustomEvent                          │
│  ┌─ content.ts ───────────────────────────────────┐  │
│  │  • Overrides fetch and XHR to capture responses│  │
│  │  • Injects Shadow DOM host (#retop-host)       │  │
│  │  • Mounts React app.tsx inside Shadow DOM      │  │
│  │  • Injects login and prelogin theme CSS        │  │
│  │  • Patches VTOP processLoader                  │  │
│  └────────────┬───────────────────────────────────┘  │
│               │                                      │
│  ┌─ Shadow DOM (#retop-host) ─────────────────────┐  │
│  │  React App (app.tsx)                           │  │
│  │  ├── Zustand stores (appStore and dataStore)   │  │
│  │  ├── VTOPNetwork (fetch wrapper with cache)    │  │
│  │  ├── HTML Parsers (one per VTOP module)        │  │
│  │  └── Pages (dashboard, timetable, grades)      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ NativePortals.tsx ────────────────────────────┐  │
│  │  React portals into legacy DOM header icons    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

┌── background.ts (Service Worker) ─────────────────────┐
│  • Download filename handling                         │
│  • Message relay between content script and PWA tabs  │
│  • Google OAuth token management                      │
└───┬───────────────────────────────────────────────────┘

┌── webBridge.ts ───────────────────────────────────────┐
│  Detects extension presence on getretop.web.app       │
│  Routes to offline.tsx when extension is installed    │
└───────────────────────────────────────────────────────┘

┌── offline.tsx (PWA) ──────────────────────────────────┐
│  Standalone React app for chrome-extension pages      │
│  • PIN-locked account switching                       │
│  • Cached timetable and attendance viewer             │
│  • ASCII canvas background animation                  │
└───────────────────────────────────────────────────────┘
```

### Data flow
```
VTOP server -> fetch/XHR interceptor -> raw HTML string
  -> parser (DOMParser + regex) -> typed TypeScript objects
  -> Zustand store slice -> React component
  -> cache.ts (IndexedDB + chrome.storage + localStorage)
```

### Key technical decisions
| Decision | Rationale |
|----------|-----------|
| Shadow DOM isolation | Prevents host VTOP CSS from colliding with retop styles. |
| Network interception | Operates without a backend proxy and respects native CSRF tokens. |
| Zustand for state | Minimal boilerplate compared to Redux, fits extension lifecycle. |
| Bun native bundler | Fast build times with zero Webpack or Vite config overhead. |
| HTML parsing | VTOP lacks an API, so the extension parses server-rendered tables. |
| Tiered cache storage | Shares state across content scripts and extension pages. |

---

## Directory layout

```
src/
├── content.ts          # Main content script entry (72KB)
├── background.ts       # Service worker
├── injected.ts         # Main world captcha token interceptor
├── webBridge.ts        # PWA connection bridge
├── offline.tsx         # Standalone offline app
├── input.css           # Tailwind v4 entry stylesheet
├── login-theme.css     # Login page styling
│
├── pages/              # Full page React views (15 modules)
│   ├── app.tsx         # Root router and sync orchestrator
│   ├── home.tsx        # Dashboard with widgets
│   ├── timetable.tsx   # Timetable views
│   ├── attendance.tsx  # Attendance tracking
│   ├── grades.tsx      # Grade history
│   ├── marks.tsx       # Internal marks
│   ├── calendar.tsx    # Academic calendar
│   ├── course-page.tsx # Course detail view
│   ├── curriculum.tsx  # Curriculum audit
│   ├── digital-assignments.tsx  # Assignment tracker
│   ├── exam-schedule.tsx        # Exam schedule
│   ├── late-hour.tsx   # Late hour requests
│   ├── profile.tsx     # Student profile and ID card
│   └── settings.tsx    # Theme, backup, and sync settings
│
├── components/         # Reusable React components
│   ├── layout/         # TopBar, TopBarSearch, Sidebar
│   ├── home/           # Dashboard widgets
│   ├── attendance/     # Attendance cards and charts
│   ├── timetable/      # Grid and list timetable layouts
│   ├── grades/         # Grade cards
│   ├── course-page/    # Course sub-components
│   ├── profile/        # ID card and info grids
│   ├── settings/       # Settings panels
│   ├── ui/             # Generic primitives: Card, Dropdown
│   ├── icons/          # Icon components
│   └── legacy/         # Compatibility wrappers for legacy DOM
│
├── store/              # Zustand state stores
│   ├── appStore.ts     # UI state (view mode, search, alerts)
│   ├── dataStore.ts    # Composed academic data store
│   └── slices/         # Domain state slices
│
├── parsers/            # HTML to typed data parsers (16 modules)
├── hooks/              # Custom React hooks
├── utils/              # Business logic utilities
├── types/              # TypeScript definitions
└── styles/             # CSS tokens, typography, dark mode
```

---

## Rules for agents

### Absolute rules

1. **Git commits on verified completion.** When a task is properly verified and completed, create a git commit for the changes before moving on to the next task. Never run `git push`, `git checkout -b`, or `git rebase` unless explicitly asked.
2. **Check branch before making changes.** Always verify the active git branch and working tree status before editing code or starting work on a task.
3. **Do not mutate legacy navigation elements.** Never delete or inject into `#vtop-header`, `#top-hmenu-bar`, or native navigation buttons in legacy mode.
4. **Keep Shadow DOM isolated.** All retop UI renders inside `#retop-host`. Never inject global styles into the host document head.
5. **Preserve variable font transitions.** Never set `!important` on `font-variation-settings` or apply universal font rules on `*`.
6. **Protect element transitions.** Never declare global `transition-property` on `*, ::before, ::after` in `@layer base`.

### Strong preferences

6. **Hydrate from cache first.** Load stored attendance, timetable, CGPA, and assignment data immediately on mount. Avoid blank loading screens.
7. **Use storageAdapter for persistent data.** Do not call `chrome.storage.local` or `IndexedDB` directly outside the adapter layer.
8. **Make minimal diffs.** Prefer surgical line edits over file rewrites.
9. **Reach for native platform APIs first.** Prefer CSS, HTML, and Web APIs before adding third-party npm packages.
10. **Reuse existing code.** Check stores, utils, hooks, and types before writing new implementations.
11. **Delete dead code immediately.** Remove unused functions and imports rather than leaving commented-out blocks.
12. **Enforce user data isolation.** Prefix all cached student data with the user registration number (`${authId}_...`). Never use un-scoped global keys like generic `retop_profileImage`.
13. **Validate profile image data URIs.** Always pass student profile photos through `fixBase64Image` to guarantee a valid `data:image/...;base64,...` URI. Raw base64 strings or bare relative paths in `img.src` cause `net::ERR_INVALID_URL` errors.

### Coding style

14. **Manage shared state in Zustand.** Put global state in `appStore.ts` or `dataStore.ts` slices. Keep component prop drilling under three levels.
15. **One parser per VTOP module.** Keep each parser isolated in `src/parsers/`. Parsers receive raw HTML strings and return typed objects.
16. **Explicit TypeScript types.** Declare return types on parsers, store slices, and component props in `src/types/` or co-located files.
17. **Tailwind v4 styling.** Apply Tailwind utilities inside the Shadow DOM. Store design tokens in `src/styles/tokens.css`.
18. **Default to Google Sans Flex.** Do not introduce extra font families without discussion.
19. **Follow the retop-page-builder guide.** Use `.agents/skills/retop-page-builder/SKILL.md` when adding or refactoring views (TopBar actions, left-aligned filters, empty states, and scoped caching).

### Build and tooling

20. **Build using Bun.** `bun run build` runs `tsc --noEmit && bun run build.ts` and halts immediately on type errors before bundling. Do not run standalone `tsc --noEmit` commands prior to `bun run build`.
21. **Compile CSS with Tailwind CLI.** Bun build ignores CSS imports. Tailwind CLI compiles `input.css` into `style.css`.
22. **Test on Chrome and Firefox.** Maintain and test both `manifest.json` and `manifest.firefox.json`.

---

## Shortcuts and directives

- **`/remember <rule>`** or **`remember: <rule>`** or **`/learn <rule>`**: Shortcut to record new constraints into this file.
- **`build`**: Shortcut for `bun run build`.

---

## Project vision and roadmap

### Goals
1. Provide a modern, reliable replacement for every VTOP module.
2. Maintain offline access for timetable, attendance, and grades via the companion PWA.
3. Keep navigation fast through client-side routing and instant search.
4. Protect student privacy. All data stays on the local device with zero telemetry.

### Active technical debt
- Monolithic page files (several exceed 800 lines) require component decomposition.
- Large static bitmaps and SVG assets stored inside TypeScript files increase bundle size.

### Resolved technical debt
- Removed unused Next.js configuration.
- Streamlined `build.ts` to avoid redundant CSS build passes.
- Added strict Base64 image parsing and multi-user storage scoping.

---

## Enterprise standards checklist

| Standard / Capability | Status | Notes |
|-----------------------|--------|-------|
| Runtime schema validation | Implemented | Zod schemas validate parsed contracts across all 16 parsers with graceful fallbacks. |
| Repository abstraction layer | Partial | `storageAdapter.ts` and `network.ts` wrap I/O. Formal data stores pending. |
| Parser schema versioning | Implemented | All 16 parsers export `SCHEMA_VERSION` and register in `src/parsers/version.ts`. |
| Cache TTL expiration | Implemented | Time-based cache expiration and force-refresh supported in `cache.ts`. |
| IndexedDB storage | Partial | Large datasets use `idb-keyval`. Settings use `localStorage` and `chrome.storage`. |
| Content Security Policy | Implemented | Strict MV3 CSP configured in Chrome and Firefox manifests. |
| Minimal OAuth scopes | Implemented | Scopes limited to Google Drive app data and Google Calendar. |
| Local data encryption | Implemented | WebCrypto AES-GCM 256-bit encryption with PBKDF2 for offline credentials. |
| React error boundaries | Implemented | Root, view router, and PWA boundaries with recovery fallbacks. |
| Unit tests for parsers | Todo | `bun test` fixtures for HTML parser outputs pending. |
| Mock network integration tests | Todo | Automated interceptor tests pending. |
| Chrome end-to-end tests | Todo | Playwright extension test suite pending. |
| Firefox end-to-end tests | Todo | Web-ext automated test harness pending. |
| Bundle size thresholds | Partial | `build.ts` logs chunk sizes. Strict CI budget caps pending. |
| Dependency auditing | Partial | Regular manual audits with ponytail. Automated CI audit pending. |
| Static security scans | Todo | CodeQL or Trivy workflow integration pending. |
| Local crash diagnostics | Todo | Zero telemetry kept. Exportable local error log pending. |
| IndexedDB schema migrations | Todo | Schema version mismatch invalidates cache. Migration runner pending. |
| Feature flags | Partial | Local UI preferences in store. Central registry pending. |

---

## Recurring traps and anti-patterns

1. **Base64 vs server path collision.** Raw JPEG Base64 data starts with `/9j/` (the JPEG start-of-image marker). Never test `string.startsWith("/")` before checking Base64 magic headers (`/9j/`, `iVBOR`). Testing `/` first treats raw base64 data as a server path and produces 404 errors.
2. **VTOP image URL normalization.** Relative endpoints such as `users/image/studentPhoto` must resolve against `/vtop/` with credentials. In offline mode, store images as encrypted Base64 strings in IndexedDB.
3. **Spacebar hotkey conflicts.** Always check whether document focus is inside an `<input>`, `<textarea>`, `<select>`, or `contentEditable` element before intercepting spacebar events. Retop Omnibox handles spacebar in capture phase only when the retop UI is active.
4. **Digital assignment endpoints.** The semester selector uses `examinations/StudentDA`. Course listings use `examinations/doDigitalAssignment?semesterSubId=...`. Assignment detail requests must call `examinations/processDigitalAssignment` (not `processViewStudentDA`).
5. **Parser schema invalidation.** All parsers in `src/parsers/` must export `SCHEMA_VERSION`. Update the version in `src/parsers/version.ts` whenever VTOP HTML structure changes to invalidate outdated caches.

---

## Maintenance

Update this file when:
- Adding or refactoring modules.
- Changing state stores or data flow.
- Introducing new project constraints or rules.
- Modifying build scripts or dependencies.

**Last updated**: 2026-08-19
