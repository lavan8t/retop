/**
 * Google Calendar sync.
 *
 * The event set is exactly the one the iCal export produces
 * (src/utils/ical-export.ts): we parse that .ics and map every VEVENT onto a
 * Google Calendar Events resource. Google accepts the same RFC5545 recurrence
 * lines in `recurrence[]`, so holiday skips (EXDATE) and Saturday day-order
 * overrides (RDATE) survive the conversion unchanged.
 */

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

const CAL_API = 'https://www.googleapis.com/calendar/v3';
const CAL_TZ = 'Asia/Kolkata';
/** Marks the events this extension owns, so a re-sync replaces exactly them. */
const OWNED_KEY = 'retopSync';

export const googleCalendarName = (regNo: string): string =>
  `retop - ${String(regNo || '').trim() || 'REG-NO'}`;

export interface GoogleEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides: { method: string; minutes: number }[];
  };
  status?: string;
  transparency?: string;
  extendedProperties?: { private: Record<string, string> };
}

export interface GoogleCalendarSyncResult {
  calendarId: string;
  calendarName: string;
  total: number;
  created: number;
  updated: number;
  removed: number;
}

// ── iCal → Google event mapping ───────────────────────────────────────────

/** Undo the escaping applied by the iCal writer. */
const unescapeIcal = (text: string): string => {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      const next = text[++i];
      out += next === 'n' || next === 'N' ? '\n' : next;
    } else {
      out += ch;
    }
  }
  return out;
};

/** "20260105T090000" → { dateTime: "2026-01-05T09:00:00", timeZone: CAL_TZ } */
const parseIcalDate = (value: string): GoogleEventDateTime | null => {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z?)$/.exec(
    value.trim(),
  );
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (!hh) return { date: `${y}-${mo}-${d}` };
  if (z === 'Z') return { dateTime: `${y}-${mo}-${d}T${hh}:${mm}:${ss}Z` };
  return { dateTime: `${y}-${mo}-${d}T${hh}:${mm}:${ss}`, timeZone: CAL_TZ };
};

/** Split "EXDATE;TZID=Asia/Kolkata:20260202T090000" into name/params/value. */
const splitIcalLine = (
  line: string,
): { name: string; params: string; value: string } => {
  const colon = line.indexOf(':');
  if (colon < 0) return { name: line.toUpperCase(), params: '', value: '' };
  const head = line.slice(0, colon);
  const parts = head.split(';');
  return {
    name: parts[0].toUpperCase(),
    params: parts.slice(1).join(';'),
    value: line.slice(colon + 1),
  };
};

/**
 * Deterministic, base32hex-safe event id so a re-sync updates the same event
 * instead of duplicating it. (Google only allows a-v and 0-9 in event ids.)
 */
const hashEventId = (uid: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    const c = uid.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return `retop${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
};

/** Parse the .ics produced by the iCal export into Google Calendar events. */
export const parseICalToGoogleEvents = (ics: string): GoogleCalendarEvent[] => {
  const events: GoogleCalendarEvent[] = [];

  for (const block of ics.split(/BEGIN:VEVENT\r?\n/).slice(1)) {
    const body = block.split(/END:VEVENT/)[0];
    let uid = '';
    let summary = '';
    let description = '';
    let location = '';
    let start: GoogleEventDateTime | undefined;
    let end: GoogleEventDateTime | undefined;
    let alarmMinutes: number | null = null;
    let inAlarm = false;
    const recurrence: string[] = [];

    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line === 'BEGIN:VALARM') {
        inAlarm = true;
        continue;
      }
      if (line === 'END:VALARM') {
        inAlarm = false;
        continue;
      }

      const { name, params, value } = splitIcalLine(line);
      if (inAlarm) {
        if (name === 'TRIGGER') {
          const m = /^-PT(?:(\d+)H)?(?:(\d+)M)?/.exec(value);
          if (m) alarmMinutes = Number(m[1] || 0) * 60 + Number(m[2] || 0);
        }
        continue;
      }

      switch (name) {
        case 'UID':
          uid = value;
          break;
        case 'SUMMARY':
          summary = unescapeIcal(value);
          break;
        case 'DESCRIPTION':
          description = unescapeIcal(value);
          break;
        case 'LOCATION':
          location = unescapeIcal(value);
          break;
        case 'DTSTART':
          start = parseIcalDate(value) || undefined;
          break;
        case 'DTEND':
          end = parseIcalDate(value) || undefined;
          break;
        case 'RRULE':
        case 'EXDATE':
        case 'RDATE':
          recurrence.push(
            params ? `${name};${params}:${value}` : `${name}:${value}`,
          );
          break;
      }
    }

    if (!start) continue;

    const event: GoogleCalendarEvent = {
      id: hashEventId(
        uid || `${summary}-${start.dateTime || start.date || ''}`,
      ),
      summary,
      description: description || undefined,
      location: location || undefined,
      start,
      end: end || start,
      status: 'confirmed',
      transparency: 'opaque',
      extendedProperties: { private: { [OWNED_KEY]: '1', retopUid: uid } },
    };
    if (recurrence.length) event.recurrence = recurrence;
    if (alarmMinutes !== null) {
      event.reminders = {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: alarmMinutes }],
      };
    }
    events.push(event);
  }

  return events;
};

// ── Calendar API ──────────────────────────────────────────────────────────

class GoogleApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
  }
}

const gcalRequest = async <T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(`${CAL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GoogleApiError(
      res.status,
      `Google Calendar ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};

const calendarPath = (calendarId: string): string =>
  `/calendars/${encodeURIComponent(calendarId)}`;

/** Find the calendar named `summary`, creating it when it does not exist yet. */
export const findOrCreateCalendar = async (
  token: string,
  summary: string,
): Promise<string> => {
  const list = await gcalRequest<{
    items?: { id: string; summary?: string }[];
  }>(token, '/users/me/calendarList?maxResults=250');
  const existing = (list.items || []).find(
    (entry) => (entry.summary || '').trim() === summary,
  );
  if (existing) return existing.id;

  const created = await gcalRequest<{ id: string }>(
    token,
    '/users/me/calendarList',
    {
      method: 'POST',
      body: JSON.stringify({
        summary,
        description: 'Schedule synced from retop',
        timeZone: CAL_TZ,
      }),
    },
  );
  return created.id;
};

/** Ids of the events this extension previously wrote to the calendar. */
const listOwnedEventIds = async (
  token: string,
  calendarId: string,
): Promise<string[]> => {
  const ids: string[] = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({
      maxResults: '250',
      privateExtendedProperty: `${OWNED_KEY}=1`,
      showDeleted: 'false',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const res = await gcalRequest<{
      items?: { id?: string }[];
      nextPageToken?: string;
    }>(token, `${calendarPath(calendarId)}/events?${query.toString()}`);
    for (const item of res.items || []) if (item.id) ids.push(item.id);
    pageToken = res.nextPageToken || '';
  } while (pageToken);
  return ids;
};

const putEvent = async (
  token: string,
  calendarId: string,
  event: GoogleCalendarEvent,
  exists: boolean,
): Promise<'created' | 'updated'> => {
  // The event id is immutable, so it is not part of an update body.
  const { id: _id, ...body } = event;

  if (exists) {
    await gcalRequest(
      token,
      `${calendarPath(calendarId)}/events/${encodeURIComponent(event.id)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
    return 'updated';
  }

  try {
    await gcalRequest(token, `${calendarPath(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return 'created';
  } catch (err) {
    // Another run already created this id — fall back to updating it.
    if (err instanceof GoogleApiError && err.status === 409) {
      await gcalRequest(
        token,
        `${calendarPath(calendarId)}/events/${encodeURIComponent(event.id)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      return 'updated';
    }
    throw err;
  }
};

/**
 * Push the .ics events into the "retop - <regno>" calendar: create or update
 * every event, then drop the ones that are no longer part of the schedule.
 */
export const syncICalToGoogleCalendar = async (options: {
  token: string;
  ics: string;
  regNo: string;
}): Promise<GoogleCalendarSyncResult> => {
  const summary = googleCalendarName(options.regNo);
  const calendarId = await findOrCreateCalendar(options.token, summary);
  const events = parseICalToGoogleEvents(options.ics);
  const owned = await listOwnedEventIds(options.token, calendarId);
  const ownedSet = new Set(owned);

  let created = 0;
  let updated = 0;
  for (const event of events) {
    const result = await putEvent(
      options.token,
      calendarId,
      event,
      ownedSet.has(event.id),
    );
    if (result === 'created') created++;
    else updated++;
  }

  const wanted = new Set(events.map((event) => event.id));
  let removed = 0;
  for (const id of owned) {
    if (wanted.has(id)) continue;
    await gcalRequest(
      options.token,
      `${calendarPath(calendarId)}/events/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    removed++;
  }

  return {
    calendarId,
    calendarName: summary,
    total: events.length,
    created,
    updated,
    removed,
  };
};
