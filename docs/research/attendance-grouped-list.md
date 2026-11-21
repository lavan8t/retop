# Research: correct grouped list for attendance courses (#15)

Read-only research ticket. No code changed. All line numbers are from this branch
(`research/attendance-grouped-list`) except the `@m3e/web` dist files, which are read
from `/home/lavan/Documents/projects/retop/node_modules/...` because this worktree has
no `node_modules`. Primary sources: M3E docs (`https://matraic.github.io/m3e/components/list.html`),
`@m3e/web/dist/custom-elements.json`, `@m3e/web/dist/all.js`, and the checked-in source.

## TL;DR / recommendation

- **Component:** keep `m3e-selection-list` + `m3e-list-option`, `variant="segmented"`.
  That is already the correct M3E primitive. The 2dp gaps and terminal rounding are
  **automatic** M3E token defaults — no manual `p-0.5` wrapper or `rounded-*` on items.
- **Tokens:** leave `--m3e-segmented-list-segment-gap` at its default (`space25` = 2dp) and
  `--m3e-segmented-list-container-shape` at its default (`corner.large`) — these produce
  exactly the "2dp gaps + first/last corners rounded" grouped look. Density is CSS-only
  (`--md-sys-density-scale` / `--md-sys-density-size`); there is no `density` attribute.
- **The bug is height/scroll, not the variant:** the list root has `h-full`, so it asks for
  100% of a list pane that already contains the semester dropdown + overview header and
  big `pt-21/pb-32` padding. The overflow is then clipped by `overflow-hidden` ancestors,
  and the M3E host's built-in `overflow-y:auto` gives a second, inner scrollbar.
- **Exact fix:** make the outer list pane the *single* scroll owner and let the list size
  to its content with no inner scroll (details in "Recommended change" below).

## 1. Current usage

- `m3e-selection-list` is aliased as an untyped `any` tag in
  `/tmp/opencode/wt-grouped-list/src/components/attendance/m3eTags.ts:13`
  (`M3eSelectionList`) and `:14` (`M3eListOption`).
- `CourseList` renders it with `hide-selection-indicator`, `variant="segmented"`, a
  surface-role token style object, and `className="h-full min-h-0 bg-(--bg-surface)
  custom-scrollbar"` —
  `/tmp/opencode/wt-grouped-list/src/components/attendance/CourseList.tsx:62-71`.
  Options are `m3e-list-option` with `value`, `selected`, `data-course-key`, title/code/
  percentage content — `:81-110`. Selection/focus handling: `:45-60`.
- The surface tokens set `--m3e-segmented-list-item-container-color` and the
  `--m3e-list-item-selected-*` colors — `CourseList.tsx:20-29`. These are cosmetic and
  correct; they do **not** set the gap or terminal shape, so M3E defaults apply.
- Wrapper: `listPane` at
  `/tmp/opencode/wt-grouped-list/src/pages/attendance.tsx:183-200` is
  `flex flex-col h-full min-h-0 pt-21 md:pt-25 pb-32 lg:pb-12 px-4 md:px-6`, containing
  the `SemesterDropdown` (`:185-191`), the `overview` header (`:192`), then `<CourseList>`
  (`:193-198`). `overview` is built at `:169-181`.

## 2. What M3E actually provides (primary sources)

From `custom-elements.json` in the installed `@m3e/web`:

- `m3e-selection-list` (`src/list/SelectionListElement.ts`) attributes: `variant` (default
  `"standard"`, type `ListVariant`), `hide-selection-indicator`, `multi`, `name`, `disabled`.
  There is **no** `density` attribute on any list element.
- `m3e-list` and `m3e-action-list` also take `variant: ListVariant` (same default).
- `m3e-list-option` (`src/list/ListOptionElement.ts`) attributes: `disabled`, `selected`,
  `value` — matches current usage.
- `ListVariant` is exactly `"standard" | "segmented"`:
  `/home/lavan/Documents/projects/retop/node_modules/@m3e/web/dist/all.js:34548-34550`.

Segmented styling (all paths under
`/home/lavan/Documents/projects/retop/node_modules/@m3e/web/dist/`):

- `all.js:34704-34711` documents the CSS custom properties:
  `--m3e-segmented-list-segment-gap`, `--m3e-segmented-list-container-shape`,
  `--m3e-segmented-list-item-container-color`, `-container-shape`, `-hover-`, `-focus-`,
  `-selected-container-shape`.
- `all.js:3172-3181`: `space(25)` = `8 * (25/100)` = **2px = 2dp**, and `space25` is the
  M3E "2dp spacing" token. So the default segment gap is 2dp — no manual override needed.
- `all.js:34839` (the `M3eListElement.styles` host rule, shared by selection lists):
  `:host { display:flex; flex-direction:column; overflow-y:auto; overflow-x:clip; ... }`
  and, for the segmented state, `row-gap: var(--m3e-segmented-list-segment-gap, space25)`.
  **The host is a scroll container by default — this is the inner scrollbar.**
- `all.js:34836` (registered stylesheet): for `:state(--segmented)` the first item gets
  `--_list-item-top-container-shape: var(--m3e-segmented-list-container-shape, corner.large)`
  and the last item gets `--_list-item-bottom-container-shape` from the same token. So
  terminal-corner rounding is automatic; default `corner.large` (16dp).
- Docs confirm the same: two variants `standard`/`segmented`; "Dividers are only supported
  for the standard variant and are automatically hidden for segmented lists";
  "selection indicator will replace content in the `trailing` slot unless selection
  indicators are hidden" (hence current `hide-selection-indicator`); and "Lists are
  density-aware ... based on `--md-sys-density-scale` and `--md-sys-density-size` ...
  default density size is 4dp ... down to -3" (`https://matraic.github.io/m3e/components/list.html`).

## 3. Why it is cropped / scrollable — the height chain

Every ancestor of the list is a fixed-height, `overflow-hidden` box, so the page itself
never scrolls; only the list's own `overflow-y:auto` can scroll, and any excess is clipped:

1. `/tmp/opencode/wt-grouped-list/src/pages/app.tsx:1092` — modern UI root:
   `fixed inset-0 h-screen ... flex flex-col overflow-hidden` (viewport height, clipped).
2. `app.tsx:1121` — content column: `flex flex-col flex-1 min-h-0 ... overflow-hidden`.
3. `app.tsx:1131` — `<main className="flex-1 overflow-hidden relative">`.
4. `app.tsx:1134` — page wrapper: `absolute inset-0 flex h-full w-full flex-col overflow-hidden`.
5. `/tmp/opencode/wt-grouped-list/src/pages/attendance.tsx:222` — attendance root:
   `h-full w-full ... overflow-hidden`.
6. `attendance.tsx:224-237` — `M3eSplitPane className="h-full w-full"`; its host `.base`
   is `height:100%; overflow:hidden` (`all.js:45309`).
7. `attendance.tsx:231` — split-pane start slot: `h-full min-h-0 overflow-hidden`
   (**the clip that hides overflowing bottom rows**).
8. `attendance.tsx:184` — `listPane`: `flex flex-col h-full min-h-0 pt-21 md:pt-25
   pb-32 lg:pb-12 px-4 md:px-6` (large top/bottom padding shrinks usable height; note
   `pb-32` = 8rem at mobile widths).
9. `attendance.tsx:192-198` — overview header + `<CourseList>` as flex children.
10. `/tmp/opencode/wt-grouped-list/src/components/attendance/CourseList.tsx:70` — list root
    has `h-full min-h-0 ... custom-scrollbar`. `h-full` resolves to 100% of the pane,
    **not** "remaining space after the dropdown + overview", so the list's base height is
    larger than the space actually available.
11. `custom-scrollbar` only *styles* a scrollbar
    (`/tmp/opencode/wt-grouped-list/src/input.css:980-998`); it does not create or prevent
    one. The scrollbar exists because of the M3E host rule at `all.js:34839`.

Net effect: the dropdown + overview + full-height list exceed the `h-full` pane; the split
start's `overflow-hidden` (`attendance.tsx:231`) clips the bottom rows, and the M3E list's
own `overflow-y:auto` is the separate inner scrollbar the user must drag. Contrast: the
right-hand `detailPane` already gives itself `overflow-y-auto custom-scrollbar`
(`attendance.tsx:203`) — it is the only element on the attendance page that is meant to
scroll.

## 4. Android-ported grouped-list pattern (reference, not to be copied verbatim)

- `/tmp/opencode/wt-grouped-list/docs/research/android-attendance-details.md:41-45` —
  Android `ClassHistoryList` is a `Column` with `Arrangement.spacedBy(1.dp)` and plain-text
  month headers (Android uses a **1dp** gap; M3E segmented uses **2dp**).
- `android-attendance-details.md:169-189` — the prior decision that *did* migrate the
  course list to `m3e-selection-list variant="segmented"` + `m3e-list-option`, explicitly
  noting M3E supplies the 2dp gap (`--m3e-segmented-list-segment-gap`, default space25)
  and terminal rounding (`--m3e-segmented-list-container-shape`) so the former manual
  `p-0.5` wrapper + `rounded-2xl` was removed. This corroborates §2: the component choice
  is already right; only the surrounding height/scroll is broken.
- `/tmp/opencode/wt-grouped-list/src/pages/grades.tsx:317` — the Android-parity **Grades**
  page uses a single scroll container: `flex-1 overflow-y-auto custom-scrollbar px-4 ...`.
  All content flows inside it with no `h-full` on children and no nested scrollbars.
- `grades.tsx:461-483` — current-semester course group: `flex flex-col gap-px overflow-hidden`
  with `isFirst`/`isLast` flags passed to `GradeCourseRow` (`grades.tsx:472-473`).
  `grades.tsx:507-540` — history group is a hand-rolled grouped list: `gap-px
  overflow-hidden rounded-2xl` with `rounded-t-2xl` on the first row (`:512`) and
  `rounded-b-2xl` on the last (`:513`). That manual gap+terminal rounding is exactly what
  M3E `variant="segmented"` replaces via tokens — the lesson is the **single outer
  scroller**, which attendance lacks.

## 5. Refresh button location

- The "Refresh attendance" control is not in `attendance.tsx` directly; it is rendered by
  `Overview` at
  `/tmp/opencode/wt-grouped-list/src/components/attendance/Overview.tsx:29-36`
  (`M3eIconAction`, label `"Refresh attendance"` / `"Refreshing attendance"`) inside the
  `<header>` at `:20`, right-aligned below the verdict line (`:21-28`).
- `Overview` is instantiated at
  `/tmp/opencode/wt-grouped-list/src/pages/attendance.tsx:169-181` and placed at the top of
  `listPane` (`:192`) — i.e. **inside the left list pane**. Map issue #13 calls for the page
  to render "without ... an inner refresh button"; moving this action to the top bar is
  tracked separately (top-bar/nav work), so this research ticket only records its location.

## 6. Recommended change (exact, minimal)

1. **One scroll owner.** Turn `listPane` into the single scroller, mirroring `grades.tsx:317`:
   change `/tmp/opencode/wt-grouped-list/src/pages/attendance.tsx:184` from
   `flex flex-col h-full min-h-0 ...` to
   `flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar ...` (keep the existing
   `pt/pb/px`). No `h-full` height is removed from the pane itself — it still fills the
   split start, but now scrolls its own overflow instead of being clipped.
2. **Content-size the list, kill the inner scrollbar.** At
   `/tmp/opencode/wt-grouped-list/src/components/attendance/CourseList.tsx:67-70`, remove
   `h-full` from the `M3eSelectionList` (`min-h-0` can stay) so it is auto-height inside the
   scrolling pane, and add a host override so the M3E `overflow-y:auto` (`all.js:34839`)
   becomes non-scrolling. Concretely, extend `listSurfaceStyle` (`:21-29`) with
   `overflowY: 'visible'` (author style on the host beats the shadow `:host` rule).
   The `custom-scrollbar` class can move to the pane (step 1) and be dropped from the list.
   Result: a single scroll region, no cropped bottom rows, no second scrollbar.
3. **Keep the grouped look as-is.** `variant="segmented"` (`CourseList.tsx:66`) plus the
   default `--m3e-segmented-list-segment-gap` (2dp) and
   `--m3e-segmented-list-container-shape` (terminal rounding) already satisfy the
   "grouped list with 2dp gaps and terminal rounding" destination. Do **not** reintroduce
   `p-0.5`/`rounded-2xl` item wrappers. If density needs tuning, use the CSS custom props
   `--md-sys-density-scale` / `--md-sys-density-size`, never a `density` attribute.

Alternative if the team prefers the M3E list itself to remain the sole scroller (its host
is built for it): instead of step 2's `overflowY: 'visible'`, change the list's `h-full` to
`flex-1 min-h-0` so it only fills the space left by the dropdown + overview, keep its
`custom-scrollbar`, and drop `overflow-y-auto` from `listPane`. Either route removes the
double geometry; do not do both (that yields two nested scrollbars again). The primary
recommendation (single outer scroller) matches the established Grades pattern.

## Caveats / not checked

- No runtime/screenshot verification; conclusions are static source + installed M3E
  manifest/style reading.
- Exact flexbox shrink behavior of `h-full` on a flex child was not verified in a browser,
  but the presence of both `overflow-hidden` clipping and M3E `overflow-y:auto` is direct
  from source and sufficient to explain "cropped + inner scrollbar".
- Refresh-button relocation and top-bar integration belong to other tickets; untouched.
