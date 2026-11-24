import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  distributionPosition,
  gradeColorVar,
  gradeContainerVar,
  gradePoints,
  groupHistoryIntoSemesters,
  nearestPointIndex,
  normalizeGrade,
} from '../gradeLogic';
import type { GradeHistoryCourse } from '../../../types/vtop';

const course = (grade: string, credits: string, examMonth: string) =>
  ({
    grade,
    credits,
    examMonth,
    slNo: '1',
    code: 'CSE1001',
    title: 'Course',
    type: 'TH',
    resultDeclared: '',
    courseDistribution: '',
  }) as GradeHistoryCourse;

describe('grade semantic roles', () => {
  test('normalizes blank and dash grades', () => {
    expect(normalizeGrade(' s ')).toBe('S');
    expect(normalizeGrade('-')).toBe('-');
    expect(normalizeGrade(null)).toBe('-');
  });

  test('every grade maps to a semantic token, never a literal colour', () => {
    for (const grade of ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'N', 'P', '-']) {
      for (const value of [gradeColorVar(grade), gradeContainerVar(grade)]) {
        expect(value.startsWith('var(--md-sys-color-')).toBe(true);
        expect(value).not.toMatch(/#[0-9a-f]{3,8}/i);
      }
    }
    expect(gradeColorVar('F')).toBe(gradeColorVar('N'));
    expect(gradeColorVar('-')).toBe('var(--md-sys-color-on-surface-variant)');
  });

  test('grade points follow the 0–10 scale', () => {
    expect(gradePoints('S')).toBe(10);
    expect(gradePoints('E')).toBe(5);
    expect(gradePoints('F')).toBe(0);
    expect(gradePoints('N')).toBeNull();
    expect(gradePoints('-')).toBeNull();
  });

  test('distribution and nearest-point maths clamp to their bounds', () => {
    expect(distributionPosition(10)).toBe(1);
    expect(distributionPosition(-3)).toBe(0);
    expect(distributionPosition(8.5)).toBe(0.85);
    expect(distributionPosition(NaN)).toBe(0);
    expect(nearestPointIndex(4, 0)).toBe(0);
    expect(nearestPointIndex(4, 1)).toBe(3);
    expect(nearestPointIndex(0, 0.5)).toBe(-1);
  });
});

const root = resolve(import.meta.dir, '../../../..');
const source = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

const GRADE_UI_FILES = [
  'src/pages/grades.tsx',
  'src/components/grades/SemesterSection.tsx',
  'src/components/grades/GradeCourseRow.tsx',
  'src/components/grades/CourseDetailBody.tsx',
  'src/components/grades/GradeBreakdown.tsx',
  'src/components/grades/GradeHero.tsx',
  'src/components/grades/GradeTrendChart.tsx',
];

describe('grade history presentation', () => {
  test('uses connected M3E buttons for the two grade views', () => {
    const page = source(GRADE_UI_FILES[0]);
    expect(page).toContain('variant="connected"');
    expect(page).not.toContain('m3e-segmented-button');
    expect(page.match(/selected=\{view ===/g) ?? []).toHaveLength(2);
    expect(page.match(/onClick=\{\(\) => setView\(/g) ?? []).toHaveLength(2);
  });

  test('renders grade rows as M3E lists without card bulk', () => {
    const page = source(GRADE_UI_FILES[0]);
    const row = source(GRADE_UI_FILES[2]);
    for (const text of [page, row]) {
      expect(text).toContain('<M3eList');
      expect(text).toContain('<M3eListItem');
    }
    expect(page).not.toContain('rounded-2xl bg-(--bg-surface) px-4 py-2.5');
  });

  test('has no uppercase styling or uppercase labels', () => {
    for (const file of GRADE_UI_FILES) {
      const text = source(file);
      expect(text).not.toMatch(/uppercase|font-black/);
      expect(text).not.toMatch(/\b(CGPA|GPA|NGCR|CR|SD|THEORY ONLY)\b/);
    }
  });

  test('uses only M3E semantic colour roles in the grade UI', () => {
    for (const file of GRADE_UI_FILES) {
      expect(source(file)).not.toMatch(
        /--(?:bg|text|accent|att|color|border)-/,
      );
    }
  });

  test('leaves reload to the shell', () => {
    const page = source(GRADE_UI_FILES[0]);
    expect(page).not.toContain('retop-refresh-grades');
    expect(page).not.toContain('Refresh grades');
    expect(page).not.toContain('>Retry<');
  });
});

describe('history semester grouping', () => {
  test('groups by exam month and derives term + running Cgpa', () => {
    const groups = groupHistoryIntoSemesters([
      course('S', '4', 'Dec-2024'),
      course('A', '4', 'Dec-2024'),
      course('B', '3', 'May-2025'),
    ]);

    expect(groups.length).toBe(2);
    expect(groups[0].term).toBe('Dec 2024');
    expect(groups[0].number).toBe(1);
    // (4*10 + 4*9) / 8 = 9.5
    expect(groups[0].gpa).toBe('9.50');
    expect(groups[0].cgpa).toBe('9.50');
    // running (76 + 3*8) / 11 = 9.09
    expect(groups[1].cgpa).toBe('9.09');
    expect(groups[1].gpa).toBe('8.00');
  });

  test('skips ungraded letters and keeps order of first appearance', () => {
    const groups = groupHistoryIntoSemesters([
      course('N', '4', 'May-2025'),
      course('S', '4', 'Dec-2024'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['May-2025', 'Dec-2024']);
    expect(groups[0].gpa).toBeNull();
  });
});
