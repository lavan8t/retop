# VIT-AP Biometric Log — live endpoint map

Probed on a logged-in VIT-AP session, 2026-11-21. No tokens, cookies or
credentials are stored here. All responses are `text/html;charset=UTF-8`.

## Live facts

| Item | Value |
|---|---|
| Menu item: log | `Biometric Log` → `academics/biometriclogdisplay` |
| Menu item: info | `Biometric Info` → `academics/common/BiometricInfo` |
| Shell pages | POST with `_csrf`, `authorizedID`, `x`; HTML form with `#fromDate` + `#search` calling `getStudViewBioList()` |
| Date format | log: `dd/mm/yyyy`; info: `dd-M-yyyy` |
| Data endpoint | `POST /vtop/getStudBioHistory` (flat) with `_csrf`, `authorizedID`, `fromDate`, `x` |
| Data response | ~2829 bytes; fragment with `<table class="table table-bordered">` |
| Alternative | `POST /vtop/getStudViewBioList` (flat) — 200 but only a ~469 byte no-records/container fragment; not used |
| 404 | Nested `academics/biometriclogdisplay/getStudBioHistory` — endpoint must be flat |

The data table has no `thead`: the first `tr` is the header
`Sl.No | Punch Date | Punch Time | Venue`, followed by data rows such as
`1 | 21/11/2026 | 15:28 | AB2-301-FACE`.

## Implementation (path:line)

- Data shape: `BiometricPunch` — `src/types/vtop.ts:488`
- Pure parser (header/empty-row skip, date/time/venue normalization), version
  constant `SCHEMA_VERSION = 1` — `src/parsers/biometric.ts:4`,
  `src/parsers/biometric.ts:38`
- Schema registry entry — `src/parsers/version.ts:24`, `src/parsers/version.ts:43`
- Campus-guarded network call (`campus !== 'vitap'` returns `''` without a
  request; `fetchVtopApi` supplies `_csrf` / `authorizedID` / `x`) —
  `src/utils/network.ts:1603`
- Page-local state (no store slice): date picker defaulting to today, Search,
  loading/empty/error states, accessible table — `src/pages/biometric.tsx:24`
- View routing — `src/types/vtop.ts:15`, `src/utils/routes.ts:18`,
  `src/utils/routes.ts:149`
- Router case — `src/components/layout/ContentRouter.tsx:149`
- Nav: omnibox quick link — `src/components/layout/TopBarSearch.tsx:124`;
  AP-only profile-menu item — `src/components/profile-menu.tsx:100`;
  page title — `src/components/layout/appShell.tsx:33`
- Tests: parser fixture/red→green — `src/parsers/__tests__/biometric.test.ts:42`;
  campus guard — `src/utils/__tests__/biometric.test.ts:4`

## Scope / risk

VIT-AP only. On other campuses the page shows an "Only available on VIT-AP"
empty state and the network method short-circuits. Unverified: live behaviour
after a VTOP DOM change to the punch table (schema version is registered so a
stale cache can be invalidated later).

## Past-history caching and timeline UX (2026-11-21)

The endpoint accepts **one** `fromDate` per request (range params 404), so bulk
history is sequential single-day fetches. `network`'s existing rate limiter
(0.5s cooldown, 60 req/min) already paces them; no extra per-day delay was
added. "Load past 30 days" walks yesterday backwards, updates a
`Fetched N of M days` progress bar, and is cancellable.

Cache rules (`src/utils/biometricCache.ts`):

- Keys are `retop_biometric_<authId>_<yyyy-mm-dd>` via `storageAdapter`.
- Only dates **strictly before today** are written or read. Today is never
  cached because its punches grow during the day.
- Single-day search of a past date is cache-first: a "Cached" label marks those
  days and a per-day refresh control forces a fresh fetch.
- Cached payload is only `BiometricPunch[]` (slNo, date, time, venue) — no
  credentials, cookies or CSRF tokens.

Presentation: punches are sorted by date/time, grouped by punch date (most
recent day first, chronological within a day), each day gets an
`In / Out / count` summary, and rows render as a compact vertical time rail
rather than a table-like list. Tests cover the cache rules and the pure
grouping/summary helpers.
