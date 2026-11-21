# VIT-AP live session reconnaissance

Captured from the live VIT-AP VTOP tab on 2026-11-21 while logged in as registration
`26BEE7068`. Only structural/session facts are recorded here. No password, cookie
value, CSRF token value, or other secret is stored in this file (lengths only).

## Session facts

| Fact | Value |
|---|---|
| Authenticated URL | `https://vtop.vitap.ac.in/vtop/content?` |
| Page title | `VIT-AP - VTOP` |
| `#authorizedIDX` | `26BEE7068` (registration number, same role as Vellore) |
| `input[name=_csrf]` count | 5 |
| CSRF token length | 36 chars each (UUID-shaped) |
| `window.csrfValue` | present, length 36 |
| `window.authorizedID` | populated (array-like structure) |
| `retop-host` mounted | false — this was the native VTOP page, not retop |

The login flow matched the documented VTOP variant:
`/vtop/open/page` -> `/vtop/prelogin/setup` (`flag=VTOP`) -> `/vtop/login`,
with a JPEG captcha inline at `/vtop/login` and refresh via
`/vtop/get/new/captcha`.

## Menu `data-url` endpoints (AP, from the live nav)

| Menu label | `data-url` |
|---|---|
| Profile | `studentsRecord/StudentProfileAllView` |
| General | `admissions/costCentreCircularsViewPageController` |
| My Curriculum | `academics/common/Curriculum` |
| Time Table | `academics/common/StudentTimeTable` |
| Class Attendance | `academics/common/StudentAttendance` |
| Course Page | `academics/common/StudentCoursePage` |
| Digital Assignment Upload | `examinations/StudentDA` |
| Academics Calendar | `academics/common/CalendarPreview` |
| Exam Schedule | `examinations/arrearRegistration/viewRARExamSchedule` |
| Marks | `examinations/StudentMarkView` |

These are the **same `data-url` values** used by Vellore/Chennai in
`src/parsers/menu.ts`. No AP-specific endpoint renaming observed in the menu.

## Comparison with extension code

- `Marks`: extension uses `examinations/StudentMarkView` + `examinations/doStudentMarkView`
  (`src/utils/network.ts:835,850`). AP menu exposes the same base path — likely compatible.
- `Dashboard` attendance widget: extension reads
  `get/dashboard/current/semester/course/details`
  (`src/utils/dashboardInterceptor.ts:79`). Not yet observed on AP; must verify in HAR.
- Detailed attendance parser expects `#StudentAttendanceDetailDataTable`
  (`src/parsers/attendance.ts:92`). AP page uses `academics/common/StudentAttendance`;
  table ID must be verified in HAR.
- Course page parser expects `data-fileid` / `#materialTable`
  (`src/parsers/course-page.ts`). AP endpoint `academics/common/StudentCoursePage`
  must be verified.

## Outstanding HAR verification

Per-page checks still required (navigate each menu item, capture the POST/response):

1. Time Table — `academics/common/StudentTimeTable` vs expected `processViewTimeTable`.
2. Attendance — `academics/common/StudentAttendance` -> `processViewStudentAttendance`
   and detail table IDs.
3. Course Page — `academics/common/StudentCoursePage` -> `processViewStudentCourseDetail`.
4. Marks — `examinations/StudentMarkView` -> `doStudentMarkView`.
5. Grades — endpoint not in menu list; find via `grade history` link.
6. Calendar — `academics/common/CalendarPreview`.
7. Curriculum — `academics/common/Curriculum` + category endpoint.
8. Dashboard — `get/dashboard/current/semester/course/details`.

For each: record HTTP status, content-type, response body shape, and whether the
extension parser finds its expected selectors.
