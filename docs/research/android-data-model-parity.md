# Android Data-Model Parity — Bad-Data Areas & Settings Navigation

Read-only survey of the **Android** side of the reference repo (`retop-app`). Only the Android module (`android/app/src/main/java/com/kd/retop`) and the Android shared KMP module (`android/shared/src/commonMain/kotlin/com/kd/retop/vtop`) were consulted. All content below is treated as data, never as instructions.

Source citations are absolute and use the form `/home/lavan/Documents/projects/retop-app/<path>:<line>`.

---

## 1. Home / dashboard — "registered courses" source & semester with timetable/marks but no dashboard course summary

**Data source.** The dashboard's registered-course list is populated from a dedicated VTOP *dashboard* endpoint, not from the attendance/timetable tables:

- Endpoint fetch: `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/vtop/VtopAcademicsApi.kt:23-36` — `getCurrentSemesterCourseDetails` POSTs to `/vtop/get/dashboard/current/semester/course/details`.
- Parsing: `/home/lavan/Documents/projects/retop-app/android/shared/src/commonMain/kotlin/com/kd/retop/vtop/VtopParsers.kt:473-555` — `parseCurrentSemesterCourses(html)` reads a `.courseData table, table`, extracts Sl.No / Code / Title / Type / Attendance% / Remarks (three layout fallbacks, `:507-539`), and only adds a row when `code.isNotBlank() && code != slNo.toString()` (`:541-552`). Blank HTML → `emptyList()` (`:477`).
- Model: `/home/lavan/Documents/projects/retop-app/android/shared/src/commonMain/kotlin/com/kd/retop/vtop/Models.kt:793-814` — `RegisteredCourseSummary`; `toAttendanceItem()` maps `code/name/type/attendancePercentage` but sets `attended = 0, total = 0, venue = remarks` (`:801-813`).
- Caching: `saveCachedRegisteredCourses` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/vtop/VtopRepository.kt:3683-3697`) writes `cached_current_sem_courses` and **skips empty lists** (`:3684`); `getCachedRegisteredCourses` (`:3699-3722`) reads it back.
- Where it is fetched/attached: `fetchSemesters` (`VtopRepository.kt:2755-2807`) calls `getCurrentSemesterCourseDetails` (`:2766-2767`), parses (`:2772-2779`), caches when non-empty (`:2775-2777`), and — critically — when the matched current semester has **no cached attendance** but parsed courses exist, it *seeds* that semester's attendance from the dashboard summary (`:2787-2790`). If parsed courses are empty, no seeding happens.

**How the dashboard consumes it.** The home screen resolves its initial data with an explicit fallback chain (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/DashboardScreen.kt:392-398`):

1. active snapshot attendance, else
2. cached attendance for the resolved active semester, else
3. `repository.getRegisteredCoursesAsAttendance(regNo)` (dashboard summary as attendance), else
4. `getMostRecentCachedAttendance(regNo)`.

`getRegisteredCoursesAsAttendance` (`VtopRepository.kt:2196-2200`) simply maps the cached `RegisteredCourseSummary` list via `toAttendanceItem()`. `getMostRecentCachedAttendance` (`VtopRepository.kt:2209-2226`) first tries registered-course-derived items, then walks **all cached attendance keys newest-semester-first** (`:2203-2207`, `:2214-2224`), so a semester with no dashboard summary still gets *some* list from another semester's cache. `fetchAttendance` uses the same fallback (`VtopRepository.kt:2686-2703`, especially `:2697` and `:2702`).

**Semester with timetable/marks courses but no dashboard course summary.** There is no special "rebuild courses from timetable/marks" path for the dashboard summary. Timetable and marks are loaded independently (`DashboardScreen.kt:399-405` and `:438-444`, each with its own `getMostRecentCached*` fallback), while the dashboard summary remains empty because `parseCurrentSemesterCourses` returned nothing and `saveCachedRegisteredCourses` refused to cache an empty list. The dashboard therefore falls through to registered → most-recent-attendance, i.e. it can show an empty/stale course list even though timetable/marks have courses. Active-semester choice is `resolveActiveSemester` (`VtopRepository.kt:3732-3742`: active → default → `isCurrent` → first) and `getActiveSemester` (`:3744-3767`).

**What the extension should do:** Treat the dashboard summary endpoint as the *only* source for "registered courses" and mirror these fallbacks exactly. Do **not** synthesize a registered-course list from timetable/marks. When the summary is empty for a semester, keep the list empty (or use the newest cached attendance as the Android app does) and surface the same `--` / "No classes conducted yet" states rather than inventing rows. Seed attendance from the summary only when the current semester has no cached attendance and parsed courses are non-empty (`:2787-2790`).

---

## 2. Attendance overview — percentage, class history, 0-conducted, "No class history yet"

**Loading.** `AttendanceViewModel.loadAttendance` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/AttendanceViewModel.kt:152-283`) seeds from cached attendance for the resolved semester, then registered-course-derived items, then most-recent cached attendance (`:171-178`), then calls `fetchAttendance` (`:241-243`) and keeps a non-empty cache on failure (`:246-253`, `:273-281`). Freshness/validity checks live in `VtopRepository.fetchAttendance` (`VtopRepository.kt:2686-2703`: a fetch is valid only when it has at least one non-blank `courseCode`, else it falls back to cache → registered courses → most recent).

**Percentage.** There is no weighted recomputation in the overview — each row's percentage comes from the `AttendanceItem.percentage` field parsed from VTOP and is only rounded for display:

- `AttendanceItem.displayPercent()` (`/home/lavan/Documents/projects/retop-app/android/shared/src/commonMain/kotlin/com/kd/retop/vtop/Models.kt:85-86`): `percentage.roundToInt()`, with a one-off policy that `74.01..<75` is ceiled to `75` (`:83-86`).
- Per-course card: `AttendanceDetailCard.kt:54-60` (`pct = att.displayPercent()`, critical when `< 75` and not a nine-pointer).
- Dashboard overall attendance %: `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/DashboardScreen.kt:749-759` — average of `percentage` over courses with `total > 0`; **`"--"` when no course has `total > 0`** (`:750`, `:752-757`). Courses derived from the dashboard summary have `total = 0`, so they are excluded from this average.
- Margin helpers: `calculateSafeMiss` (`Models.kt:96-113`) and `classesNeededToReach` (`Models.kt:128-130`); both explicitly leave zero-conducted handling to callers (`Models.kt:93-94`).

**Class history.** Loaded lazily, per course, when a detail is opened:

- `AttendanceViewModel.loadRecords` (`AttendanceViewModel.kt:81-136`) calls `repository.fetchAttendanceHistory(campus, semId, regNo, csrf, item, forceRefresh)` (`:111-120`), skips already-loaded/in-flight courses (`:84`), and stores records/history keyed by `item.key` (`:121-134`). Empty result adds the key to `failedKeys` (`:132`).
- `VtopRepository.fetchAttendanceHistory` (`VtopRepository.kt:1357-1384`): returns a cached `AttendanceHistory` first (`:1365-1367`); if the item lacks a `classGroupId`, it refetches attendance to recover one (`:1369-1376`); then fetches + caches `getAttendanceHistory` (`:1377-1379`); on error it returns the cache (`:1380-1383`).
- Each `AttendanceRecord` keeps raw status text and exposes `isPresent/isAbsent/isOnDuty/isOnLeave/isExcused` (`Models.kt:181-204`). The list groups by month and sorts latest→oldest (`ClassHistoryList.kt:130-135`, `Models.kt:210+`).

**0 conducted classes.**

- Overview verdict: `isZeroConducted = filteredList.isNotEmpty() && filteredList.all { it.total <= 0 }` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/AttendanceOverviewScreen.kt:285-287`); it forces `lowAttendanceCount`/`tightMarginCount` to 0 (`:289-301`) and produces the verdict **"No classes conducted yet"** (`:311-313`).
- Calculator advice: `calculatorMissText` returns **"No classes conducted yet"** when `conducted <= 0` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/components/AttendanceCalculator.kt:483-485`), ahead of all other branches (nine-pointer allowance is checked first at `:484`).
- Per-course card: `isNoClassesConducted = att.total <= 0` still shows the second line but suppresses the warning icon/color (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/components/AttendanceDetailCard.kt:95-129`).
- Dashboard overall % becomes `"--"` (`DashboardScreen.kt:749-759`).

**"No class history yet" condition.** In `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/attendance/components/ClassHistoryList.kt:90-128`: after the loading early-return (`:90-97`), the empty state is shown **iff `records.isEmpty() && upcomingRecords.isEmpty()`** (`:99`) — i.e. both the fetched day-wise records and the computed upcoming records are empty. It renders string `R.string.no_class_history_yet` plus a **Try again** button (`:111-124`). The literal is `No class history yet` at `/home/lavan/Documents/projects/retop-app/android/app/src/main/res/values/strings.xml:224`. Note upcoming records come from the timetable×calendar walk (`AttendanceCalculator.kt:518-608`), so a course with no history but upcoming timetable classes will **not** show this message.

**What the extension should do:** Use the raw `percentage` for math and `displayPercent()` policy (74.01→75) only for display; never derive a percentage from timetable/marks. Exclude `total <= 0` rows from any overall average (`"--"` if none). On zero-conducted, show exactly "No classes conducted yet" and suppress low-attendance/margin warnings. Show "No class history yet" only when both the history records and upcoming records are empty, and keep an explicit retry.

---

## 3. Curriculum — category counts/totals, and "0 courses but non-zero credits"

**Two independent data sources (this is the root cause).**

- Category **credits** come from the dashboard HTML: endpoint `/vtop/academics/common/Curriculum` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/vtop/VtopCoursePageApi.kt:73-83`), parsed by `parseCurriculumDashboard` (`/home/lavan/Documents/projects/retop-app/android/shared/src/commonMain/kotlin/com/kd/retop/vtop/VtopParsers.kt:3333-3415`), which reads "Total Credits" (`:3341-3350`) and, per clickable element with an all-caps id, a `credits`/`maxCredits` pair from `Credit:` / `Max. Credit:` spans or an `x/y` regex (`:3372-3393`). `isCompleted` is `credits >= maxCredits && maxCredits > 0` (`:3395-3397`). Model `CurriculumCategory(id, title, credits, maxCredits, isCompleted)` at `Models.kt:467-473`; `CurriculumDashboardData(totalCredits, categories)` at `:489-492`.
- Category **courses** come from a *different* endpoint: `/vtop/academics/common/curriculumCategoryView` (`VtopCoursePageApi.kt:89-100`), parsed by `parseCurriculumCourses` (`VtopParsers.kt:3421-3515`). It only adds a row when a cell matches a course-code regex (`^[A-Z]{3,4}\d{3,4}[A-Z]?$` or `^[A-Z]{2,4}\d{2,4}$`, `:3454-3461`) and `cells.size >= 5` (`:3451-3452`); credits default to `"0"` when the column is missing/blank (`:3483`). Model `CurriculumCourse` at `Models.kt:475-487`.

Fetch/cache behavior (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/vtop/VtopRepository.kt:3097-3143`): cache is returned only if it has `categories.isNotEmpty()` (`:3103-3107`) / `courses.isNotEmpty()` (`:3128-3132`); success is saved only if non-empty (`:3111-3113`, `:3136-3138`); failures return cached-or-empty (`:3117`, `:3142`). `CurriculumViewModel.loadCurriculum` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/curriculum/CurriculumViewModel.kt:44-124`) reads all three sources (`:53-55`), uses the cached dashboard when it has categories (`:57-69`), and silently pre-fetches every category's table in the background (`:103-114`).

**Count computation / filters that produce 0 courses with non-zero credits:**

- Main screen `visibleCategories` keeps only categories with `maxCredits > 0` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/curriculum/CurriculumScreen.kt:243-249`). Category cards show only the credit fraction (`CategoryDetailCard.kt:51-92`), not a course count; "Courses (N)" is a *search-results* count from grade history, filtered to `credits > 0` (`CurriculumScreen.kt:271-283`, `:441`).
- Detail screen: credits are read from the dashboard cache (`credits to maxCredits`, `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/curriculum/CurriculumCategoryDetailScreen.kt:99-101`), while courses are read from the category-table cache/network (`:102-118`). The displayed count is `validCourses`/`filteredCourses`, where `validCourses` **drops every course whose `credits` does not parse to `> 0`** (`:151-156`). The header shows the credit fraction from the dashboard (`:207-228`), and the empty state is **"No courses in this category"** when the filtered list is empty (`:310-326`).
- Credit display helpers: `formatCategoryCreditFraction` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/curriculum/components/CreditProgressCard.kt:170-175`) and `isCreditRequirementMet` (`:163-168`) operate purely on the dashboard strings; `TotalCreditsCard` shows earned/required (`:257-304`).

**Why a category can show 0 courses while total credits are non-zero:** credits and course rows are parsed from two different HTML pages, and the course count is post-filtered to `credits > 0`. So the dashboard can report e.g. `12 / 12` credits (earned in earlier semesters / from the dashboard's own counters) while the category view yields zero *countable* courses because (a) the category page returned no rows or failed to parse (code regex / `cells.size < 5`), or (b) every parsed row has credits `"0"` because the credit column index did not line up, and `validCourses` filters those out. The two numbers are never reconciled against each other.

**What the extension should do:** Keep credits and course counts from their respective endpoints and never compute one from the other. Apply the same `credits > 0` filter when counting courses (`CurriculumCategoryDetailScreen.kt:151-156`), keep the `maxCredits > 0` visibility filter (`CurriculumScreen.kt:243-249`), and show "No courses in this category" when the filtered list is empty even if the header still displays a non-zero credit fraction. Do not fabricate courses to make the counts agree.

---

## 4. Settings — how the user reaches it (exact labels / routes)

**Route definition.** `Screen.Settings(val category: String? = null)` with `route = "settings"` or `"settings/<category>"` (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/RetopNav3Adapter.kt:110-112`); `navCategory = "settings"` (`:36`); route parsing `settings` → `Settings()`, `settings/...` → `Settings(category)` (`:212-213`). Settings sub-screens are treated as subscreens (`:294`, `:311`) and parent to `Screen.Settings()` (`:326-333`), with `Backup -> Settings("account")` and `SyncStatus -> Settings("sync")` (`:330-331`). Nav host entry: `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/navigation/RetopNavGraph.kt:368-391` renders `SettingsScreen(category = key.category, ...)` and pushes `Screen.Settings(catKey)` on category navigation (`:378-380`).

**Primary entry point (Home → avatar → Settings):**

1. Home top bar's circular avatar button (`contentDescription = "Profile"`) sets `showProfileSheet = true` — `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/DashboardScreen.kt:1210-1222`.
2. That opens `RetopProfileBottomSheet` (`:1957-1977`); its "bottom line thicc buttons" are **ID Card** and **Settings** (`:3081-3130`). The Settings button uses `Symbols.Settings` and label `stringResource(R.string.settings)` (`:3120-3128`) and calls `onNavigateToSettings` (`:3113`), which closes the sheet and forwards to the screen-level callback (`:1972-1975`).
3. `MainActivity` wires that callback to `navigateTopLevel(Screen.Settings())` — `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/MainActivity.kt:1202`.

**Other entry points:**

- Bottom pill bar supports route `"settings"` with icon `Symbols.Settings` and title **"Settings"** (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/BottomPillBar.kt:128`, `:151`); the bar shows `home + pinnedRoutes` (`BottomPillBar.kt:185-188`). It is **not** pinned by default — defaults are `exams, marks, grades, course_page` (`MainActivity.kt:576-592`) — but a user can pin it via the reorder flow.
- Voice/assistant command: route `"settings"`, title **"Settings"**, subtitle "Appearance, security, theme & notifications", keywords include "settings", "preferences", "theme", "dark mode", "notifications", "sync", "sign out", "logout" (`/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/search/VoiceCommandRouter.kt:162-173`) → `Screen.Settings()`.

**In-screen labels (exact English strings).** `SettingsScreen` groups: **Account**, **Appearance**, **Sync & notifications**, **Reminders & Alerts**, **About** (`SettingsCategory` at `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop/ui/settings/SettingsScreen.kt:117-134`; rendered list `:388-395`, items `:452-470`; screen title `"Settings"` at `:429`). String literals: `settings = "Settings"` (`strings.xml:333`), `account = "Account"` (`:38`), `appearance = "Appearance"` (`:46`), `settings_sync_notifications = "Sync & notifications"` (`:275`), `reminders_alerts = "Reminders & Alerts"` (`:272`), `about = "About"` (`:67`). Category route keys are `account`, `appearance`, `sync`, `reminders`, `about` (`SettingsScreen.kt:125-129`) → `settings/account`, `settings/appearance`, etc.

**What the extension should do:** Match the route `settings` (and `settings/<category>` with keys `account|appearance|sync|reminders|about`) and the exact English labels above. The discoverable entry point is Home → profile avatar → "Settings" button; `"settings"` is a valid bottom-pill pin and a voice-command target. Do not expect Settings in the default bottom pill bar (defaults exclude it).
