# VIT-AP screen endpoint map

Live-probed on the logged-in VIT-AP tab, 2026-11-21. Reg `26BEE7068`,
semester `AP2026275`. No secrets stored. All responses `text/html;charset=UTF-8`.

## Screen → working endpoint → response shape

| Screen | Endpoint that works | Status | Body | Parsable selectors |
|---|---|---|---|---|
| Timetable | `POST /vtop/processViewTimeTable` (`semesterSubId`) | 200 | 113515 | `#timeTableStyle`, 2 tables, 30 rows |
| Attendance | `POST /vtop/processViewStudentAttendance` (`semesterSubId`) | 200 | 30418 | `#AttendanceDetailDataTable`, 12 rows, `studentAttendanceDetilShow_0..10` |
| Calendar shell | `POST /vtop/academics/common/CalendarPreview` | 200 | 13222 | `#calendarView`, `#semesterSubId` (58 opts), `#classGroupId`, `#getDateForSemesterPreview`, `#getListForSemester` |
| Calendar data | `POST /vtop/getListForSemester` (`semesterSubId`) | 200 | 8629 | `#calendarView`, 1 table, 2 rows |
| Exam schedule | `POST /vtop/examinations/StudExamSchedule` | 200 | 8772 | `#examSchedule`, `#semesterSubId` (70 opts) |
| Exam schedule data | `POST /vtop/examinations/doSearchExamScheduleForStudent` (`semesterSubId`) | 200 | 8442 | `#examSchedule` |
| Marks shell | `POST /vtop/examinations/StudentMarkView` | 200 | 8683 | `#studentMarkView`, `#semesterSubId` (70 opts) |
| Marks data | `POST /vtop/examinations/doStudentMarkView` (`semesterSubId`) | 200 | 8302 | `#studentMarkView` |
| Grades shell | `POST /vtop/examinations/examGradeView/StudentGradeView` | 200 | 9498 | `#studentGradeView`, `#semesterSubId` (70 opts) |
| Grades data | `POST /vtop/examinations/examGradeView/doStudentGradeView` (`semesterSubId`) | 200 | 9119 | `#studentGradeView` |
| Grade data (alt) | `POST /vtop/examinations/examGradeView/getGradeViewDetails` (`semesterSubId`) | 200 | 10764 | `#studentGradeView`, 1 table, 2 rows |
| Grade history shell | `POST /vtop/examinations/examGradeView/StudentGradeHistory` | 200 | 10920 | `#studentGradeView`, `#fixedTableContainer`, 2 tables, 4 rows; JS actions `doStudentGradeView`, `getGradeViewDetails` |
| CGPA | from `getGradeViewDetails` / grade history tables (no separate endpoint) | 200 | — | — |

## Failures (do not use on AP)

- `/vtop/academics/common/processViewTimeTable` — 404
- `/vtop/academics/common/processViewStudentAttendance` — 404
- `/vtop/academics/common/processViewStudentCourseDetail` — 404
- `/vtop/processViewStudentCourseDetail` — 404
- `/vtop/doStudentMarkView` (flat) — 404
- `/vtop/get/dashboard/current/semester/course/details` — 404 (no dashboard widget on AP)
- `/vtop/examinations/examGradeView/doStudentGradeHistory` — 404

## Note

Semester selector options are abundant (58 on calendar, 70 on marks/grades).
The extension's semester IDs from Vellore will not work on AP; the campus-aware
network layer must use AP semester IDs and AP endpoints together.
