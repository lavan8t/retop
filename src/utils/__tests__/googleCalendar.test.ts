import { describe, expect, it } from 'bun:test';
import {
  buildCalendarDrafts,
  cleanHolidayTitle,
  computeSourceHash,
  examTitle,
  executePlan,
  GOOGLE_CALENDAR_EVENTS_URL,
  MAX_EVENTS_PER_SYNC,
  parseExamTimeRange,
  persistSyncResult,
  planSync,
  timetableTitle,
  type CalendarDraft,
} from '../google-calendar';
import type { TimetableCourse } from '../../types/vtop';

/** Monday 09:30 IST. */
const NOW = new Date('2026-11-23T04:00:00Z');

const course: TimetableCourse = {
  code: 'CSE201',
  title: 'Data Structures',
  type: 'Embedded Theory',
  credits: '4',
  ltpjc: '3 0 0 0 3',
  category: 'Core',
  slot: 'A1',
  venue: 'AB1-101',
  faculty: 'Dr Rao',
  classId: 'CLS1',
  status: 'Registered',
};

const draft = (id: string): CalendarDraft => ({
  vtopEventId: id,
  title: `Course ${id}`,
  start: '2026-11-23T09:00:00',
  end: '2026-11-23T10:00:00',
  description: '',
  location: '',
  recurrence: [],
});

describe('Android contract: titles and descriptions', () => {
  it('puts the course code in the title, not the description', () => {
    expect(timetableTitle('Data Structures', 'CSE201')).toBe(
      'Data Structures (CSE201)',
    );
    expect(timetableTitle('', 'CSE101')).toBe('CSE101');
    expect(timetableTitle('', '')).toBe('Class');
    expect(examTitle('Operating Systems', 'CSE301', 'FAT')).toBe(
      'Operating Systems (CSE301) FAT',
    );
  });

  it('keeps Slot / Type / Faculty order and appends Code and LTPJC', () => {
    const [event] = buildCalendarDrafts({ courses: [course], now: NOW });
    expect(event.vtopEventId).toBe('tt|CLS1|Monday|A1|CSE201');
    expect(event.description).toBe(
      'Slot: A1\nType: Embedded Theory\nFaculty: Dr Rao\nCode: CSE201\nLTPJC: 3 0 0 0 3',
    );
    expect(event.location).toBe('AB1-101');
    expect(event.recurrence).toEqual(['FREQ=WEEKLY;BYDAY=MO']);
  });

  it('omits blank class description lines', () => {
    const [event] = buildCalendarDrafts({
      courses: [{ ...course, faculty: '', ltpjc: '' }],
      now: NOW,
    });
    expect(event.description).toBe(
      'Slot: A1\nType: Embedded Theory\nCode: CSE201',
    );
  });

  it('uses the next matching weekday and the app’s 60-minute duration fallback', () => {
    const [monday] = buildCalendarDrafts({ courses: [course], now: NOW });
    expect(monday.start).toBe('2026-11-23T08:00:00');
    expect(monday.end).toBe('2026-11-23T08:50:00');

    const [wednesday] = buildCalendarDrafts({
      courses: [{ ...course, slot: 'V1' }],
      now: NOW,
    });
    expect(wednesday.vtopEventId).toContain('|Wednesday|');
    expect(wednesday.start).toBe('2026-11-25T11:00:00');
    expect(wednesday.recurrence).toEqual(['FREQ=WEEKLY;BYDAY=WE']);
  });
});

describe('Android contract: exam and academic-calendar kinds', () => {
  it('formats exams with slot, session and seat', () => {
    const [event] = buildCalendarDrafts({
      examGroups: [
        {
          examType: 'CAT1',
          entries: [
            {
              slNo: '1',
              courseCode: 'CSE301',
              courseTitle: 'Operating Systems',
              courseType: 'Theory',
              classId: 'CLS2',
              slot: 'B1',
              examDate: '24-11-2026',
              examSession: 'FN',
              reportingTime: '09:30',
              examTime: '10:00 - 13:00',
              venue: 'GH1',
              seatLocation: 'R2C4',
              seatNo: '42',
            },
          ],
        },
      ],
      now: NOW,
    });
    expect(event.vtopEventId).toBe('ex|CLS2|2026-11-24|CAT1|CSE301');
    expect(event.title).toBe('Operating Systems (CSE301) CAT1');
    expect(event.description).toBe('Slot: B1\nSession: FN\nSeat: R2C4');
    expect(event.location).toBe('GH1');
    expect(event.start).toBe('2026-11-24T10:00:00');
    expect(event.end).toBe('2026-11-24T13:00:00');
    expect(event.recurrence).toEqual([]);
  });

  it('falls back to session hours when exam time is blank', () => {
    expect(parseExamTimeRange('', 'AN')).toEqual([14 * 60, 17 * 60]);
    expect(parseExamTimeRange('', 'FN')).toEqual([10 * 60, 13 * 60]);
    expect(parseExamTimeRange('', '')).toBeNull();
  });

  it('writes academic days as timed IST events ending at 23:59:59', () => {
    const [event] = buildCalendarDrafts({
      calGridData: [
        {
          month: {} as any,
          startOffset: 0,
          days: [
            {
              dayNumber: '25',
              info: 'Holiday (Deepavali)',
              subInfo: 'No classes',
              isHoliday: true,
              isInstructional: false,
              isExam: false,
              dateObj: new Date(2026, 10, 25, 12, 0, 0),
            },
          ],
        },
      ],
      now: NOW,
    });
    expect(event.vtopEventId).toBe('ac|2026-11-25|Holiday (Deepavali)');
    expect(event.title).toBe('Deepavali');
    expect(event.description).toBe('No classes');
    expect(event.start).toBe('2026-11-25T00:00:00');
    expect(event.end).toBe('2026-11-25T23:59:59');
  });

  it('cleans holiday wrappers like the app', () => {
    expect(cleanHolidayTitle('Holiday - Christmas')).toBe('Christmas');
    expect(cleanHolidayTitle('No instructional day (Rain)')).toBe('Rain');
    expect(cleanHolidayTitle('')).toBe('');
  });
});

describe('Android contract: hash and diff dedup', () => {
  it('hashes the canonical draft set and skips an unchanged sync', async () => {
    const drafts = [draft('b'), draft('a')];
    const hash = await computeSourceHash(drafts);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await computeSourceHash([...drafts].reverse())).toBe(hash);

    const plan = await planSync(drafts, {}, hash);
    expect(plan.changed).toBe(false);
    expect(plan.ops).toEqual([]);
  });

  it('updates known ids and deletes ids no longer in the source', async () => {
    const plan = await planSync(
      [draft('a')],
      { a: 'google-a', gone: 'google-gone' },
      'old-hash',
    );
    expect(plan.changed).toBe(true);
    expect(plan.ops).toEqual([
      { kind: 'delete', googleEventId: 'google-gone' },
      {
        kind: 'update',
        vtopEventId: 'a',
        googleEventId: 'google-a',
        draft: draft('a'),
      },
    ]);
  });

  it('caps a run at 250 ops and keeps the old hash for the remainder', async () => {
    const drafts = Array.from({ length: 300 }, (_, i) => draft(`id${i}`));
    const plan = await planSync(drafts, {}, '');
    expect(plan.ops).toHaveLength(MAX_EVENTS_PER_SYNC);
    expect(plan.newHash).toBe('');
  });

  it('keeps failed deletes in the map and saves the hash only on full success', async () => {
    const plan = await planSync([draft('a')], { a: 'ga', gone: 'gg' }, 'old');
    const persisted = persistSyncResult(
      plan,
      {
        synced: { a: 'ga' },
        failedOps: [{ kind: 'delete', googleEventId: 'gg' }],
      },
      { a: 'ga', gone: 'gg' },
      new Set(['a']),
      'old',
    );
    expect(persisted.ok).toBe(false);
    expect(persisted.sourceHash).toBe('old');
    expect(persisted.idMap).toEqual({ gone: 'gg', a: 'ga' });
  });
});

describe('Android contract: REST payload', () => {
  it('posts the app payload with no reminders or custom markers', async () => {
    const originalFetch = globalThis.fetch;
    const calls: { url: string; init: any }[] = [];
    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: 'google-a' }), { status: 200 });
    }) as typeof fetch;
    try {
      const plan = await planSync([draft('a')], {}, '');
      const result = await executePlan(plan, 'tok');
      expect(result.synced).toEqual({ a: 'google-a' });
      expect(calls[0].url).toBe(GOOGLE_CALENDAR_EVENTS_URL);
      expect(calls[0].init.method).toBe('POST');
      expect(JSON.parse(calls[0].init.body)).toEqual({
        summary: 'Course a',
        description: '',
        start: { dateTime: draft('a').start, timeZone: 'Asia/Kolkata' },
        end: { dateTime: draft('a').end, timeZone: 'Asia/Kolkata' },
      });
      expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
