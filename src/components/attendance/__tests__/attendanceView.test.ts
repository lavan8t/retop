import { describe, expect, test } from 'bun:test';
import {
  attendanceTone,
  displayPercentage,
  forecastAdvice,
  formatRecordDate,
  groupRecordsByMonth,
  historyStatusLabel,
  isLabCourse,
  leaveImpact,
  overallAttendancePercentage,
  overallVerdict,
  parseRecordDate,
  projectAttendance,
  recordStatus,
} from '../attendanceView';
import type { DetailedAttendanceCourse } from '../../../types/vtop';

const course = (percentage: number): DetailedAttendanceCourse => ({
  slNo: '1',
  courseCode: 'CSE101',
  courseTitle: 'Programming',
  courseType: 'Theory',
  classType: 'Theory',
  classDetail: 'A1',
  faculty: 'Dr X',
  attended: 12,
  total: 16,
  percentage,
  debarStatus: '-',
  semesterSubId: 'S1',
  courseId: 'C1',
});

describe('attendance tone', () => {
  test('thresholds follow the Android look', () => {
    expect(attendanceTone(74)).toBe('critical');
    expect(attendanceTone(69)).toBe('critical');
    expect(attendanceTone(75)).toBe('warning');
    expect(attendanceTone(79)).toBe('warning');
    expect(attendanceTone(89)).toBe('warning');
    expect(attendanceTone(89.4)).toBe('warning');
    expect(attendanceTone(90)).toBe('safe');
    expect(attendanceTone(NaN)).toBe('na');
  });

  test('nine-pointers (CGPA >= 9) stay neutral below 90 and safe at 90+', () => {
    expect(attendanceTone(69, true)).toBe('neutral');
    expect(attendanceTone(79, true)).toBe('neutral');
    expect(attendanceTone(89, true)).toBe('neutral');
    expect(attendanceTone(89.4, true)).toBe('neutral');
    expect(attendanceTone(90, true)).toBe('safe');
    expect(attendanceTone(99, true)).toBe('safe');
    expect(attendanceTone(NaN, true)).toBe('na');
  });

  test('nothing conducted reads N/A', () => {
    expect(displayPercentage(NaN, 0)).toBe('N/A');
    expect(displayPercentage(0, 0)).toBe('N/A');
    expect(displayPercentage(82.6, 16)).toBe('83%');
  });

  test('zero total suppresses critical/warning tones, even for nine-pointers', () => {
    expect(attendanceTone(0, false, 0)).toBe('na');
    expect(attendanceTone(60, false, 0)).toBe('na');
    expect(attendanceTone(60, true, 0)).toBe('na');
    expect(attendanceTone(0, false, 16)).toBe('critical');
  });
});

describe('overall attendance', () => {
  test('averages only courses with conducted classes, else --', () => {
    expect(
      overallAttendancePercentage([
        { percentage: 80, total: 10 },
        { percentage: 90, total: 10 },
      ]),
    ).toBe('85%');
    expect(
      overallAttendancePercentage([
        { percentage: 82, total: 0 },
        { percentage: 90, total: 10 },
      ]),
    ).toBe('90%');
    expect(overallAttendancePercentage([{ percentage: 82, total: 0 }])).toBe(
      '--',
    );
    expect(overallAttendancePercentage([])).toBe('--');
  });

  test('verdict names the zero-conducted state and excludes 0-total rows', () => {
    expect(overallVerdict([{ ...course(0), total: 0 }])).toEqual({
      text: 'No classes conducted yet',
      critical: false,
    });
    expect(overallVerdict([{ ...course(0), total: 0 }, course(60)]).text).toBe(
      '1 course below 75%',
    );
  });
});

describe('overview and forecast copy', () => {
  test('verdict names the worst state without colour', () => {
    expect(overallVerdict([course(90)])).toEqual({
      text: 'All courses on track',
      critical: false,
    });
    expect(overallVerdict([course(80)]).text).toBe('1 course needs attention');
    expect(overallVerdict([course(60), course(60), course(80)]).text).toBe(
      '2 courses below 75%',
    );
    expect(overallVerdict([course(60)]).critical).toBe(true);
    expect(overallVerdict([course(60)], true)).toEqual({
      text: 'All courses on track',
      critical: false,
    });
  });

  test('leave impact carries a title, dates and miss count', () => {
    const impact = leaveImpact(
      {
        futureScheduledClasses: 10,
        safeSkips: 3,
        requiredToPass: 0,
        classesNeededBeforeExam: 0,
        status: 'SAFE',
        examStartDate: null,
        examName: 'Mid Sem',
      },
      16,
      12,
    );
    expect(impact).toEqual({
      title: 'Can skip 3 classes safely',
      dates: 'Before Mid Sem',
      missed: '4 missed so far',
      critical: false,
    });
    expect(leaveImpact(null, 16, 12)).toBeNull();
  });

  test('critical advice reports classes needed', () => {
    expect(
      forecastAdvice({
        futureScheduledClasses: 10,
        safeSkips: 0,
        requiredToPass: 5,
        classesNeededBeforeExam: 7,
        status: 'CRITICAL',
        examStartDate: null,
        examName: 'End Sem',
      }),
    ).toBe('Need 7 classes before End Sem for 75%');
  });
});

describe('history grouping', () => {
  test('parses both ISO and dd-mm-yyyy dates', () => {
    expect(parseRecordDate('2026-03-05')?.getDate()).toBe(5);
    expect(parseRecordDate('05-03-2026')?.getMonth()).toBe(2);
    expect(parseRecordDate('not a date')).toBeNull();
    expect(formatRecordDate(parseRecordDate('05-03-2026'), 'raw')).toBe(
      '5 Mar',
    );
  });

  test('groups by month and orders months and entries', () => {
    const records = [
      { date: '2026-02-02', status: 'Absent' },
      { date: '2026-03-01', status: 'Present' },
      { date: '2026-03-05', status: 'Present' },
    ] as any;
    const desc = groupRecordsByMonth(records, 'desc');
    const currentYear = new Date().getFullYear();
    expect(desc[0].label).toBe(currentYear === 2026 ? 'March' : 'March 2026');
    expect(desc[0].entries[0].record.date).toBe('2026-03-05');
    expect(desc[1].label).toBe(
      currentYear === 2026 ? 'February' : 'February 2026',
    );
    expect(groupRecordsByMonth(records, 'asc')[0].label).toBe(
      currentYear === 2026 ? 'February' : 'February 2026',
    );
  });

  test('status is described in words', () => {
    expect(recordStatus('Present')).toBe('present');
    expect(recordStatus('Absent')).toBe('absent');
    expect(recordStatus('Medical Leave')).toBe('other');
  });

  test('history label uses the real status text, never a generic Other', () => {
    expect(historyStatusLabel('Present')).toBe('Present');
    expect(historyStatusLabel('Absent')).toBe('Absent');
    expect(historyStatusLabel('Upcoming')).toBe('Upcoming');
    expect(historyStatusLabel('On Duty')).toBe('On Duty');
    expect(historyStatusLabel('On Leave')).toBe('On Leave');
    expect(historyStatusLabel('Excused')).toBe('Excused');
    expect(historyStatusLabel('  Late  ')).toBe('Late');
    expect(historyStatusLabel('')).toBe('Other');
  });
});

describe('what-if projection', () => {
  test('lab classes weigh twice and percentage never exceeds 100', () => {
    expect(
      projectAttendance({
        attended: 10,
        conducted: 20,
        attend: 2,
        bunk: 1,
        weight: 2,
      }),
    ).toEqual({
      attended: 14,
      conducted: 26,
      percentage: 54,
      invalid: false,
    });
    expect(
      projectAttendance({
        attended: 12,
        conducted: 10,
        attend: 1,
        bunk: 0,
        weight: 1,
      }),
    ).toEqual({
      attended: 13,
      conducted: 11,
      percentage: 100,
      invalid: true,
    });
  });

  test('lab detection uses class or course type', () => {
    expect(isLabCourse({ ...course(80), classType: 'Lab' })).toBe(true);
    expect(isLabCourse({ ...course(80), classType: 'ELA' })).toBe(true);
    expect(isLabCourse(course(80))).toBe(false);
  });
});
