import type { CourseSummary, DetailedAttendanceCourse } from '../types/vtop';

/**
 * VIT-AP has no dashboard attendance widget, so Home rows come from the
 * attendance page. Keep `total`/`attended` so Home's overall percentage works.
 */
export function detailedToCourseSummary(
  c: DetailedAttendanceCourse,
): CourseSummary {
  return {
    code: c.courseCode,
    name: c.courseTitle,
    type: c.classType || c.courseType,
    slot: c.classDetail,
    faculty: c.faculty,
    attendance: String(c.percentage),
    attended: c.attended,
    total: c.total,
  };
}
