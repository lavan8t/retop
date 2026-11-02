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
┌──────────────────────────────────────────────────────┐
│                    Browser Tab                       │
│  vtop.vit.ac.in                                      │
│                                                      │
│  ┌─ injected.ts ──────────────┐  (MAIN WORLD)        │
│  │  Legacy bridge + captcha   │                      │
│  └────────────┬───────────────┘                      │
│               │ CustomEvent                          │
│  ┌─ content.ts ────────────────────────────────┐     │
│  │  Bootstrapper, ~2 KB, zero static imports   │     │
│  │  • Role read from localStorage, zero ticks  │     │
│  │  • window.stop() + shadow skeleton on login │     │
│  │  • Cloaks body on authenticated routes      │     │
│  │  • import()s login.js or dashboard.js       │     │
│  └──────┬─────────────────────┬─────────────────┘     │
│         │                     │                       │
│         │ import()            │ import()              │
│  ┌──────▼──────────┐  ┌───────▼────────────────┐      │
│  │ content/        │  │ content/dashboard.ts    │      │
│  │   login.tsx     │  │ • fetch/XHR interception│      │
│  │                 │  │ • VTOP processLoader    │      │
│  │ Renders the one  │  │ • tokens → renderDash-  │      │
│  │ VtopLoginCard   │  │   board()               │      │
│  │ in the shadow   │  └───┬───────────────┬─────┘      │
│  │ root, then hands │      │               │            │
│  │ off to VTOP      │      ▼               ▼            │
│  └─────────────────┘  ┌────────────────────────────────┐│
│                       │  Shadow DOM (#retop-host)       ││
│                       │  React App (app.tsx)            ││
│                       │  ├── Zustand stores             ││
│                       │  ├── VTOPNetwork (cached fetch) ││
│                       │  ├── HTML parsers               ││
│                       │  └── Pages (15 views)           ││
│                       └────────────────────────────────┘│
│  ┌─ NativePortals.tsx ────────────────────────────┐  │
│  │  React portals into legacy DOM header icons    │  │
│  │  (parent/alumni native sign-in only)           │  │
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
│  Offline-only React app on getretop.web.app           │
│  • PIN-locked account switching                       │
│  • Cached timetable, attendance, marks viewer         │
│  • Never a live login: prompts to sign in on VTOP     │
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
| Import-free bootstrapper | `content.ts` is evaluated on every VTOP page load. Top-level imports would be paid for on routes retop does not own, so the entry decides first and `import()`s one of two deferred ESM bundles. |
| `window.stop()` on login routes | Aborts the HTML stream and every pending subresource before the parser lays out VTOP's Bootstrap login page. Costs nothing: the takeover replaces the document anyway. |
| Role mirrored to localStorage | The bootstrapper must pick a surface inside the first task. IndexedDB cannot answer in time; localStorage can. `roleStore.ts` keeps both in sync. |
| Redirect-following on live VTOP | Same-origin fetches carry JSESSIONID themselves, and `redirect: "manual"` resolves to an opaque redirect (status 0, no Location). `vtopBridge.ts` forces `follow` + `credentials: "include"` on `*.vit.ac.in` only. |
| One login implementation | `VtopLoginCard` + `VtopClient` + `captchaSolver` serve live login, the offline PWA, and standalone. No DOM-surgery duplicate. |
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
├── content.ts          # document_start bootstrapper (~2 KB, zero imports)
├── content/
│   ├── login.tsx       # Deferred ESM: login takeover entry
│   └── dashboard.ts    # Deferred ESM: authenticated pages + native legacy
├── background.ts       # Service worker
├── injected.ts         # Main world legacy bridge + captcha
├── webBridge.ts        # PWA connection bridge
├── offline.tsx         # Standalone offline app
├── standalone.tsx      # Standalone extension page
├── input.css           # Tailwind v4 entry stylesheet
├── login-theme.css     # VtopLoginCard styling (style.css + login.css in shadow)
│
├── pages/              # Full page React views (15 modules)
│   ├── app.tsx         # Root router and sync orchestrator
│   ├── home.tsx        # Dashboard with widgets
│   ├── timetable.tsx   # Timetable views
│   ├── attendance.tsx  # Attendance tracking
│   ├── grades.tsx      # Grade history
│   ├── marks.tsx       # Marks
│   ├── calendar.tsx    # Academic calendar
│   ├── course-page.tsx # Course detail view
│   ├── curriculum.tsx  # Curriculum
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

0. **Keep `content.ts` import-free.** It runs at `document_start` on every VTOP page. A static import there is evaluated whether or not retop owns the route. Heavy work belongs in `src/content/login.tsx` or `src/content/dashboard.ts`, loaded with `import(chrome.runtime.getURL(...))`. Both must stay listed in `web_accessible_resources` in `manifest.json` and `manifest.firefox.json`.
1. **Git commits on verified completion.** When a task is properly verified and completed, create a git commit for the changes before moving on to the next task. Never run `git push`, `git checkout -b`, or `git rebase` unless explicitly asked.
2. **Check branch before making changes.** Always verify the active git branch and working tree status before editing code or starting work on a task.
3. **Do not mutate legacy navigation elements.** Never delete or inject into `#vtop-header`, `#top-hmenu-bar`, or native navigation buttons in legacy mode.
4. **Keep Shadow DOM isolated.** All retop UI renders inside `#retop-host`. Never inject global styles into the host document head.
4b. **Never hand-roll a second sign-in form.** Live VTOP login, the offline PWA, and standalone mode all render `VtopLoginCard` with `VtopClient`. Validation, CAPTCHA solving, and submission belong to that one module. Native VTOP login markup is only ever restyled for parent/alumni roles, which retop does not own.
5. **Preserve variable font transitions.** Never set `!important` on `font-variation-settings` or apply universal font rules on `*`.
6. **Protect element transitions.** Never declare global `transition-property` on `*, ::before, ::after` in `@layer base`.

### Strong preferences

6. **Hydrate from cache first.** Load stored attendance, timetable, CGPA, and assignment data immediately on mount. Avoid blank loading screens.
7. **Use storageAdapter for persistent data.** Do not call `chrome.storage.local` or `IndexedDB` directly outside the adapter layer. Role access goes through `roleStore.ts` instead, which mirrors to localStorage for synchronous reads.
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
19. **No retop-page-builder skill file exists** (`.agents/skills/retop-page-builder/SKILL.md` missing). Follow `CONTRIBUTING.md` seams until added.

### Build and tooling

20. **Build using Bun.** `bun run build` runs `tsc --noEmit && bun run build.ts` and halts immediately on type errors before bundling. Do not run standalone `tsc --noEmit` commands prior to `bun run build`.
21. **Compile CSS with Tailwind CLI.** Bun build ignores CSS imports. Tailwind CLI compiles `input.css` into `style.css`.
22. **Test on Chrome and Firefox.** Maintain and test both `manifest.json` and `manifest.firefox.json`.
23. **Build deferred entries as ESM.** `login.js` and `dashboard.js` are loaded through runtime `import()`, so they need `format: "esm"`. The `ignore-css` build plugin marks `.css` imports external; never rely on CSS imports for critical styling — use `adoptExtensionStyles` from `utils/bridge.ts`.

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
- `content/dashboard.ts` is ~890 KB minified and loads on every authenticated page. Split the React app further or lazy-load views if cold start matters.
- Login page still carries `captchaSolver` + bitmaps, which dominates the 14 KB login bundle.
- `standalone.tsx` and `offline.tsx` still build fake `#authorizedIDX` inputs and set `window.csrfValue` to satisfy `renderDashboard`. A real session interface would delete that.

### Resolved technical debt
- Removed unused Next.js configuration.
- Streamlined `build.ts` to avoid redundant CSS build passes.
- Added strict Base64 image parsing and multi-user storage scoping.
- Deleted the in-place login/prelogin DOM surgery (`injectLoginTheme`, `injectPreloginTheme`, `enhanceLegacyLogin`, `enhancePrelogin*`, the home-button MutationObserver, and the 30 s CAPTCHA poll) plus the duplicate field validation in `injected.ts`. Login now renders `VtopLoginCard` behind one shadow root.
- Deleted `src/styles/prelogin.css`; `login.css` still styles `VtopLoginCard`.
- Removed the `homeBtnObserver` MutationObserver that re-queried every button on each mutation, and the never-disconnected ASCII spark observer.
- Fixed login theme colors in shadow root by adding missing theme variables to login-theme.css and centered ASCII art in login takeover.
- Fixed login theme colors (pure black background), adjusted ASCII art (bigger, bottom-aligned, more opaque, Courier New font), and fixed VIT logo visibility with invert filter.

---

## Enterprise standards checklist

| Standard / Capability | Status | Notes |
|-----------------------|--------|-------|
| Runtime schema validation | Partial | `validateParsed` + `Versioned` provide versioned contracts; Zod schemas removed in refactor. |
| Repository abstraction layer | Partial | `storageAdapter.ts` and `network.ts` wrap I/O. Formal data stores pending. |
| Parser schema versioning | Implemented | All 16 parsers export `SCHEMA_VERSION` and register in `src/parsers/version.ts`. |
| Cache TTL expiration | Implemented | Time-based cache expiration and force-refresh supported in `cache.ts`. |
| IndexedDB storage | Partial | Large datasets use `idb-keyval`. Settings use `localStorage` and `chrome.storage`. |
| Content Security Policy | Implemented | Strict MV3 CSP configured in Chrome and Firefox manifests. |
| Minimal OAuth scopes | Implemented | Scopes limited to Google Drive app data and Google Calendar. |
| Local data encryption | Implemented | WebCrypto AES-GCM 256-bit encryption with PBKDF2 for offline credentials. |
| React error boundaries | Implemented | Root, view router, and PWA boundaries with recovery fallbacks. |
| Unit tests for parsers | Partial | `bun test` covers pure helpers; DOM-dependent parsers are verified in Chromium via `scripts/verify-proctor-photo.ts` (Bun's runner has no `DOMParser`). |
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
2b. **The proctor section can contain the student's photo.** When a faculty member has no image on file, VTOP reuses the student's own photo inside `#collapseFour` — either as a `studentPhoto` path or as the byte-identical inlined data URI. `isStudentPhotoSrc` rejects both, and `resolveProctorPhoto` then fetches the real image from `/vtop/users/image/staffPhoto?id=<FACULTY ID>` with a `StudentProfileAllView` Referer. Never render `proctor.photoUrl` without that resolver having run; the parser alone cannot fetch.
3. **Spacebar hotkey conflicts.** Always check whether document focus is inside an `<input>`, `<textarea>`, `<select>`, or `contentEditable` element before intercepting spacebar events. Retop Omnibox handles spacebar in capture phase only when the retop UI is active.
4. **Digital assignment endpoints and codes.** The semester selector uses `examinations/StudentDA`. Course listings use `examinations/doDigitalAssignment?semesterSubId=...`. Assignment detail requests must call `examinations/processDigitalAssignment` (not `processViewStudentDA`). The upload flow is `processDigitalAssignmentUpload` (`classId`, `mode=<code>`) → `doDAssignmentUploadMethod` (`authorizedID`, `_csrf`, `studDaUpload`, `code`, `opt`, `classId`, `mCode`). Never derive `code` from the title or serial number: VTOP only exposes it through the active row's hidden `code`/`mCode` inputs or a submitted row's `data-code`. A guessed code 404s or targets the wrong assignment. Modifying an existing submission triggers `doDAssignmentOtpUpload` with `otpEmail` only; a new submission does not.
5. **Parser schema invalidation.** All parsers in `src/parsers/` must export `SCHEMA_VERSION`. Update the version in `src/parsers/version.ts` whenever VTOP HTML structure changes to invalidate outdated caches.
6. **Manual redirects are opaque same-origin.** In `executeVtopRequest`, `redirect: "manual"` on a live VTOP page yields a filtered response with status 0 and no `Location`. The client-side redirect chain in `VtopClient` only runs on the Android bridge and extension pages. On live pages read the final URL off `response.url` and treat the body as the destination page.
7. **`window.stop()` is not free to undo.** Once the bootstrapper stops the parser on a login route, the VTOP login markup never exists. Parent and alumni sign-in therefore runs unstyled, on the entry they navigated to. Do not add logic that depends on native login DOM on student routes.
8. **The PWA is offline-only and must stay that way.** `getretop.web.app` is an ordinary web origin: VTOP sends no `Access-Control-Allow-Origin`, so it can never reach VTOP. It offers passcode unlock plus cached data only — never a live login form. If nothing is cached it prompts the user to sign in on `vtop.vit.ac.in` once. There is deliberately **no** relay: do not add one. `isWebPageContext()` guards `executeVtopRequest` so a stray call fails with an actionable message instead of an opaque CORS error.
9. **`username` is not the registration number.** VTOP's sign-in field is `username` (placeholder "Username"); the reg no is a *different* value returned after login. Every authenticated endpoint sends `authorizedID`, and every cache key is scoped by the reg no, so `VtopClient` must fail the login when no reg no can be extracted — never substitute the username for it. `VtopClient.loginUsername` and `VtopClient.registrationNumber` are distinct fields.
10. **Two session models, not one.** `isAmbientSessionContext()` covers same-origin VTOP pages only: the browser owns the cookie jar, redirects are followed, and `Set-Cookie` is never read. `getCaptchaJar` covers extension pages and the Android bridge. Anything added to the login flow must pick the right one via that helper.
11. **VTOP serves two different login variants — support both.** Verified against a real session capture:
    - Chain: `GET /vtop/open/page` → `POST /vtop/prelogin/setup` (`flag=VTOP`, `_csrf`) → **302** `/vtop/init/page` → **302** absolute `/vtop/login`. Two hops; `redirect: "follow"` covers both. `/vtop/init/page` is already in `LOGIN_ROUTES`.
    - **Variant A** — `/vtop/login` carries `_csrf, username, password, gResponse`, renders reCAPTCHA, and embeds **no** captcha. The image comes from a separate `GET /vtop/get/new/captcha`, which returns `text/html` wrapping a JPEG data URI.
    - **Variant B** — `/vtop/login` carries `_csrf, username, password, captchaStr` and embeds the captcha inline.
    - So: try the inline data URI first, then fall back to the endpoint. Both are required. `getCaptchaLive` does exactly this.
    - `/vtop/get/new/captcha` wants `Referer: /vtop/open/page` (observed), not `/vtop/login`, and `Accept: text/html,...,image/*,*/*;q=0.8`. Without `image/*` it can answer with the role-selection page instead.
    - The login POST sends `_csrf, username, password, captchaStr, gResponse`. Send `gResponse` empty: it matches Variant A's form, and Variant B ignores it.
12. **pdf.js must never be statically imported.** It probes for `eval` support with `new Function("")` at module load, which `getretop.web.app` blocks under its CSP. The probe is caught by pdf.js and only degrades rendering, but it logs a CSP violation on every page load. Import `@quicktoolsone/pdf-compress` dynamically inside the one function that needs it (large-PDF DA upload). `build.ts` also rewrites the probe in emitted bundles; `injected.js` is deliberately excluded because its `new Function` is an intentional, validated call into VTOP's main world.

---

## Maintenance

Update this file when:
- Adding or refactoring modules.
- Changing state stores or data flow.
- Introducing new project constraints or rules.
- Modifying build scripts or dependencies.

**Last updated**: 2026-10-15

---

## Agent skills

### Issue tracker

GitHub issues tracked via the `gh` CLI in `lavan8t/retop`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Known issues

Open findings and follow-ups from the VTOP telemetry audit: `docs/agents/known-issues.md`.

