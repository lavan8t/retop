/**
 * Semester continuity shared by the Home lazy calendar and the dashboard
 * selection defaults. Mirrors retop-app's AcademicCalendarHelper / VtopRepository:
 * a newly registered term stays "upcoming" until its first instructional day,
 * and a day only holds classes when the academic calendar says it is instructional.
 */

export interface ContinuityEvent {
  info?: string;
  subInfo?: string;
  dateObj?: Date | string;
  dateStr?: string;
  isHoliday?: boolean;
  isInstructional?: boolean;
  isExam?: boolean;
}

export interface ContinuitySemester {
  id: string;
  /** Equivalent of the app's isCurrent flag (VTOP's selected/current semester). */
  isLatest?: boolean;
  selected?: boolean;
}

const NON_INSTRUCTIONAL = [
  'non-instructional',
  'non instructional',
  'non - instructional',
  'non-instruction',
  'non instruction',
  'no instruction',
  'no instructional',
  'no class',
  'classes suspended',
  'class suspended',
  'suspension of class',
  'suspension of instruction',
  'instruction suspended',
  'classes cancelled',
  'class cancelled',
  'classes postponed',
  'class postponed',
  'non-working',
  'non working',
  'not a working day',
  'non-teaching',
  'non teaching',
  'no teaching',
  'study holiday',
  'preparatory holiday',
  'preparatory leave',
  'semester break',
  'term break',
  'mid-term break',
  'mid term break',
  'mid-semester break',
  'mid semester break',
  'vacation',
  'recess',
];

const DAY_ORDER =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s*(?:day\s*)?order\b/i;

/** Fixed-date holidays the app knows even when no calendar entry was fetched. */
const KNOWN_HOLIDAYS = new Set([
  '10-02',
  '12-25',
  '01-01',
  '01-14',
  '01-15',
  '01-16',
  '01-26',
  '04-14',
  '05-01',
  '08-15',
]);

const knownHolidayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Calendar events carry either a Date or a VTOP date string; both mean a local date. */
function eventDate(event: ContinuityEvent): Date | null {
  const raw = event.dateObj ?? event.dateStr;
  if (!raw) return null;
  // VTOP writes DD-MM-YYYY; Date would read that as MM-DD-YYYY.
  if (typeof raw === 'string' && /^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  let d: Date;
  if (raw instanceof Date) {
    d = new Date(raw.getTime());
  } else if (
    typeof raw === 'string' &&
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.test(raw)
  ) {
    const [, y, mo, day, h, min, sec] = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
    )!;
    d = new Date(
      Number(y),
      Number(mo) - 1,
      Number(day),
      Number(h),
      Number(min),
      Number(sec),
    );
  } else {
    d = new Date(raw);
  }
  return isNaN(d.getTime()) ? null : d;
}

const sameDate = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** First event on a date with something to say, matching the app's finder. */
export function findCalendarEvent(
  events: ContinuityEvent[],
  date: Date,
): ContinuityEvent | null {
  const matches = events.filter((e) => {
    const d = eventDate(e);
    return d !== null && sameDate(d, date);
  });
  return (
    matches.find(
      (e) => !!(e.info && e.info.trim()) || !!e.isHoliday || !!e.isExam,
    ) ||
    matches[0] ||
    null
  );
}

/** Next term's start from a commencement or "First Instructional Day" event. */
export function findNextSemesterStartDate(
  events: ContinuityEvent[],
): Date | null {
  for (const event of events) {
    const text = `${event.info || ''} ${event.subInfo || ''}`;
    const isCommencement = /commencement/i.test(text) && /semester/i.test(text);
    const isFirstDay = /first instructional day/i.test(text);
    if (!isCommencement && !isFirstDay) continue;
    const date = eventDate(event);
    if (date) return startOfDay(date);
  }
  return null;
}

/** Earliest "First Instructional Day" — the app's VITAP upcoming gate. */
export function findFirstInstructionalDay(
  events: ContinuityEvent[],
): Date | null {
  let earliest: Date | null = null;
  for (const event of events) {
    if (
      !/first instructional day/i.test(
        `${event.info || ''} ${event.subInfo || ''}`,
      )
    ) {
      continue;
    }
    const date = eventDate(event);
    if (date && (!earliest || date < earliest)) earliest = date;
  }
  return earliest ? startOfDay(earliest) : null;
}

/** Strictly future start: on the start day itself the new term is already current. */
export function isUpcomingSemester(
  events: ContinuityEvent[],
  now: Date = new Date(),
): boolean {
  const start =
    findFirstInstructionalDay(events) || findNextSemesterStartDate(events);
  return !!start && start.getTime() > startOfDay(now).getTime();
}

/** Last instructional day, used to stop showing the old term's classes past it. */
export function findLastInstructionalDay(
  events: ContinuityEvent[],
): Date | null {
  let last: Date | null = null;
  for (const event of events) {
    const text = `${event.info || ''} ${event.subInfo || ''}`;
    if (!/last instructional day|last instruction day/i.test(text)) continue;
    const date = eventDate(event);
    if (date && (!last || date > last)) last = date;
  }
  return last;
}

/** Semesters arrive newest-first; the next chronological term sits before the current one. */
export function nextChronologicalSemesterId(
  semesters: ContinuitySemester[],
  currentId: string,
): string | null {
  const index = semesters.findIndex((s) => s.id === currentId);
  return index > 0 ? semesters[index - 1].id : null;
}

/**
 * Keeps the previous term while the newest one is still upcoming. A saved
 * choice wins only when it is not an upcoming term; otherwise the newest
 * already-started term is used.
 */
export function resolveCurrentSemesterId(
  semesters: ContinuitySemester[],
  opts: {
    savedId?: string | null;
    upcomingIds?: Iterable<string>;
    /** Defaults true; pass false for campuses that keep saved → current → newest. */
    useUpcomingGate?: boolean;
  } = {},
): string | null {
  if (semesters.length === 0) return null;
  const useUpcomingGate = opts.useUpcomingGate !== false;
  const upcoming = new Set(useUpcomingGate ? opts.upcomingIds || [] : []);
  const saved = opts.savedId;
  if (saved && semesters.some((s) => s.id === saved) && !upcoming.has(saved)) {
    return saved;
  }
  if (!useUpcomingGate) {
    return (
      semesters.find((s) => s.isLatest || s.selected)?.id ?? semesters[0].id
    );
  }
  return semesters.find((s) => !upcoming.has(s.id))?.id ?? semesters[0].id;
}

export function extractDayOrder(text: string): string | null {
  const match = DAY_ORDER.exec(text);
  if (!match) return null;
  const key = match[1].toLowerCase();
  if (key.startsWith('mon')) return 'Monday';
  if (key.startsWith('tue')) return 'Tuesday';
  if (key.startsWith('wed')) return 'Wednesday';
  if (key.startsWith('thu')) return 'Thursday';
  if (key.startsWith('fri')) return 'Friday';
  if (key.startsWith('sat')) return 'Saturday';
  if (key.startsWith('sun')) return 'Sunday';
  return null;
}

/**
 * Classes only on an instructional day: an explicit non-instructional label or
 * holiday flag beats everything, a day-order override forces instructional, and
 * with a synced calendar an unlisted date is never an instructional weekday.
 */
export function isInstructionalDay(
  calEvent: ContinuityEvent | null | undefined,
  opts: {
    date?: Date;
    hasCalendarEvents?: boolean;
    dayOrderOverride?: string | null;
  } = {},
): boolean {
  const text =
    `${calEvent?.info || ''} ${calEvent?.subInfo || ''}`.toLowerCase();
  const explicitNonInstructional =
    NON_INSTRUCTIONAL.some((phrase) => text.includes(phrase)) ||
    !!(
      calEvent &&
      calEvent.isHoliday &&
      !calEvent.isInstructional &&
      !DAY_ORDER.test(text)
    );
  if (explicitNonInstructional) return false;
  if (opts.dayOrderOverride || DAY_ORDER.test(text)) return true;
  if (calEvent) {
    return (
      !!calEvent.isInstructional ||
      (!calEvent.isHoliday &&
        /instruction|working day|\bclass(es)?\b/.test(text))
    );
  }
  if (opts.hasCalendarEvents) return false;
  const date = opts.date || new Date();
  return date.getDay() !== 0 && !KNOWN_HOLIDAYS.has(knownHolidayKey(date));
}

/** A date with a next-term calendar entry uses the next term's timetable. */
export function usesNextSemesterForDate(
  date: Date,
  nextEvents: ContinuityEvent[],
  hasNextCourses: boolean,
): boolean {
  return hasNextCourses && findCalendarEvent(nextEvents, date) !== null;
}
