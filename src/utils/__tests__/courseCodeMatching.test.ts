import { describe, expect, test } from 'bun:test';
import {
  matchRegisteredAttendance,
  normalizeCourseCode,
} from '../courseCodeMatching';
import type { CourseSummary, TimetableCourse } from '../../types/vtop';

const att = (code: string, attendance = '82'): CourseSummary => ({
  code,
  name: code,
  slot: 'N/A',
  faculty: 'N/A',
  attendance,
});

const tt = (code: string): TimetableCourse => ({
  code,
  title: code,
  type: 'Theory',
  credits: '3',
  category: 'Core',
  slot: 'A1',
  venue: 'V1',
  faculty: 'F',
  classId: 'C',
  status: 'Registered',
});

describe('normalizeCourseCode', () => {
  test('trims and lowercases so code shape never decides a match', () => {
    expect(normalizeCourseCode(' BCSE203E ')).toBe('bcse203e');
    expect(normalizeCourseCode('bcse203e')).toBe(
      normalizeCourseCode('BCSE203E'),
    );
    expect(normalizeCourseCode(undefined as any)).toBe('');
  });
});

describe('matchRegisteredAttendance', () => {
  test('matches case-insensitively and after trimming', () => {
    const rows = [att('bcse203e', '82'), att('MATH101', '90')];
    const result = matchRegisteredAttendance(rows, [tt(' BCSE203E ')]);
    expect(result.map((c) => c.code)).toEqual(['bcse203e']);
  });

  test('falls back to all attendance rows when no course code matches', () => {
    const rows = [att('CSE101'), att('MATH101')];
    expect(matchRegisteredAttendance(rows, [tt('PHY101')])).toEqual(rows);
  });

  test('with no timetable, keeps all rows; with no rows, returns empty', () => {
    const rows = [att('CSE101')];
    expect(matchRegisteredAttendance(rows, [])).toEqual(rows);
    expect(matchRegisteredAttendance([], [tt('CSE101')])).toEqual([]);
  });
});
