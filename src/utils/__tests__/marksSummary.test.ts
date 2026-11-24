import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { AssessmentMark, CourseMarks } from '../../types/vtop';
import {
  calculateCourseMarksSummary,
  groupMarksByCourse,
} from '../marksSummary';

const assessment = (
  title: string,
  overrides: Partial<AssessmentMark> = {},
): AssessmentMark => ({
  title,
  maxMark: '50',
  weightage: '15',
  scoredMark: '40',
  scoredPercentage: '12',
  status: 'Present',
  ...overrides,
});

const course = (code: string, type = 'TH'): CourseMarks => ({
  code,
  type,
  title: `Course ${code}`,
  credits: '3',
  classNumber: '1',
  slot: 'A1',
  faculty: 'F',
  assessments: [],
});

describe('calculateCourseMarksSummary', () => {
  it('aggregates weighted marks like Android, counting Absent in the max', () => {
    const summary = calculateCourseMarksSummary([
      assessment('CAT 1'),
      assessment('CAT 2', {
        weightage: '10',
        maxMark: '30',
        scoredMark: '',
        scoredPercentage: '',
        status: 'Absent',
      }),
      assessment('Total', { weightage: '100', maxMark: '100' }),
      assessment('Mark Title', { weightage: '99' }),
    ]);

    expect(summary.weightScoredText).toBe('12');
    expect(summary.weightMaxText).toBe('25');
    expect(summary.rawMaxText).toBe('80');
    expect(summary.hasMarks).toBe(true);
  });

  it('falls back to raw totals when no assessment carries weightage', () => {
    const summary = calculateCourseMarksSummary([
      assessment('Quiz', {
        weightage: '',
        scoredPercentage: '',
        scoredMark: '18.5',
      }),
    ]);

    expect(summary.weightMax).toBe(0);
    expect(summary.rawScoredText).toBe('18.5');
    expect(summary.rawMaxText).toBe('50');
    expect(summary.hasMarks).toBe(true);
  });

  it('reports no marks for empty or header-only rows', () => {
    expect(calculateCourseMarksSummary([]).hasMarks).toBe(false);
    expect(
      calculateCourseMarksSummary([assessment('Sl.No.', { maxMark: '' })])
        .hasMarks,
    ).toBe(false);
  });
});

describe('groupMarksByCourse', () => {
  it('keeps theory with its lab and orders lab before practical', () => {
    const groups = groupMarksByCourse([
      course('CSE101P', 'P'),
      course('CSE101', 'TH'),
      course('CSE101L', 'LAB'),
      course('CSE102', 'TH'),
    ]);

    expect(groups.map((group) => group.code)).toEqual(['CSE101', 'CSE102']);
    expect(groups[0].courses.map((item) => item.code)).toEqual([
      'CSE101',
      'CSE101L',
      'CSE101P',
    ]);
  });
});

describe('M3E badge registration', () => {
  it('registers the badge component used by the marks card', () => {
    const inject = readFileSync(
      new URL('../../m3e-inject.ts', import.meta.url),
      'utf8',
    );
    const card = readFileSync(
      new URL('../../components/marks/MarksCourseCard.tsx', import.meta.url),
      'utf8',
    );
    expect(inject).toContain("import '@m3e/web/badge'");
    expect(card).toContain('M3eBadge');
  });
});
