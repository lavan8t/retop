# Android visual reference for the Biometric Log extension page

Read-only research, Android sources only (`/home/lavan/Documents/projects/retop-app/android/...`).
All paths are absolute. Lines are from the state at 2026-11-21.

## Bottom line

There is **no Biometric Log / punch / attendance-log screen in the Android app**.
Biometric on Android is only an app-lock gate:

- `.../retop-app/android/app/src/main/java/com/kd/retop/util/BiometricHelper.kt:11-54` — `canAuthenticate` + system `BiometricPrompt`.
- `.../retop-app/android/app/src/main/java/com/kd/retop/MainActivity.kt:707-720,787-827,1657-1720` — `BiometricLockOverlay` shown before the app content.
- No biometric route exists in `.../retop-app/android/app/src/main/java/com/kd/retop/RetopNav3Adapter.kt:39-125,219,278` or `RetopNavGraph.kt`.

The extension page itself (VIT-AP only) is a dated table: `Sl.No | Punch Date | Punch Time | Venue`,
with a `fromDate` picker defaulting to today and a Search action — see `docs/research/vitap-biometric.md:4-17,24-31`
in this repo. The closest Android screen to copy visually is **Late Hour → History**, with
**Attendance history** as a second reference and the **leave date-time field** as the date-picker reference.

## 1. Screen structure

Closest screen: `.../retop-app/android/app/src/main/java/com/kd/retop/ui/latehour/LateHourScreen.kt`

- Title header inside the scroll (no `TopAppBar` composable): `RetopAppBarTitle` in a `Row`,
  `LateHourScreen.kt:409-422`. Overflow/back treatment is in
  `.../ui/components/RetopAppBar.kt:41-59,61-103` (tooltip-wrapped icon buttons).
- Connected filter tabs directly under the title: `FilterButtonGroup` with New/Ongoing/History,
  `LateHourScreen.kt:424-438`; `.../ui/components/FilterButtonGroup.kt:64-70,125-146`.
- History list grouped by month label (`SimpleDateFormat("MMMM")`), `LateHourScreen.kt:331-346,774-808`;
  month header is bold `titleMedium` at `:775-787`. This is the analogous place for a date/venue grouping.
- Rows: `LateHourRequestCard` — title + status on the left, date + time right-aligned,
  chevron at end (`.../ui/latehour/components/LateHourRequestCard.kt:107-166`), expanding to detail
  rows (icon + label/value) at `:167-298`. A punch row would map naturally to this shape.
- Empty state: centred icon (48.dp) + `bodyLarge` SemiBold label, `LateHourScreen.kt:746-772` (history),
  `:692-719` (ongoing). Attendance variant is a `surfaceVariant` card with icon + `RetopTextStyles.compact`
  text: `.../ui/attendance/AttendanceOverviewScreen.kt:461-478`;
  `.../ui/attendance/components/ClassHistoryList.kt:75-119` (adds a "Try again" `TextButton`).
- Loading: whole screen renders a Success state with empty data + `isRefreshing = true` so the
  pull-to-refresh indicator shows, `LateHourScreen.kt:152-171,387-398`; class history uses a centred
  M3 Expressive `ContainedLoadingIndicator` in `primaryContainer`, `ClassHistoryList.kt:68-73`.
- Error / unavailable: full-screen `Surface` with centred warning/info icon (48.dp), message,
  Retry + Go back buttons, `LateHourScreen.kt:173-214` and `:215-258`.

## 2. Tokens (semantic roles, not hex)

- Text: screen title uses `MaterialTheme.typography.displayLarge` with 36.sp line height,
  `RetopAppBar.kt:41-59`. Row title `titleMedium` SemiBold, status `bodySmall` Medium, date
  `bodyMedium` SemiBold, time `labelSmall`, all Google Sans Flex —
  `LateHourRequestCard.kt:122-161`. Month header `titleMedium` bold, `LateHourScreen.kt:775-786`.
  Extended roles (`compact` 13sp dense rows, `subtitle` 17sp, `displayHero` 48sp) in
  `.../ui/theme/Type.kt:22-33,42-49,75-85`.
- Spacing/radii come from the 2dp grid: `Dimens.space2..space32`, `Radii.r4..r32` —
  `.../ui/theme/Dimens.kt:19-61,70-105`. Card radius typically `Radii.r16`/`r18`/`r20`.
- Colors: background `colorScheme.background`, text `onSurface`/`onSurfaceVariant`, unfilled
  controls `surfaceContainerHigh`/`surfaceVariant`, checked pill `secondaryContainer` +
  `onSecondaryContainer` (`FilterButtonGroup.kt:83-113`). Success/error semantic roles live in
  `StatusColors` (`.../ui/theme/Color.kt:191-198`); status text maps approve→Success, reject→Error,
  else `onSurfaceVariant` (`LateHourRequestCard.kt:86-91`).
- Elevation is essentially flat: pull-to-refresh indicator, screen `Surface` with `background`,
  no card elevation. Connected list shape via `getGroupedItemShape(outerRadius = 18.dp, innerRadius = 4.dp)`
  with a 2.dp gap — `.../ui/theme/Theme.kt:344-370`, used at `LateHourScreen.kt:728,795`.

## 3. Layout

- Single column, scrollable: `Surface(color = background)` → `PullToRefreshBox` → `LazyColumn`
  with `.imePadding()` and a custom scrollbar — `LateHourScreen.kt:383-407`.
- Gutter 20.dp start/end, top = status-bar inset + 8.dp, bottom = nav-bar inset + 104.dp,
  items spaced `Dimens.space2` — `LateHourScreen.kt:400-407`. Attendance uses the same gutter
  with a flat 120.dp bottom, `AttendanceOverviewScreen.kt:349-354`.
- History is a **connected list of cards** (not individual elevated cards): first/last item get
  outer corners, middle items 4.dp — `Theme.kt:348-369`. Grouped by month with plain text headers.
- No floating search field on the Late Hour screen. Attendance's search query is held in VM state
  (`AttendanceUiState.kt:15`, `AttendanceViewModel.kt:159`) and filtered at
  `AttendanceOverviewScreen.kt:215-232`; the visible search UI is the global app search.

## 4. Interaction

- Tabs are M3 Expressive connected `ToggleButton`s, uppercase 20.sp label, haptic click, animated
  container/content color — `FilterButtonGroup.kt:89-166`.
- Rows expand via a shared-element container transform (`SharedTransitionMorphContainer`,
  `MorphChevron`) — `LateHourRequestCard.kt:51-56,93-166`; a Biometric Log row could instead be a
  static three/four-column row (the reference has no detail expansion requirement).
- Date picking (leave form reference): read-only `OutlinedTextField` with calendar icon, click overlay
  opens M3 `DatePickerDialog` with Next/Cancel `TextButton`s, then a `TimePicker` —
  `.../ui/leave/LeaveRequestScreen.kt:948-1015`. For a "from date" filter, reuse just the
  `DatePickerDialog` part with `rememberDatePickerState` defaulting to today.
- Search action (global search reference): full-screen morphing search bar, `BasicTextField`
  single-line, `KeyboardOptions(imeAction = ImeAction.Search)` and
  `KeyboardActions(onSearch = { committedQ = query.trim().lowercase() })`, clear button when
  non-empty — `.../ui/search/SearchPill.kt:833-899,901-909`. No per-screen search icon exists in
  the history screens; a local search button would be a new element but should use `Symbols.Search`.
- Lists react to IME via `.imePadding()` (`LateHourScreen.kt:404`) and use `animateItem()`
  (`LateHourScreen.kt:738,805`) plus scroll-to-top on tab change (`:375-379`).

## 5. M3 Expressive vs calm list

- The surrounding shell is calm: flat background, connected pill filter row, connected rounded
  card list, muted empty states with 48.dp tinted icons.
- Expressive touches are localized: connected `ToggleButton` shapes and spring color animation
  (`FilterButtonGroup.kt:64-70,114-123`), shared-element container transform on each history card
  (`LateHourRequestCard.kt:93-105,167-175`), expressive `LoadingIndicator` / `ContainedLoadingIndicator`,
  and expressive `ButtonDefaults.shapes()` morphing on press (`LateHourScreen.kt:666`).
- Hero numerals (`RetopTextStyles.displayHero`, `Type.kt:47-49,93-98`) are used for attendance %/CGPA,
  **not** on list screens. A Biometric Log page should stay a calm dated list; no watermark or
  hero number is used by the closest references.

## Caveats

Only Android sources were inspected; desktop paths were deliberately not read. No Android screen
combines a date picker, a Search action and a dated record list, so the reference is a composite of
the screens above. Risk: copying the Late Hour card's expandable morph would add interaction the
Biometric Log data (fixed four-column punch rows) does not need.
