# VIT-AP Course Page — HAR-derived endpoint flow

Source: attached `coursepage.har` (reg 26BEE7068, sem AP2026273), captured 2026-11-22.
No secrets stored; reg/csrf appear only as raw structural facts in the HAR, not here.

## Flow (all POST, same origin `/vtop/`)

| Step | Endpoint | Params | Response |
|---|---|---|---|
| 1 | `academics/common/StudentCoursePage` | `verifyMenu=true`, `authorizedID`, `_csrf`, `nocache` | 14KB shell with `#getCourseForCoursePage`, `#courseCode` select, `#getSlotIdForCoursePage`, `#getFacultyForCoursePage` |
| 2 | `getCourseForCoursePage` | `_csrf`, `paramReturnId=getCourseForCoursePage`, `semSubId=<sem>`, `authorizedID`, `x` | course `<select id="courseCode">` options like `AP2026273000308` = `CSE1012 - Problem Solving using Python - ETH` |
| 3 | `getSlotIdForCoursePage` | `_csrf`, `classId=<courseCode>`, `praType=source`, `paramReturnId=getSlotIdForCoursePage`, `semSubId`, `authorizedID`, `x` | 111KB shell re-render with slot `<select id="slotId">` (e.g. `4058 = B1+TB1`) + faculty select |
| 4 | `getFacultyForCoursePage` | `_csrf`, `classId`, `slotId=<slot>`, `praType=source`, `paramReturnId=getFacultyForCoursePage`, `semSubId`, `authorizedID`, `x` | 23-38KB re-render with faculty `<select id="faculty">` |
| 5 | `processViewStudentCourseDetail` | `_csrf`, `classId`, `slotId`, `faculty`, `praType=source`, `paramReturnId=getCourseDetailsForCoursePage`, `semSubId`, `authorizedID`, `x` | actual course detail (outcomes/syllabus/materials) — endpoint confirmed from the shell JS; not present as a response in this HAR |

## Differences from Vellore/Chennai

- Old extension uses `academics/CoursePageConsolidated/getCourseDetail` with `semester/CourseId/CoursType`.
- AP uses the flat `getCourseForCoursePage` / `getSlotIdForCoursePage` / `getFacultyForCoursePage` / `processViewStudentCourseDetail` chain with `semSubId`, `classId`, `slotId`, `faculty`, `paramReturnId`.
- Option `classId` is a numeric AP code (`AP2026273000308`), semester comes from `semSubId` (no `data-semestr`).
- Detail selectors for step 5 (materials/outcomes) are NOT in this HAR; they must be confirmed against a live response. Existing `parseCoursePage` expects `#materialTable`, `data-fileid`, `#collapseOutcome`, `#collapseModules`.

## Implementation decisions

- AP-only network methods in `src/utils/network.ts` call `fetchVtopApi` directly (no cache, no new cache keys), gated by `currentCampus() !== 'vitap'` like `getBiometricHistory`. `fetchVtopApi` supplies `_csrf`/`authorizedID` and auto-appends `x` for the cascade steps; the shell passes `nocache` so `x` is omitted there.
- Endpoints are the bare names from the HAR table (`getCourseForCoursePage`, `getSlotIdForCoursePage`, `getFacultyForCoursePage`, `processViewStudentCourseDetail`) plus `academics/common/StudentCoursePage` for the shell; the existing Vellore/Chennai methods are untouched.
- `src/parsers/course-page-ap.ts` parses `select#courseCode` (`CODE - Title - TYPE`, value = classId, semester = selectedSem), `select#slotId`, `select#faculty`, and delegates detail parsing to the existing `parseCoursePage` selectors with an empty-array fallback. AP parsers/version are isolated from `course-page.ts`.
- `useCoursePage.ts` branches only where the cascade differs: options fetch calls the shell then options; details fetch walks slots → first slot → faculty → first faculty → course detail. Non-AP paths and marks/grades/download logic are unchanged.
- Semester changes reuse the existing "fetch only when cpOptions is empty" lifecycle — the same limitation as the non-AP path.
- The AP semester list comes from `select#semesterSubId` in the step-1 shell, parsed by `parseApSemesters` into `cpSemesters` (store). `TopBar` renders one shared `m3e-select` (`@m3e/web/select` + `@m3e/web/option`, registered in the main-world injection) for the course-page view on desktop and mobile; changing it clears `cpOptions` so the options effect refetches. The universal top-right semester dropdown is gone. Non-AP keeps the timetable semester list and is otherwise unchanged.
- RISK: step-5 detail selectors are unverified against a real AP response. If AP uses different DOM, `parseApCourseDetail` returns empty outcomes/syllabus/materials/books rather than throwing; materials may be empty until the selectors are confirmed live.
