# Known issues and follow-ups

Last updated: 2026-10-31, after the VTOP telemetry audit.

The audit used two native-VTOP captures in `telemetry/` (gitignored). They
contain real registration numbers and session HTML — never commit or share
them. The captures confirmed the upload/OTP contract and the assignment table
markup; retop itself was not loaded in those sessions, so retop-level requests
were not observed.

## Fixed in this branch

- Assignment codes are only taken from VTOP's own fields (hidden `code`/`mCode`
  inputs, `data-code`, `data-subcode`, or a download/edit `onclick`). The
  parser no longer invents `AST0<slNo>` / title-derived codes.
- Upload/re-upload is gated on `canUpload` and a non-empty code. Rows VTOP did
  not expose a submit control for render as `Closed`.
- The upload view is force-refreshed before submit, matching VTOP's own flow
  (`processDigitalAssignmentUpload` → `doDAssignmentUploadMethod`).
- The upload sends VTOP's hidden `opt` value instead of assuming the visible
  title is identical.
- A home/calendar assignment click stores the target course + assignment and
  opens the assignments page on that course, highlighting the row.
- The home list is labelled `Upcoming Assignments` and overlays `Submitted`
  status from the assignments store when available.
- The assignments page distinguishes `Submitted` / `Pending` / `Overdue`,
  gates uploads, and renders `daError` with a retry action.
- A dropped file is validated and stays attached until the user picks an
  assignment; it is no longer silently discarded.
- Downloads reject HTML/JSON responses and empty bodies instead of saving them
  as a corrupt PDF.
- `.gitignore` excludes telemetry captures.

## Remaining

### 1. Android bridge drops uploads and corrupts downloads (high)

`src/utils/network.ts` (bridge branch of `rateLimitedFetch`):

- `FormData` is not serialized, so `uploadStudentDA` sends no multipart body on
  Android. The native `VtopNativeBridge.request` contract only accepts a string
  `body`; fixing this needs a native change (or a base64 request field).
- Only `vtopResp.body` is wrapped in a `Response`. Binary responses should use
  `vtopResp.bodyBase64` when present; otherwise PDFs are decoded as text.

### 2. Legacy VTOP dark theme (medium)

`src/styles/vtop-dark.css` is a full-page `filter: invert(1) hue-rotate(180deg)`
plus a small counter-invert list.

- Most menu-layout selectors (`.container-fluid`, `.navbar-collapse`,
  `ul.navbar-nav`, `.nav-link`, `.hmenu-sticky`) match nothing in the captured
  markup. The real nav is `nav#top-hmenu-bar > div.px-3 > a.hmenuItem`.
- There are no native control rules (inputs, selects, buttons, tables), and no
  `color-scheme: dark`, so native select popups and scrollbars stay light.
- `#retop-open-loader` (`#09090b`) is not counter-inverted and renders
  near-white.
- `AlertDialog` portals to `document.body`, outside `#retop-host`, so it is
  inverted with the page. `#retop-native-portals` exists but is login-only.
- `applyTheme` waits on `idbGet('retop-settings')`, so native pages flash light
  before the theme is applied.

### 3. Home status needs a real source (medium)

`get/upcoming/digital/assignments` has a five-column header but four-cell rows;
the `Uploaded` cell is missing. `parseDigitalAssignments` therefore cannot set
`status`. The new overlay only works after the assignments page has loaded a
course in the same session. A durable fix needs either a persisted status map
or a targeted fetch of each course on the home page.

### 4. Attendance page uses undefined tokens (low)

`src/pages/attendance.tsx` uses nine `--color-*` variables that are not defined
in `src/styles/tokens.css` (for example `--color-surface-container`,
`--color-on-surface`, `--color-primary`). Those utilities resolve to nothing.

### 5. Timetable reserves a sixth row without Saturday (low)

`src/components/timetable/TimetableGrid.tsx` renders five day columns when
`hasSaturday` is false but still uses `repeat(6, ...)` for the grid rows.

### 6. Small UX issues (low)

- Clearing the cache in Settings has no confirmation.
- `animate-in` / `fade-in` / `slide-in-from-*` Tailwind classes are used in a
  few places but the plugin is not installed; they are no-ops.
- `AssignmentRow` has `cursor-pointer` even when no row-level handler is
  supplied.

### 7. Telemetry userscript caveats (tooling)

- `scripts/vtop-telemetry.user.js` runs in the page world, so it cannot see the
  content script's `fetch`/XHR. Use a DevTools HAR for retop-level requests.
- Each form submit is logged twice (`submit()` and the `submit` event).
- Exports accumulate sessions in IndexedDB; click **Clear all** before a fresh
  capture. `meta.sessionId` describes the last document load, not the batch.
- With `Full IDs` enabled the export contains the raw registration number and
  username.
