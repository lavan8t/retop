import type { AssessmentMark, CourseMarks } from '../types/vtop';

export interface CourseMarksSummary {
  rawScored: number;
  rawMax: number;
  weightScored: number;
  weightMax: number;
  rawScoredText: string;
  rawMaxText: string;
  weightScoredText: string;
  weightMaxText: string;
  hasMarks: boolean;
}

const parseScore = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Android parity: trim whole numbers, keep at most two decimals. */
export const formatScore = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

/** Aggregates a course the same way the Android marks badge does. */
export const calculateCourseMarksSummary = (
  assessments: AssessmentMark[],
): CourseMarksSummary => {
  const valid = (assessments || []).filter((assessment) => {
    const title = (assessment.title || '').trim();
    return (
      !!title &&
      !/^(mark title|sl\.?no\.?|title)$/i.test(title) &&
      !/^total/i.test(title)
    );
  });
  const isAbsent = (assessment: AssessmentMark): boolean =>
    /absent/i.test(assessment.status || '');
  const evaluated = valid.filter(
    (assessment) =>
      isAbsent(assessment) ||
      !!(assessment.scoredMark || '').trim() ||
      !!(assessment.scoredPercentage || '').trim(),
  );
  const scored = evaluated.filter((assessment) => !isAbsent(assessment));
  const sum = (items: AssessmentMark[], key: keyof AssessmentMark): number =>
    items.reduce((total, item) => total + parseScore(item[key] as string), 0);

  const rawScored = sum(scored, 'scoredMark');
  const rawMax = sum(evaluated, 'maxMark');
  const weightScored = sum(scored, 'scoredPercentage');
  const weightMax = sum(evaluated, 'weightage');
  const hasMarks = rawMax > 0 || weightMax > 0;

  return {
    rawScored,
    rawMax,
    weightScored,
    weightMax,
    rawScoredText: formatScore(rawScored),
    rawMaxText: formatScore(rawMax),
    weightScoredText: formatScore(weightScored),
    weightMaxText: formatScore(weightMax),
    hasMarks,
  };
};

/** Lab/practical codes share their theory course's base code. */
export const marksBaseCode = (code: string): string =>
  /[LP]$/.test(code || '') ? code.slice(0, -1) : code || '';

export interface MarksCourseGroup {
  code: string;
  courses: CourseMarks[];
}

/** Keeps theory with its lab/practical and orders L before P. */
export const groupMarksByCourse = (
  courses: CourseMarks[],
): MarksCourseGroup[] => {
  const groups = new Map<string, CourseMarks[]>();
  for (const course of [...(courses || [])].sort((a, b) => {
    const baseA = marksBaseCode(a.code);
    const baseB = marksBaseCode(b.code);
    if (baseA !== baseB) return baseA < baseB ? -1 : 1;
    const labOrder = (code: string) =>
      code.endsWith('L') ? 1 : code.endsWith('P') ? 2 : 0;
    return labOrder(a.code) - labOrder(b.code);
  })) {
    const base = marksBaseCode(course.code);
    const group = groups.get(base) || [];
    group.push(course);
    groups.set(base, group);
  }
  return Array.from(groups, ([code, groupCourses]) => ({
    code,
    courses: groupCourses,
  }));
};
