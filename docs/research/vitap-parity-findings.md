# VIT-AP live parity findings

Live session on `https://vtop.vitap.ac.in`, reg `26BEE7068`, 2026-11-21.
No secrets stored; session facts are in `vitap-live-session.md`.
All probes below were POSTs from the logged-in page with `_csrf`, `authorizedID`, `x`,
and `semesterSubId=AP2026275` where relevant. Status/length/selectors only — no secrets.

## Endpoint results

| Endpoint (relative to `/vtop/`) | Status | Body | Notes |
|---|---|---|---|
| `academics/common/processViewTimeTable` | 404 | 679 | Vellore form fails on AP |
| `processViewTimeTable` (flat) | **200** | 113515 | 2 tables, 30 rows, `#timeTableStyle` — timetable data |
| `processViewStudentAttendance` (flat) | **200** | 30418 | `#AttendanceDetailDataTable`, 12 rows — attendance data |
| `academics/common/processViewStudentCourseDetail` | 404 | — | no such path on AP |
| `processViewStudentCourseDetail` (flat) | 404 | — | no such path on AP |
| `examinations/doStudentMarkView` | **200** | 8302 | `#studentMarkView` — marks shell |
| `examinations/StudentMarkView` | **200** | 8683 | `#studentMarkView` — marks page |
| `academics/common/StudentCoursePage` | **200** | 14401 | `#StudentCoursePage`, `#getCourseForCoursePage`, `#courseCode`, `#getSlotIdForCoursePage`, `#getFacultyForCoursePage` |
| `academics/common/CalendarPreview` | **200** | 13222 | `#calendarView`, 1 table |
| `academics/common/Curriculum` | not probed | — | menu `data-url`; expected same as Vellore |
| `get/dashboard/current/semester/course/details` | **404** | 679 | AP has no dashboard widget endpoint |

## Key differences from Vellore

1. **Timetable & attendance data endpoints are flat** on AP:
   `/vtop/processViewTimeTable` and `/vtop/processViewStudentAttendance`.
   Extension currently uses `academics/common/processViewTimeTable`
   (`src/utils/network.ts`) and `processViewStudentAttendance` — the latter already
   works if the extension omits the `academics/common/` prefix; verify how
   `VtopNetwork.fetchFragment` builds the URL.
2. **Dashboard widget endpoint is absent** on AP. `src/utils/dashboardInterceptor.ts:79`
   will never see attendance/CGPA data from that URL. AP must derive Home widgets from
   the per-page endpoints (attendance, marks, timetable) or show `--`.
3. Course page/marks/calendar endpoints match Vellore exactly — existing parsers should
   work once selectors are confirmed against the returned HTML.

## Parser selector check

- Attendance parser `src/parsers/attendance.ts:16,92` expects
  `#AttendanceDetailDataTable tbody tr` — **present** in AP response (12 rows).
- Timetable parser expects `#timeTableStyle`-style tables — present (30 rows).
- Course page parser expects `select#courseId`, `#materialTable`, `data-fileid` —
  need to confirm against `getCourseForCoursePage` response (next probe).
- Marks parser expects `#studentMarkView` tables — shell present; need the data POST.

## Next probes
- `/vtop/processViewStudentCourseDetail` alternatives: look at the JS in
  `academics/common/StudentCoursePage` to find the exact data action.
- Marks data POST: look at JS in `examinations/StudentMarkView`.
- Calendar data: `#calendarView` contents.
- Curriculum + category endpoints.

## Required code change (not yet implemented)
Add a campus-aware endpoint map in `src/utils/network.ts`:
- `campus === 'vitap'`: timetable/attendance use flat `/vtop/processView*` paths.
- All campuses: keep `examinations/*`, `academics/common/StudentCoursePage`,
  `academics/common/CalendarPreview`, `academics/common/Curriculum`.
- Dashboard: skip widget fetch on AP; populate Home from per-page data or `--`.
