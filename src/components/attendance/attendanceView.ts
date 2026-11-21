import type {
  AttendanceRecord,
  DetailedAttendanceCourse,
} from '../../types/vtop';
import type { AttendanceForecast } from '../../utils/attendanceForecaster';

export type AttendanceTone = 'na' | 'critical' | 'warning' | 'safe' | 'neutral';

/** Non-color state labels — every toned surface carries one of these in text. */
export const TONE_LABEL: Record<AttendanceTone, string> = {
  na: 'Not conducted',
  critical: 'Critical',
  warning: 'Watch',
  safe: 'On track',
  neutral: 'Within range',
};

/**
 * Android statusColorFor(pct, isNinePointer). A nine-pointer (CGPA >= 9) is
 * only flagged when at or above 90%; below that it stays neutral. Everyone
 * else uses <75 critical, <90 warning, >=90 safe.
 */
export function attendanceTone(
  percentage: number,
  isNinePointer = false,
  total?: number,
): AttendanceTone {
  if (total !== undefined && total <= 0) return 'na';
  if (!Number.isFinite(percentage)) return 'na';
  const rounded = Math.round(percentage);
  if (isNinePointer) return rounded >= 90 ? 'safe' : 'neutral';
  if (rounded < 75) return 'critical';
  if (rounded < 90) return 'warning';
  return 'safe';
}

export function displayPercentage(percentage: number, total: number): string {
  if (!Number.isFinite(percentage) || total <= 0) return 'N/A';
  return `${Math.round(percentage)}%`;
}

/** Average of courses with conducted classes; "--" when none have any. */
export function overallAttendancePercentage(
  courses: ReadonlyArray<{ percentage: number; total: number }>,
): string {
  const valid = courses.filter(
    (c) => c.total > 0 && Number.isFinite(c.percentage),
  );
  if (valid.length === 0) return '--';
  const sum = valid.reduce((acc, c) => acc + c.percentage, 0);
  return `${Math.round(sum / valid.length)}%`;
}

export function overallVerdict(
  courses: DetailedAttendanceCourse[],
  isNinePointer = false,
): {
  text: string;
  critical: boolean;
} {
  const conducted = courses.filter((c) => c.total > 0);
  if (courses.length > 0 && conducted.length === 0) {
    return { text: 'No classes conducted yet', critical: false };
  }
  const tones = conducted.map((c) =>
    attendanceTone(c.percentage, isNinePointer, c.total),
  );
  const critical = tones.filter((t) => t === 'critical').length;
  const warning = tones.filter((t) => t === 'warning').length;
  if (critical > 0) {
    return {
      text: `${critical} course${critical === 1 ? '' : 's'} below 75%`,
      critical: true,
    };
  }
  if (warning > 0) {
    return {
      text: `${warning} course${warning === 1 ? ' needs' : 's need'} attention`,
      critical: false,
    };
  }
  return { text: 'All courses on track', critical: false };
}

export function leaveImpact(
  forecast: AttendanceForecast | null | undefined,
  total: number,
  attended: number,
): {
  title: string;
  dates: string;
  missed: string;
  critical: boolean;
} | null {
  if (!forecast) return null;
  const exam = forecast.examName || 'Exams';
  const needed = forecast.classesNeededBeforeExam || forecast.requiredToPass;
  const title =
    forecast.status === 'CRITICAL'
      ? `Attend ${needed} class${needed === 1 ? '' : 'es'} to stay eligible`
      : `Can skip ${forecast.safeSkips} class${forecast.safeSkips === 1 ? '' : 'es'} safely`;
  const missed = Math.max(0, total - attended);
  return {
    title,
    dates: `Before ${exam}`,
    missed: `${missed} missed so far`,
    critical: forecast.status === 'CRITICAL',
  };
}

export function forecastAdvice(
  forecast: AttendanceForecast | null | undefined,
): string {
  if (!forecast) return '';
  if (forecast.status === 'CRITICAL') {
    const needed = forecast.classesNeededBeforeExam || forecast.requiredToPass;
    return `Need ${needed} classes before ${forecast.examName || 'exams'} for 75%`;
  }
  return `Can skip ${forecast.safeSkips} class${forecast.safeSkips === 1 ? '' : 'es'} safely`;
}

export function parseRecordDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // VTOP emits dd-mm-yyyy; parse it explicitly before the ambiguous Date() path.
  const ddMmYyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(dateStr.trim());
  if (ddMmYyyy) {
    const date = new Date(`${ddMmYyyy[2]} ${ddMmYyyy[1]} ${ddMmYyyy[3]}`);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export function formatRecordDate(date: Date | null, fallback: string): string {
  if (!date) return fallback;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export type RecordStatus = 'present' | 'absent' | 'other';

export function recordStatus(status: string): RecordStatus {
  const lower = (status || '').toLowerCase();
  if (lower.includes('present')) return 'present';
  if (lower.includes('absent')) return 'absent';
  return 'other';
}

/** Android shows the raw status for "other" cases (Upcoming, On Duty, ...). */
export function historyStatusLabel(status: string): string {
  const trimmed = (status || '').trim();
  const tone = recordStatus(trimmed);
  if (tone === 'present') return 'Present';
  if (tone === 'absent') return 'Absent';
  return trimmed || 'Other';
}

export interface HistoryEntry {
  record: AttendanceRecord;
  date: Date | null;
}

export interface HistoryMonth {
  key: string;
  label: string;
  entries: HistoryEntry[];
}

export function groupRecordsByMonth(
  records: AttendanceRecord[],
  sortOrder: 'asc' | 'desc',
): HistoryMonth[] {
  const months = new Map<string, HistoryMonth>();
  for (const record of records) {
    const date = parseRecordDate(record.date);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}` : 'unknown';
    let group = months.get(key);
    if (!group) {
      group = {
        key,
        label: date
          ? date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : 'Undated',
        entries: [],
      };
      months.set(key, group);
    }
    group.entries.push({ record, date });
  }

  const time = (entry: HistoryEntry) => entry.date?.getTime() ?? 0;
  for (const group of months.values()) {
    group.entries.sort((a, b) =>
      sortOrder === 'desc' ? time(b) - time(a) : time(a) - time(b),
    );
  }

  return [...months.values()].sort((a, b) => {
    if (a.key === 'unknown') return 1;
    if (b.key === 'unknown') return -1;
    const [ay, am] = a.key.split('-').map(Number);
    const [by, bm] = b.key.split('-').map(Number);
    const delta = ay * 12 + am - (by * 12 + bm);
    return sortOrder === 'desc' ? -delta : delta;
  });
}

export function isLabCourse(course: DetailedAttendanceCourse): boolean {
  const type = (course.classType || course.courseType || '').toLowerCase();
  return type.includes('lab') || type === 'ela';
}

export interface Projection {
  percentage: number;
  invalid: boolean;
  attended: number;
  conducted: number;
}

export function projectAttendance({
  attended,
  conducted,
  attend,
  bunk,
  weight,
}: {
  attended: number;
  conducted: number;
  attend: number;
  bunk: number;
  weight: number;
}): Projection {
  const projectedConducted = conducted + (attend + bunk) * weight;
  const projectedAttended = attended + attend * weight;
  const raw =
    projectedConducted === 0
      ? 0
      : Math.round((projectedAttended / projectedConducted) * 100);
  return {
    percentage: Math.min(raw, 100),
    invalid: raw > 100,
    attended: projectedAttended,
    conducted: projectedConducted,
  };
}
