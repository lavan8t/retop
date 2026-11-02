import type { Assignment, QuickLink } from '../types/vtop';
import { useAppStore } from '../store/appStore';

export const ASSIGNMENTS_QUICK_LINK: QuickLink = {
  title: 'Assignments',
  url: 'examinations/StudentDA',
  category: 'Examinations',
};

/**
 * Open the assignments page on the course that owns `assignment`, instead of
 * dropping the user on whichever course happens to be first.
 *
 * VTOP's dashboard rows carry the course name but not the class id, so the
 * assignments page resolves the course by title once its course list loads.
 */
export function openAssignmentInDA(
  assignment: Pick<Assignment, 'course' | 'title'>,
  onNavigate: (link: QuickLink) => void,
): void {
  useAppStore.getState().setDaTarget({
    courseTitle: assignment.course,
    assignmentTitle: assignment.title,
  });
  onNavigate(ASSIGNMENTS_QUICK_LINK);
}
