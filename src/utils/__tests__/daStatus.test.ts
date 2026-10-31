import { describe, expect, it } from 'bun:test';
import { mergeAssignmentStatuses } from '../daStatus';
import type { Assignment } from '../../types/vtop';
import type { DACourse, DAAssignment } from '../../parsers/digital-assignments';

const courses: DACourse[] = [
  {
    classId: 'VL1',
    code: 'BCSE307P',
    title: 'Compiler Design Lab',
    type: 'LO',
    faculty: 'SHALINI L',
  },
];

const daRow = (title: string, lastUpdated: string): DAAssignment => ({
  slNo: '1',
  title,
  maxMark: '10',
  weightage: '10',
  dueDate: '31-10-2026',
  lastUpdated,
  code: 'AST10',
});

const assignments: Assignment[] = [
  {
    course: 'Compiler  Design Lab',
    title: 'Review 3',
    dueDate: '31-10-2026',
  },
  {
    course: 'Compiler Design Lab',
    title: 'Review 2',
    dueDate: '16-09-2026',
  },
];

describe('mergeAssignmentStatuses', () => {
  it('marks a dashboard row submitted when the DA row is submitted', () => {
    const merged = mergeAssignmentStatuses(assignments, courses, {
      VL1: [daRow('Review 3', '31 Oct 2026 09:35 PM')],
    });

    expect(merged[0].status).toBe('submitted');
    expect(merged[1].status).toBeUndefined();
  });

  it('does not mark an unsubmitted DA row', () => {
    const merged = mergeAssignmentStatuses(assignments, courses, {
      VL1: [daRow('Review 3', '')],
    });

    expect(merged[0].status).toBeUndefined();
  });

  it('returns the original array when there is nothing to overlay', () => {
    expect(mergeAssignmentStatuses(assignments, [], {})).toBe(assignments);
    expect(mergeAssignmentStatuses(assignments, courses, {})).toBe(assignments);
  });
});
