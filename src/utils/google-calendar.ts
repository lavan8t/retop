/**
 * Google Calendar sync, mirroring retop-app's GoogleCalendarSyncManager.
 *
 * Events go to the connected account's primary calendar with the same draft
 * identity, formatting and hash/diff rules as the app. The extension keeps its
 * own event-id map so it only ever updates events it created itself.
 */

import {
  TimetableCourse,
  CalendarEvent,
  CalendarMonthPreview,
} from '../types/vtop';
import { CAMPUS_SLOTS, CAMPUS_SLOT_TIMINGS } from './timetable-slots';
import { getCourseSlotOccurrences } from './ical-export';
import { ExamGroup } from '../parsers/exam-schedule';

export const GOOGLE_CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';
export const GOOGLE_CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';
export const CALENDAR_TIME_ZONE = 'Asia/Kolkata';
export const MAX_EVENTS_PER_SYNC = 250;

// Storage keys are namespaced: the Android app owns its own id map on-device,
// and this map must never patch or delete events that the app created.
export const GCAL_ID_MAP_KEY = 'ext_google_calendar_event_ids';
export const GCAL_HASH_KEY = 'ext_google_calendar_source_hash';
export const GCAL_ENABLED_KEY = 'ext_google_calendar_sync_enabled';
export const GCAL_ACCOUNT_KEY = 'ext_google_calendar_account';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const BY_DAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const pad = (n: number): string => String(n).padStart(2, '0');
const clean = (value: unknown): string => String(value ?? '').trim();

export interface CalendarDraft {
  vtopEventId: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
  recurrence: string[];
}

export type SyncOp =
  | { kind: 'create'; draft: CalendarDraft }
  | {
      kind: 'update';
      vtopEventId: string;
      googleEventId: string;
      draft: CalendarDraft;
    }
  | { kind: 'delete'; googleEventId: string };

export interface SyncPlan {
  changed: boolean;
  newHash: string;
  ops: SyncOp[];
}

export interface SyncResult {
  synced: Record<string, string>;
  failedOps: SyncOp[];
}

// ── Pure formatting (contract §3) ─────────────────────────────────────────

/** "Data Structures", "CSE201" → "Data Structures (CSE201)". */
export const timetableTitle = (courseName: string, courseCode: string) => {
  const name = clean(courseName) || clean(courseCode);
  const code = clean(courseCode);
  if (code && code.toLowerCase() !== name.toLowerCase())
    return `${name} (${code})`;
  return name || 'Class';
};

/** "Operating Systems", "CSE301", "FAT" → "Operating Systems (CSE301) FAT". */
export const examTitle = (
  courseTitle: string,
  courseCode: string,
  examType: string,
) => {
  const name = clean(courseTitle) || clean(courseCode);
  const code = clean(courseCode);
  const withCode =
    code && code.toLowerCase() !== name.toLowerCase()
      ? `${name} (${code})`
      : name;
  return `${withCode} ${clean(examType) || 'Exam'}`.trim();
};

/** drops "Holiday (...)" / "No instructional day - ..." wrappers. */
export const cleanHolidayTitle = (raw: string): string => {
  let s = clean(raw);
  if (!s) return s;
  if (s.includes(' | ')) {
    const parts = s
      .split(' | ')
      .map(cleanHolidayTitle)
      .filter(Boolean)
      .filter((p, i, all) => all.indexOf(p) === i);
    if (parts.length === 1) return parts[0];
    const specific = parts.filter((p) =>
      parts.every(
        (other) =>
          other === p || !other.toLowerCase().includes(p.toLowerCase()),
      ),
    );
    if (specific.length) return specific.join(' | ');
  }
  let match =
    /^(.+?)\s*\((?:holiday(?: for students)?|no instructional day)[^)]*\)$/i.exec(
      s,
    );
  if (match) return clean(match[1]) || s;
  match = /^(?:holiday|no instructional day)\s*\((.+)\)$/i.exec(s);
  if (match) return clean(match[1]) || s;
  match = /^(?:holiday|no instructional day)\s*[-–:]\s*(.+)$/i.exec(s);
  if (match) return clean(match[1]) || s;
  match = /^(?:holiday|no instructional day)\s+(.+)$/i.exec(s);
  if (match) return clean(match[1]).replace(/^\(|\)$/g, '') || s;
  return s;
};

export const parseTimeToMinutes = (value: string): number | null => {
  const raw = clean(value).toUpperCase();
  if (!raw) return null;
  const pm = raw.includes('PM');
  const am = raw.includes('AM');
  const parts = raw.replace(/AM|PM/g, '').trim().split(':');
  if (parts.length < 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  let h = hour;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return h * 60 + minute;
};

/** Port of Android's parseExamTimeRange (FN/AN session fallback included). */
export const parseExamTimeRange = (
  examTime: string,
  session: string,
): [number, number] | null => {
  const value = clean(examTime);
  const sess = clean(session).toUpperCase();
  if (value) {
    for (const sep of [' - ', ' to ', ' TO ', '-']) {
      if (!value.includes(sep)) continue;
      const parts = value.split(sep);
      const start = parseTimeToMinutes(parts[0]);
      const end = parseTimeToMinutes(parts[1]);
      if (start === null || end === null) continue;
      let from = start;
      let to = end;
      if (sess.includes('AN') && from < 12 * 60) from += 12 * 60;
      if (to <= from && to < 12 * 60) to += 12 * 60;
      return [from, to];
    }
    const single = parseTimeToMinutes(value);
    if (single !== null) {
      const from =
        sess.includes('AN') && single < 12 * 60 ? single + 12 * 60 : single;
      return [from, from + 180];
    }
  }
  if (sess.includes('FN')) return [10 * 60, 13 * 60];
  if (sess.includes('AN')) return [14 * 60, 17 * 60];
  return null;
};

/** Accepts the date shapes VTOP uses and returns an IST wall-clock date. */
export const parseVtopDate = (raw: string): string | null => {
  const value = clean(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const named = /^(\d{1,2})[\-/.](\d{1,2}|[A-Za-z]{3,})[\-/.](\d{4})$/.exec(
    value,
  );
  if (named) {
    const day = Number(named[1]);
    const monthToken = named[2];
    const month =
      Number(monthToken) || MONTHS[monthToken.slice(0, 3).toLowerCase()];
    return toDateString(Number(named[3]), month, day);
  }
  const iso = /^(\d{4})[\-/.](\d{1,2})[\-/.](\d{1,2})$/.exec(value);
  if (iso) return toDateString(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
};

const toDateString = (
  year: number,
  month: number,
  day: number,
): string | null => {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31)
    return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  )
    return null;
  return `${year}-${pad(month)}-${pad(day)}`;
};

const istParts = (now: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CALENDAR_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(
      get('weekday'),
    ),
  };
};

const dayIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** First matching weekday in IST, with the app's duration fallback of 60 min. */
export const nextOccurrence = (
  dayName: string,
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): { start: string; end: string } | null => {
  const weekday = DAYS.indexOf(clean(dayName));
  const from = parseTimeToMinutes(startTime);
  const to = parseTimeToMinutes(endTime);
  if (weekday < 0 || from === null || to === null) return null;

  const { year, month, day, weekday: today } = istParts(now);
  if (today < 0) return null;
  const first = new Date(Date.UTC(year, month - 1, day));
  first.setUTCDate(first.getUTCDate() + ((weekday - today + 7) % 7));
  const dateStr = dayIso(first);
  const duration = to > from ? to - from : 60;
  const endTotal = from + duration;
  const endTimeStr = `${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`;
  return {
    start: `${dateStr}T${pad(Math.floor(from / 60))}:${pad(from % 60)}:00`,
    end: `${dateStr}T${endTimeStr}:00`,
  };
};

export interface BuildDraftsOptions {
  courses?: TimetableCourse[];
  calGridData?: {
    month: CalendarMonthPreview;
    days: CalendarEvent[];
    startOffset: number;
  }[];
  examGroups?: ExamGroup[];
  now?: Date;
}

/** The canonical event set: classes, exams and academic calendar days only. */
export const buildCalendarDrafts = ({
  courses = [],
  calGridData = [],
  examGroups = [],
  now = new Date(),
}: BuildDraftsOptions): CalendarDraft[] => {
  const drafts: CalendarDraft[] = [];

  for (const course of courses) {
    const code = clean(course.code);
    for (const occ of getCourseSlotOccurrences(course)) {
      const slotLabel =
        CAMPUS_SLOTS[occ.dayName]?.[occ.isLab ? 'Lab' : 'Theory']?.[occ.colIdx];
      const timings =
        CAMPUS_SLOT_TIMINGS[occ.isLab ? 'Lab' : 'Theory']?.[occ.colIdx];
      if (!slotLabel || slotLabel === '-' || !timings) continue;
      const when = nextOccurrence(occ.dayName, timings.start, timings.end, now);
      if (!when) continue;
      // Android's Slot/Type/Faculty order is kept verbatim; Code and LTPJC are
      // appended per the extension's parity decision. Neither is part of the id.
      const ltpjc = clean(course.ltpjc);
      const description = [
        clean(course.slot) ? `Slot: ${clean(course.slot)}` : '',
        clean(course.type) ? `Type: ${clean(course.type)}` : '',
        clean(course.faculty) ? `Faculty: ${clean(course.faculty)}` : '',
        code ? `Code: ${code}` : '',
        ltpjc ? `LTPJC: ${ltpjc}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      drafts.push({
        vtopEventId: `tt|${clean(course.classId)}|${occ.dayName}|${slotLabel}|${code}`,
        title: timetableTitle(course.title, code),
        ...when,
        description,
        location: clean(course.venue) === 'N/A' ? '' : clean(course.venue),
        recurrence: [`FREQ=WEEKLY;BYDAY=${BY_DAY[DAYS.indexOf(occ.dayName)]}`],
      });
    }
  }

  for (const group of examGroups) {
    for (const entry of group.entries || []) {
      const date = parseVtopDate(entry.examDate);
      if (!date) continue;
      const range = parseExamTimeRange(entry.examTime, entry.examSession) || [
        9 * 60,
        12 * 60,
      ];
      const startMin = range[0];
      const endMin = range[1] > startMin ? range[1] : range[1] + 24 * 60;
      const seat = clean(entry.seatLocation) || clean(entry.seatNo);
      const description = [
        clean(entry.slot) ? `Slot: ${clean(entry.slot)}` : '',
        clean(entry.examSession) ? `Session: ${clean(entry.examSession)}` : '',
        seat ? `Seat: ${seat}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const at = (minutes: number) => {
        const dayOffset = Math.floor(minutes / (24 * 60));
        const total = minutes % (24 * 60);
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + dayOffset);
        return `${dayIso(d)}T${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
      };
      drafts.push({
        vtopEventId: `ex|${clean(entry.classId)}|${date}|${clean(group.examType)}|${clean(entry.courseCode)}`,
        title: examTitle(entry.courseTitle, entry.courseCode, group.examType),
        start: at(startMin),
        end: at(endMin),
        description,
        location: clean(entry.venue),
        recurrence: [],
      });
    }
  }

  for (const month of calGridData) {
    for (const day of month.days || []) {
      const dateObj = day.dateObj ? new Date(day.dateObj) : null;
      if (!dateObj || isNaN(dateObj.getTime())) continue;
      const date = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
      drafts.push({
        vtopEventId: `ac|${date}|${clean(day.info)}`,
        title: cleanHolidayTitle(clean(day.info)) || 'Academic event',
        start: `${date}T00:00:00`,
        end: `${date}T23:59:59`,
        description: clean(day.subInfo),
        location: '',
        recurrence: [],
      });
    }
  }

  return drafts;
};

// ── Diff / dedup (contract §5) ────────────────────────────────────────────

export const computeSourceHash = async (
  drafts: CalendarDraft[],
): Promise<string> => {
  const canonical = [...drafts]
    .sort((a, b) =>
      a.vtopEventId < b.vtopEventId
        ? -1
        : a.vtopEventId > b.vtopEventId
          ? 1
          : 0,
    )
    .map((d) =>
      [
        d.vtopEventId,
        d.title,
        d.start,
        d.end,
        d.description,
        d.location,
        d.recurrence.join(','),
      ].join('\u001f'),
    )
    .join('\n');
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const planSync = async (
  drafts: CalendarDraft[],
  idMap: Record<string, string>,
  storedHash: string,
): Promise<SyncPlan> => {
  const newHash = await computeSourceHash(drafts);
  if (newHash === storedHash) return { changed: false, newHash, ops: [] };

  const wanted = new Set(drafts.map((d) => d.vtopEventId));
  const ops: SyncOp[] = [];
  for (const [vtopId, googleId] of Object.entries(idMap)) {
    if (!wanted.has(vtopId))
      ops.push({ kind: 'delete', googleEventId: googleId });
  }
  for (const draft of [...drafts].sort((a, b) =>
    a.vtopEventId < b.vtopEventId ? -1 : a.vtopEventId > b.vtopEventId ? 1 : 0,
  )) {
    const googleId = idMap[draft.vtopEventId];
    if (googleId) {
      ops.push({
        kind: 'update',
        vtopEventId: draft.vtopEventId,
        googleEventId: googleId,
        draft,
      });
    } else {
      ops.push({ kind: 'create', draft });
    }
  }

  const capped = ops.slice(0, MAX_EVENTS_PER_SYNC);
  return {
    changed: true,
    // Keep the old hash when truncated so the rest syncs on the next run.
    newHash: capped.length === ops.length ? newHash : storedHash,
    ops: capped,
  };
};

export const persistSyncResult = (
  plan: SyncPlan,
  result: SyncResult,
  idMap: Record<string, string>,
  currentIds: Set<string>,
  storedHash: string,
): { idMap: Record<string, string>; sourceHash: string; ok: boolean } => {
  const failedDeletes = new Set(
    result.failedOps
      .filter((op) => op.kind === 'delete')
      .map((op) => (op as { googleEventId: string }).googleEventId),
  );
  const next: Record<string, string> = {};
  for (const [vtopId, googleId] of Object.entries(idMap)) {
    if (currentIds.has(vtopId) || failedDeletes.has(googleId))
      next[vtopId] = googleId;
  }
  Object.assign(next, result.synced);
  const ok = result.failedOps.length === 0;
  return { idMap: next, sourceHash: ok ? plan.newHash : storedHash, ok };
};

// ── REST (contract §4) ────────────────────────────────────────────────────

const requestBody = (draft: CalendarDraft) => {
  const body: Record<string, unknown> = {
    summary: draft.title,
    description: draft.description,
    start: { dateTime: draft.start, timeZone: CALENDAR_TIME_ZONE },
    end: { dateTime: draft.end, timeZone: CALENDAR_TIME_ZONE },
  };
  if (draft.location) body.location = draft.location;
  if (draft.recurrence.length) body.recurrence = draft.recurrence;
  return body;
};

const send = async (
  token: string,
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<string | null> => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return null;
      if (method === 'DELETE') return '';
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return data.id || 'ok';
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
      else return null;
    }
  }
  return null;
};

export const executePlan = async (
  plan: SyncPlan,
  token: string,
): Promise<SyncResult> => {
  const synced: Record<string, string> = {};
  const failedOps: SyncOp[] = [];
  for (const op of plan.ops) {
    if (op.kind === 'delete') {
      const ok = await send(
        token,
        `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(op.googleEventId)}`,
        'DELETE',
      );
      if (ok === null) failedOps.push(op);
      continue;
    }
    const isCreate = op.kind === 'create';
    const vtopId = isCreate ? op.draft.vtopEventId : op.vtopEventId;
    const url = isCreate
      ? GOOGLE_CALENDAR_EVENTS_URL
      : `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(op.googleEventId)}`;
    const id = await send(
      token,
      url,
      isCreate ? 'POST' : 'PATCH',
      requestBody(op.draft),
    );
    if (id === null) failedOps.push(op);
    else synced[vtopId] = id;
  }
  return { synced, failedOps };
};

export interface SyncDraftsResult {
  changed: boolean;
  total: number;
  created: number;
  updated: number;
  removed: number;
  failed: number;
  idMap: Record<string, string>;
  sourceHash: string;
}

/** Plan, push, and persist in one step; called by the background worker. */
export const syncDraftsToGoogleCalendar = async (options: {
  token: string;
  drafts: CalendarDraft[];
  idMap: Record<string, string>;
  storedHash: string;
}): Promise<SyncDraftsResult> => {
  const { drafts, idMap, storedHash } = options;
  const plan = await planSync(drafts, idMap, storedHash);
  if (!plan.changed) {
    return {
      changed: false,
      total: drafts.length,
      created: 0,
      updated: 0,
      removed: 0,
      failed: 0,
      idMap,
      sourceHash: storedHash,
    };
  }
  const result = await executePlan(plan, options.token);
  const persisted = persistSyncResult(
    plan,
    result,
    idMap,
    new Set(drafts.map((d) => d.vtopEventId)),
    storedHash,
  );
  const succeeded = (kind: SyncOp['kind']) =>
    plan.ops.filter((op) => op.kind === kind).length -
    result.failedOps.filter((op) => op.kind === kind).length;
  return {
    changed: true,
    total: drafts.length,
    created: succeeded('create'),
    updated: succeeded('update'),
    removed: succeeded('delete'),
    failed: result.failedOps.length,
    ...persisted,
  };
};
