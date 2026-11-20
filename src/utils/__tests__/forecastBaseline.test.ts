import { describe, expect, test } from 'bun:test';
import {
  calculateAttendanceForecast,
  resolveForecastBaseline,
} from '../attendanceForecaster';
import type { CourseSummary, DetailedAttendanceCourse } from '../../types/vtop';

const detailed = (
  code: string,
  attended: number,
  total: number,
): DetailedAttendanceCourse => ({
  slNo: '1',
  courseCode: code,
  courseTitle: code,
  courseType: 'Theory',
  classType: 'Theory',
  classDetail: 'A1',
  faculty: 'F',
  attended,
  total,
  percentage: total > 0 ? (attended / total) * 100 : 0,
  debarStatus: '-',
  semesterSubId: 'S1',
  courseId: 'C1',
});

const dashboard = (code: string, attendance: string): CourseSummary => ({
  code,
  name: code,
  slot: 'N/A',
  faculty: 'N/A',
  attendance,
});

describe('resolveForecastBaseline', () => {
  test('prefers detailed attendance attended/total when totals are present', () => {
    expect(
      resolveForecastBaseline(
        'CSE101',
        [detailed('CSE101', 12, 16)],
        [dashboard('CSE101', '50')],
      ),
    ).toEqual({ attended: 12, total: 16, source: 'detailed' });
  });

  test('uses the dashboard percentage only when detailed totals are zero', () => {
    expect(
      resolveForecastBaseline(
        'cse101',
        [detailed('CSE101', 0, 0)],
        [dashboard(' CSE101 ', '82')],
      ),
    ).toEqual({ attended: 82, total: 100, source: 'dashboard' });
  });

  test('falls back to dashboard rows when there is no detailed match', () => {
    expect(
      resolveForecastBaseline('CSE101', [], [dashboard('CSE101', '75')]),
    ).toEqual({ attended: 75, total: 100, source: 'dashboard' });
  });

  test('with no data at all, the baseline has no total', () => {
    expect(resolveForecastBaseline('CSE101', [], [])).toEqual({
      attended: 0,
      total: 0,
      source: 'none',
    });
    expect(
      resolveForecastBaseline('', [detailed('CSE101', 12, 16)], []),
    ).toEqual({
      attended: 0,
      total: 0,
      source: 'none',
    });
  });
});

describe('zero-conducted forecast never reads critical', () => {
  test('no attended/total and no future classes is not CRITICAL', () => {
    const forecast = calculateAttendanceForecast('CSE101', 0, 0, [], [], []);
    expect(forecast.status).not.toBe('CRITICAL');
    expect(forecast.requiredToPass).toBe(0);
  });
});
