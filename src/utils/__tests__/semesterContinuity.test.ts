import { describe, expect, it } from 'bun:test';
import {
  findCalendarEvent,
  findLastInstructionalDay,
  findNextSemesterStartDate,
  isInstructionalDay,
  isUpcomingSemester,
  nextChronologicalSemesterId,
  resolveCurrentSemesterId,
  usesNextSemesterForDate,
  type ContinuityEvent,
} from '../semesterContinuity';

const sems = [
  { id: 'WIN202627' }, // newest / upcoming
  { id: 'FALL202627' }, // previous / currently running
  { id: 'SUM202627' },
];

const event = (
  date: string,
  info: string,
  extra: Partial<ContinuityEvent> = {},
): ContinuityEvent => ({ dateObj: new Date(date), info, ...extra });

describe('current-semester fallback', () => {
  it('keeps the previous semester when the newest one has a future first instructional day', () => {
    const upcomingIds = isUpcomingSemester(
      [event('2026-12-02T00:00:00', 'First Instructional Day')],
      new Date('2026-11-24T09:00:00'),
    )
      ? ['WIN202627']
      : [];
    expect(resolveCurrentSemesterId(sems, { upcomingIds })).toBe('FALL202627');
  });

  it('uses the newest semester once its first instructional day has passed', () => {
    const upcomingIds = isUpcomingSemester(
      [event('2026-12-02T00:00:00', 'First Instructional Day')],
      new Date('2026-12-05T09:00:00'),
    )
      ? ['WIN202627']
      : [];
    expect(resolveCurrentSemesterId(sems, { upcomingIds })).toBe('WIN202627');
  });

  it('honours a saved non-upcoming choice but never a saved upcoming one', () => {
    expect(
      resolveCurrentSemesterId(sems, {
        savedId: 'SUM202627',
        upcomingIds: ['WIN202627'],
      }),
    ).toBe('SUM202627');
    expect(
      resolveCurrentSemesterId(sems, {
        savedId: 'WIN202627',
        upcomingIds: ['WIN202627'],
      }),
    ).toBe('FALL202627');
  });

  it('falls back to the first semester when nothing has started', () => {
    expect(
      resolveCurrentSemesterId(sems, {
        upcomingIds: ['WIN202627', 'FALL202627', 'SUM202627'],
      }),
    ).toBe('WIN202627');
    expect(resolveCurrentSemesterId([])).toBeNull();
  });
});

describe('boundary day', () => {
  it('stays on the previous semester on the last day and the day before the new term', () => {
    const events = [
      event('2026-12-02T00:00:00', 'Commencement of Winter Semester'),
    ];
    expect(findNextSemesterStartDate(events)?.toDateString()).toBe(
      new Date('2026-12-02').toDateString(),
    );
    // 1 December: day before the new term -> still upcoming.
    expect(isUpcomingSemester(events, new Date('2026-12-01T23:59:00'))).toBe(
      true,
    );
    // 2 December: the start day itself -> the new term is current.
    expect(isUpcomingSemester(events, new Date('2026-12-02T00:00:00'))).toBe(
      false,
    );
  });

  it('ignores unparseable or unrelated start events', () => {
    expect(
      findNextSemesterStartDate([event('', 'First Instructional Day')]),
    ).toBeNull();
    expect(
      findNextSemesterStartDate([event('2026-12-02', 'Holiday')]),
    ).toBeNull();
  });

  it('keeps current classes on the last instructional day but not after it', () => {
    const last = findLastInstructionalDay([
      event('2026-11-30T00:00:00', 'Last instructional day'),
      event('2026-12-02T00:00:00', 'Instructional Day'),
    ]);
    expect(last?.toDateString()).toBe(new Date('2026-11-30').toDateString());
  });

  it('finds the next chronological semester from a newest-first list', () => {
    expect(nextChronologicalSemesterId(sems, 'FALL202627')).toBe('WIN202627');
    expect(nextChronologicalSemesterId(sems, 'WIN202627')).toBeNull();
  });
});

describe('next-semester window', () => {
  const nextEvents = [event('2026-12-02T00:00:00', 'Instructional Day')];

  it('finds the next-term event for a boundary date only', () => {
    expect(
      findCalendarEvent(nextEvents, new Date('2026-12-02T10:00:00'))?.info,
    ).toBe('Instructional Day');
    expect(
      findCalendarEvent(nextEvents, new Date('2026-12-01T10:00:00')),
    ).toBeNull();
  });

  it('uses next-term classes only on dates listed in the next-term calendar', () => {
    expect(
      usesNextSemesterForDate(
        new Date('2026-12-02T10:00:00'),
        nextEvents,
        true,
      ),
    ).toBe(true);
    expect(
      usesNextSemesterForDate(
        new Date('2026-12-01T10:00:00'),
        nextEvents,
        true,
      ),
    ).toBe(false);
    expect(
      usesNextSemesterForDate(
        new Date('2026-12-02T10:00:00'),
        nextEvents,
        false,
      ),
    ).toBe(false);
  });
});

describe('instructional-day gating', () => {
  it('shows classes on an instructional day and a day-order override', () => {
    expect(
      isInstructionalDay(
        event('2026-11-30', 'Instructional Day', { isInstructional: true }),
      ),
    ).toBe(true);
    expect(isInstructionalDay(event('2026-12-05', 'Saturday day order'))).toBe(
      true,
    );
    expect(
      isInstructionalDay(null, { date: new Date('2026-11-30T10:00:00') }),
    ).toBe(true);
  });

  it('suppresses classes on non-instructional and holiday days even when flagged', () => {
    for (const info of [
      'Non-Instructional Day',
      'No Instructional Day (Meelad-un-Nabi)',
      'Classes suspended',
      'Mid-semester break',
    ]) {
      expect(
        isInstructionalDay(
          event('2026-11-30', info, { isInstructional: true }),
        ),
        info,
      ).toBe(false);
    }
    expect(
      isInstructionalDay(
        event('2026-11-30', 'Holiday (Deepavali)', { isHoliday: true }),
      ),
    ).toBe(false);
    expect(
      isInstructionalDay(event('2026-11-30', 'Holiday', { isHoliday: true })),
    ).toBe(false);
  });

  it('never treats an unlisted date as instructional when a calendar is synced', () => {
    expect(
      isInstructionalDay(null, {
        date: new Date('2026-11-30T10:00:00'),
        hasCalendarEvents: true,
      }),
    ).toBe(false);
    expect(
      isInstructionalDay(null, { date: new Date('2026-12-06T10:00:00') }),
    ).toBe(false);
  });
});
