import { describe, expect, it } from 'bun:test';
import { detailedToCourseSummary } from '../attendanceHome';
import { overallAttendancePercentage } from '../../components/attendance/attendanceView';
import type { DetailedAttendanceCourse } from '../../types/vtop';

const apCourse = (
  overrides: Partial<DetailedAttendanceCourse> = {},
): DetailedAttendanceCourse => ({
  slNo: '1',
  courseCode: 'BCSE203E',
  courseTitle: 'Web Programming',
  courseType: 'Embedded Theory',
  classType: 'ETH',
  classDetail: 'VL2026270102310 - TAA1 - PRP124',
  faculty: 'Dr X',
  attended: 12,
  total: 16,
  percentage: 75,
  debarStatus: '-',
  semesterSubId: 'AP2026275',
  courseId: 'C1',
  ...overrides,
});

describe('detailedToCourseSummary (VIT-AP home attendance)', () => {
  it('maps an attendance-page row into a Home course summary with a numeric total', () => {
    expect(detailedToCourseSummary(apCourse())).toEqual({
      code: 'BCSE203E',
      name: 'Web Programming',
      type: 'ETH',
      slot: 'VL2026270102310 - TAA1 - PRP124',
      faculty: 'Dr X',
      attendance: '75',
      attended: 12,
      total: 16,
    });
  });

  it('falls back to courseType when classType is missing', () => {
    const mapped = detailedToCourseSummary(
      apCourse({ classType: '', courseType: 'Theory' }),
    );
    expect(mapped.type).toBe('Theory');
  });

  it('feeds Home overallAttendancePercentage a real number', () => {
    const rows = [
      apCourse({ percentage: 80, total: 10, attended: 8 }),
      apCourse({
        courseCode: 'BCSE204E',
        percentage: 90,
        total: 10,
        attended: 9,
      }),
    ].map(detailedToCourseSummary);

    expect(
      overallAttendancePercentage(
        rows.map((r) => ({
          percentage: parseFloat(r.attendance),
          total: r.total ?? 0,
        })),
      ),
    ).toBe('85%');
  });
});
