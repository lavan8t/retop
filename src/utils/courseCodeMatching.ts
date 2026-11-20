import type { CourseSummary, TimetableCourse } from '../types/vtop';

/** Course codes arrive in mixed case and with stray whitespace from VTOP. */
export const normalizeCourseCode = (code: string): string =>
  (code ?? '').trim().toLowerCase();

/**
 * Registered-course attendance rows. A code-shape mismatch must not blank the
 * list: when nothing matches, the attendance rows themselves are the fallback.
 */
export function matchRegisteredAttendance(
  attendance: CourseSummary[],
  ttCourses: TimetableCourse[],
): CourseSummary[] {
  if (!attendance || attendance.length === 0) return [];
  if (!ttCourses || ttCourses.length === 0) return attendance;

  const registeredCodes = new Set(
    ttCourses.map((course) => normalizeCourseCode(course.code)),
  );
  const matched = attendance.filter((row) =>
    registeredCodes.has(normalizeCourseCode(row.code)),
  );
  return matched.length > 0 ? matched : attendance;
}
