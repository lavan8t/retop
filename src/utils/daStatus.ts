import type { Assignment } from '../types/vtop';
import type { DACourse, DAAssignment } from '../parsers/digital-assignments';

const normalize = (value: string | undefined | null): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * VTOP's dashboard endpoint does not contain an "Uploaded" value at all (its
 * body rows are missing the fifth cell), so `parseDigitalAssignments` cannot
 * populate `Assignment.status`.
 *
 * Once the user has visited the assignments page we do know which rows have a
 * submission (`lastUpdated`). Overlay that knowledge on the dashboard list so
 * an uploaded assignment stops being counted as pending for the rest of the
 * session. A reload falls back to "upcoming", which is the most the endpoint
 * can honestly support.
 */
export function mergeAssignmentStatuses(
  assignments: Assignment[],
  courses: DACourse[],
  daAssignments: Record<string, DAAssignment[]>,
): Assignment[] {
  if (assignments.length === 0) return assignments;
  if (courses.length === 0) return assignments;

  const submittedByCourse = new Map<string, Set<string>>();

  for (const course of courses) {
    const rows = daAssignments[course.classId];
    if (!rows || rows.length === 0) continue;

    const submitted = new Set<string>();
    for (const row of rows) {
      if (row.lastUpdated && row.lastUpdated.trim() !== '') {
        submitted.add(normalize(row.title));
      }
    }
    if (submitted.size > 0) {
      submittedByCourse.set(normalize(course.title), submitted);
    }
  }

  if (submittedByCourse.size === 0) return assignments;

  let changed = false;
  const merged = assignments.map((assignment) => {
    const submitted = submittedByCourse
      .get(normalize(assignment.course))
      ?.has(normalize(assignment.title));

    if (!submitted || assignment.status === 'submitted') return assignment;

    changed = true;
    return { ...assignment, status: 'submitted' };
  });

  return changed ? merged : assignments;
}
