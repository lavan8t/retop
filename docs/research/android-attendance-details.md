# Android Attendance detail / Class History — research findings

Read-only pass over the Android app (`retop-app/android/app/src/main/java/com/kd/retop/...`)
plus the Android shared model. No edits, no commits. All line numbers are from that tree.

## 1. List / Tiles toggle — connected `ToggleButton` pair, not `FilterButtonGroup`

- State: `var isTilesView by rememberSaveable { mutableStateOf(false) }` —
  `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/AttendanceDetailScreen.kt:87`.
- Placed in the "Class History" header row, right-aligned: `AttendanceDetailScreen.kt:130-158`;
  `HistoryViewIconToggle(...)` at `:148-156`. Taps fire `haptics.selection()` (`:152`).
- Composable: private `HistoryViewIconToggle` — `AttendanceDetailScreen.kt:214-311`. KDoc says
  "Connected button group view toggle for the course detail page." (`:214-216`).
- **Variant = connected**: the wrapping `Row` uses
  `horizontalArrangement = Arrangement.spacedBy(ButtonGroupDefaults.ConnectedSpaceBetween)`
  (`:250-254`). Leading button uses `ButtonGroupDefaults.connectedLeadingButtonShapes()` (`:268`);
  trailing uses `connectedTrailingButtonShapes()` (`:296`). Both are plain Material 3
  `ToggleButton`s (imports `:24-26`), each `42.dp x 34.dp`, `contentPadding = PaddingValues(0.dp)`.
- Icons only, 18.dp: `Symbols.List` with `contentDescription = "List view"` (`:276-280`) and
  `Symbols.GridView` with `contentDescription = "Tiles view"` (`:304-308`). No text labels.
- **Selected state** is shown purely by animated container/content colors, computed with four
  `animateColorAsState` calls (`:226-248`): checked = `colorScheme.primary` container and
  `colorScheme.onPrimary` content; unchecked = `colorScheme.surfaceContainerHigh` /
  `colorScheme.onSurfaceVariant`. Spec is `RetopMotion.standard()` (300ms StandardEasing tween,
  `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/theme/Theme.kt:293-294`).
  The same animated values are passed to **both** `containerColor`/`checkedContainerColor` (and
  content equivalents) in `ToggleButtonDefaults.colors` (`:269-274`, `:297-302`), so the
  `animateColorAsState` values drive the visual state. Inner taps use `haptics.click()` (`:260`, `:288`).
- Switch between the two views is an `AnimatedContent` on `isTilesView` with
  `fadeIn(RetopMotion.effects())` + `fadeOut(RetopMotion.fastEffects())`, label
  `"classHistoryViewSwitch"` (`:183-207`).

Distinct from the segmented filter: `FilterButtonGroup`
(`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/components/FilterButtonGroup.kt:64-70`)
is a full-width connected pill row of *text* labels (`item.label.uppercase()`, 20.sp, height 48.dp,
leading/middle/trailing shapes at `:135-140` / `:209-214`, checked color defaults to
`secondaryContainer`/`onSecondaryContainer` at `:104-113`). It is not used by the history toggle.

## 2. Class history rows — no month tint, no progress line; two separate cards per row

List container: `Column` with `verticalArrangement = Arrangement.spacedBy(1.dp)` —
`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/components/ClassHistoryList.kt:86-89`.
Loading = `ContainedLoadingIndicator` (`:90-97`); empty state = neutral `surfaceVariant` Surface
with "no_class_history_yet" + "try_again" (`:99-128`). Records are grouped by month, and the month
is a **plain `Text`** with `titleMedium`/bold/`onSurface` and no background (`:133-151`).

Row composable `ClassHistoryCard` — `ClassHistoryList.kt:215-315`:

- Outer `Row(fillMaxWidth, spacedBy(1.dp), CenterVertically)` (`:254-258`).
- **Left**: `Box` 56x56.dp, `clip(RoundedCornerShape(Radii.r16))`, `.background(targetBg)`,
  centered day number `titleLarge` with `tnum`, color `targetContent` (`:260-276`). This is a
  per-record status-tinted date tile, *not* a month header tint.
- **Right**: separate `Surface`, `weight(1f)`, height 56.dp, `RoundedCornerShape(Radii.r20)`,
  `color = colorScheme.surfaceContainer` (`:279-285`). Inside: padding `space16`, `SpaceBetween`:
  weekday + time `Text` (bold, `RetopTextStyles.compact`, `onSurface`, ellipsized, `:293-301`);
  `Spacer(width = space8)` (`:303`); status label `Text` (bold, compact, `statusColor`, `maxLines=1`, `:305-311`).
- **No icons and no progress bar / line** anywhere in the row.

Tile view mirrors the same four categories: `ClassHistoryTilesView.kt:88-100` (`toColorCategory`),
`AttendanceTilesRow` rows of 7 (`:102`, `:197-289`), month badges as plain `Text` with
`onSurfaceVariant` (`:212-226`), and `AttendanceTileCell` = square `Box` with `.background(targetBg)`
showing only the day number in `titleLarge` (`:291-328`). Same-category neighbours are drawn as a
merged shape with 0.dp gap (`:238-253`, `:263-277`).

Category → colors (both files): `ATTENDED` → `attendanceColors.attendedContainer/onAttendedContainer`;
`MISSED` → `missedContainer/onMissedContainer`; `OTHER` → `colorScheme.tertiaryContainer/onTertiaryContainer`;
`UPCOMING` → `surfaceContainerHigh/onSurfaceVariant` — `ClassHistoryList.kt:223-229`,
`ClassHistoryTilesView.kt:298-309`.

## 3. Status labels, "other", and the half-filled orange thing

- Categories are explicitly four-valued, including **OTHER**:
  `HistoryTileCategory { ATTENDED, MISSED, OTHER, UPCOMING }` (`ClassHistoryList.kt:63-68`; tile twin
  `ClassHistoryTilesView.kt:88-93`). Mapping: Upcoming → UPCOMING; `isAbsent` → MISSED;
  `isOnDuty || isOnLeave || isExcused` → OTHER; else ATTENDED (`ClassHistoryList.kt:70-75`,
  `ClassHistoryTilesView.kt:95-100`).
- What the list row actually renders is **text only** (no status icon), via `statusLabel`/`statusColor`
  (`ClassHistoryList.kt:231-242`): `"Upcoming"` primary, `"Absent"` → `attendanceColors.missed`,
  `"On Duty"` / `"On Leave"` / `"Excused"` → `colorScheme.tertiary`, `"Present"` →
  `attendanceColors.attended`, otherwise the raw trimmed status string in attended color. So there
  is no generic "Other" label; the tertiary cases are the "other" statuses. Tiles render only a
  colored date square, no label at all.
- Theme roles: green `attended` (`0xFF1B6E32` light / `0xFF81DC8E` dark), red `missed`
  (`0xFFBA1A1A` / `0xFFFFB4AB`), amber `warning` (`0xFF7A5900` / `0xFFFABD00`) with
  `warningContainer` `0xFFFFF0C2` / `0xFF5A4300` —
  `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/theme/Color.kt:98-126`.
  `statusColorFor` maps `<75% → missed`, `75-89% → warning`, `90%+ → attended`
  (`Color.kt:66-95`); `badgeColorsFor` uses the analogous container colors (`Color.kt:32-64`).
- **There is no partial/determinate progress indicator in the history rows.** No
  `LinearProgressIndicator`/`CircularProgressIndicator` and no drawn arc exists in this screen's
  history code. The only progress-like widget on the detail screen is M3 Expressive
  `ContainedLoadingIndicator`, shown while records load, tinted
  `primaryContainer`/`onPrimaryContainer` (`AttendanceDetailScreen.kt:90-105`,
  `ClassHistoryList.kt:90-97`, `ClassHistoryTilesView.kt:118-130`). Its morphing/wedge shape can
  read as a "half-filled" shape while animating. Alternatively, the orange/amber the user recalls
  is the `warning` role above (the 75-89% band, i.e. roughly "half way" between 75 and 100).
  Most likely answer: it is the amber `warning` status color or the themed loading indicator, not a
  progress bar — no hardcoded orange appears anywhere in this screen.

## 4. Attend / Bunk calculator ± buttons — exact content descriptions

`SimulatorStepper` — `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/components/AttendanceCalculator.kt:358-469`:

- Labels: `"Attend"` (`:161`) and `"Miss"` (`:230`). The plus/minus are ordinary `Button`s
  in a connected row (`ButtonGroupDefaults.ConnectedSpaceBetween`, 48x34.dp, leading/trailing
  shapes, `:414-466`).
- Minus: `Icon(Symbols.Remove, contentDescription = "Decrease $label", modifier = size(18.dp))`
  (`:437-441`) → **"Decrease Attend"** / **"Decrease Miss"**.
- Plus: `Icon(Symbols.Add, contentDescription = "Increase $label", modifier = size(18.dp))`
  (`:461-465`) → **"Increase Attend"** / **"Increase Miss"**.
- No `Tooltip` composable and no longer text is attached; those four strings are the whole
  accessibility text. Reset button: `FilledTonalButton` with `Icon(Symbols.Refresh,
  contentDescription = null)` and `Text("Reset")` (`:284-318`).
- Colors: stepper buttons use `attendedContainer/onAttendedContainer` (`:171-172`) and
  `missedContainer/onMissedContainer` (`:240-241`).

## 5. Sorting (newest / oldest) — no control, hence no sort animation

- There is **no newest/oldest toggle** in Android attendance. Order is fixed:
  `sortedLatestToOldest()` in the detail screen (`AttendanceDetailScreen.kt:162-163`), the list
  (`ClassHistoryList.kt:130-132`) and the tiles view (`ClassHistoryTilesView.kt:164-167`).
  Definition: descending by epoch/parsed date, then start time, then original index —
  `/home/lavan/Documents/projects/retop-app/android/shared/src/commonMain/kotlin/com/kd/retop/vtop/Models.kt:206-224`.
- No `animateItemPlacement`, spring, or crossfade is tied to sorting anywhere in this screen.
  The only nearby animations are the view-switch fade (§1), the toggle color tweens (§1), and on
  the overview screen an `listState.animateScrollToItem(targetIdx + 2)` when a highlight key is
  supplied (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/AttendanceOverviewScreen.kt:242-252`) — a scroll, not a sort.
  The overview course list itself is simply sorted by ascending percentage
  (`AttendanceOverviewScreen.kt:215-232`), again with no toggle.

## 6. First-open / entry animation for the detail screen

- Nothing screen-specific: `AttendanceDetailScreen` (`:72-212`) has no `AnimatedVisibility`,
  `spring`, `emphasis`, or item-entry animation on first composition. Its only animations are
  the lazy view switch (`:183-207`) and toggle colors (`:227-248`).
- The calculator adds odometer-style digit transitions on first/each value change:
  `OdometerDigit` slides + fades vertically with `RetopMotion.emphasizedEnter()/Exit()`
  (`AttendanceCalculator.kt:323-356`); the stepper value and hundreds/tens digits use the same
  pattern (`:198-217`, `:384-412`); the "Reset" button uses `fadeIn/scaleIn/expandHorizontally`
  with spatial/effects specs (`:284-295`); the hint text slides its bias with
  `animateFloatAsState`/`animateDpAsState` using `RetopMotion.spatial()` (`:255-264`).
- Navigation entry is generic, not attendance-specific: the subscreen entry is wrapped in
  `PredictiveSlideBackContainer`
  (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/navigation/RetopNavGraph.kt:258-271`),
  and the shared push transition is horizontal slide + fade with emphasized-decelerate easing
  (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/animation/RetopPageTransitions.kt:35-45`).

## Caveats / not checked

- Did not inspect any Desktop code, per instruction; the "half-filled orange" identification is
  inferred from Android-only evidence and is the one point needing visual confirmation.
- No runtime/screenshot verification — findings are static source reading only.

## User decisions (verified against screenshot + research docs)

- The overall percentage line (e.g. "Overall 88%") is removed from the attendance overview — it
  does not make sense for this screen.
- The leave-impact card ("Can skip N classes safely / Before Holiday (Winter Vacation) / N missed
  so far") is removed from the overview. The forecast helper itself stays; it is still used by
  the what-if calculator / detail surfaces.
- The attendance page keeps a current-semester picker (reusing the existing `SemesterDropdown`
  from the app's other pages, mirroring Android's attendance semester dropdown covering the last
  ~5 years of available semesters).
- The last-picked attendance semester is persisted, scoped by registration number
  (`retop_att_sem_${authId}`). On mount the stored value wins; only when nothing is stored does
  the app fall back to the latest/default semester. Changing semester never gets reset to the
  first entry on remount or reload.
