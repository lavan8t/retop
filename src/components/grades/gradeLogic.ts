import type { GradeHistoryCourse } from '../../types/vtop';

/** S → N, the order used by the Android grade-breakdown chips. */
export const LETTER_GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'N'] as const;

const GRADE_POINTS: Record<string, number> = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
};

export function normalizeGrade(grade?: string | null): string {
  const g = (grade ?? '').trim().toUpperCase();
  return g === '' || g === '-' ? '-' : g;
}

/** Grade point on the 0–10 scale, or null when the grade is ungraded. */
export function gradePoints(grade?: string | null): number | null {
  const g = normalizeGrade(grade);
  return GRADE_POINTS[g] ?? null;
}

/**
 * Grade → M3E semantic colour role. Kept as var() strings so every theme
 * (light/dark/AMOLED/user accent) resolves it; never a literal colour.
 */
export function gradeColorVar(grade?: string | null): string {
  switch (normalizeGrade(grade)) {
    case 'S':
    case 'P':
      return 'var(--md-sys-color-success)';
    case 'A':
      return 'var(--md-sys-color-info)';
    case 'B':
      return 'var(--md-sys-color-tertiary)';
    case 'C':
      return 'var(--md-sys-color-primary)';
    case 'D':
    case 'E':
      return 'var(--md-sys-color-warning)';
    case 'F':
    case 'N':
      return 'var(--md-sys-color-error)';
    default:
      return 'var(--md-sys-color-on-surface-variant)';
  }
}

/** Matching tonal container for a grade chip — also token-only. */
export function gradeContainerVar(grade?: string | null): string {
  switch (normalizeGrade(grade)) {
    case 'S':
    case 'P':
      return 'var(--md-sys-color-success-container)';
    case 'D':
    case 'E':
      return 'var(--md-sys-color-warning-container)';
    case 'F':
    case 'N':
      return 'var(--md-sys-color-error-container)';
    default:
      return 'var(--md-sys-color-surface-container-high)';
  }
}

/** Position of a 0–10 mark on the distribution spectrum, clamped to 0–1. */
export function distributionPosition(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value / 10));
}

/** Index of the closest point for a 0–1 horizontal ratio. */
export function nearestPointIndex(count: number, ratio: number): number {
  if (count <= 0) return -1;
  return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
}

export interface HistorySemesterGroup {
  key: string;
  term: string;
  number: number;
  courses: GradeHistoryCourse[];
  gpa: string | null;
  cgpa: string | null;
}

/**
 * Group grade-history courses by exam month (one semester each) and derive a
 * term gpa plus a running Cgpa from the same grade points used by prediction.
 */
export function groupHistoryIntoSemesters(
  courses: GradeHistoryCourse[],
): HistorySemesterGroup[] {
  const byTerm = new Map<string, GradeHistoryCourse[]>();
  for (const course of courses) {
    const key = course.examMonth?.trim() || 'Earlier';
    const list = byTerm.get(key);
    if (list) list.push(course);
    else byTerm.set(key, [course]);
  }

  let earnedPoints = 0;
  let earnedCredits = 0;

  return Array.from(byTerm.entries()).map(([key, list], idx) => {
    let points = 0;
    let credits = 0;
    for (const course of list) {
      const grade = normalizeGrade(course.grade);
      if (GRADE_POINTS[grade] === undefined) continue;
      const credit = parseFloat(course.credits || '0');
      if (!Number.isFinite(credit)) continue;
      points += credit * GRADE_POINTS[grade];
      credits += credit;
    }
    earnedPoints += points;
    earnedCredits += credits;

    return {
      key,
      term: key.replace(/-/g, ' '),
      number: idx + 1,
      courses: list,
      gpa: credits > 0 ? (points / credits).toFixed(2) : null,
      cgpa:
        earnedCredits > 0 ? (earnedPoints / earnedCredits).toFixed(2) : null,
    };
  });
}
