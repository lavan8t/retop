import { describe, expect, it } from "bun:test";
import {
  googleCalendarName,
  parseICalToGoogleEvents,
  syncICalToGoogleCalendar,
} from "../google-calendar";
import { generateICalFile } from "../ical-export";

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTSTAMP:20260101T000000Z",
  "UID:BCSE101-20260105T090000-Monday@retop",
  "DTSTART;TZID=Asia/Kolkata:20260105T090000",
  "DTEND;TZID=Asia/Kolkata:20260105T095000",
  "RRULE:FREQ=WEEKLY;UNTIL=20260601T235959Z",
  "EXDATE;TZID=Asia/Kolkata:20260202T090000",
  "RDATE;TZID=Asia/Kolkata:20260207T090000",
  "SUMMARY:Theory of Computation",
  "DESCRIPTION:Code: BCSE101\\nSlot: A1",
  "LOCATION:AB1-305",
  "CATEGORIES:ETH",
  "STATUS:CONFIRMED",
  "BEGIN:VALARM",
  "TRIGGER:-PT10M",
  "ACTION:DISPLAY",
  "DESCRIPTION:Reminder: Theory of Computation starting in 10 minutes",
  "END:VALARM",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTAMP:20260101T000000Z",
  "UID:exam-BCSE101-20260301T090000@retop",
  "DTSTART;TZID=Asia/Kolkata:20260301T090000",
  "DTEND;TZID=Asia/Kolkata:20260301T110000",
  "SUMMARY:[EXAM] Theory of Computation (BCSE101)",
  "CATEGORIES:EXAM",
  "STATUS:CONFIRMED",
  "BEGIN:VALARM",
  "TRIGGER:-PT30M",
  "ACTION:DISPLAY",
  "DESCRIPTION:Reminder",
  "END:VALARM",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("google calendar naming", () => {
  it("names the calendar after the registration number", () => {
    expect(googleCalendarName("22BCE1234")).toBe("retop - 22BCE1234");
  });

  it("falls back to a placeholder when the reg no is unknown", () => {
    expect(googleCalendarName("")).toBe("retop - REG-NO");
  });
});

describe("iCal to Google Calendar events", () => {
  const events = parseICalToGoogleEvents(ICS);

  it("maps every VEVENT", () => {
    expect(events).toHaveLength(2);
  });

  it("keeps the Asia/Kolkata wall clock of the iCal value", () => {
    expect(events[0].start).toEqual({
      dateTime: "2026-01-05T09:00:00",
      timeZone: "Asia/Kolkata",
    });
    expect(events[0].end).toEqual({
      dateTime: "2026-01-05T09:50:00",
      timeZone: "Asia/Kolkata",
    });
  });

  it("carries the recurrence rules over unchanged", () => {
    expect(events[0].recurrence).toEqual([
      "RRULE:FREQ=WEEKLY;UNTIL=20260601T235959Z",
      "EXDATE;TZID=Asia/Kolkata:20260202T090000",
      "RDATE;TZID=Asia/Kolkata:20260207T090000",
    ]);
  });

  it("turns the VALARM into a popup reminder", () => {
    expect(events[0].reminders).toEqual({
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }],
    });
    expect(events[1].reminders?.overrides[0].minutes).toBe(30);
  });

  it("unescapes the text fields", () => {
    expect(events[0].summary).toBe("Theory of Computation");
    expect(events[0].description).toBe("Code: BCSE101\nSlot: A1");
    expect(events[0].location).toBe("AB1-305");
  });

  it("gives every event a stable, base32hex-safe id", () => {
    expect(events[0].id).toMatch(/^[a-v0-9]{5,1024}$/);
    expect(parseICalToGoogleEvents(ICS)[0].id).toBe(events[0].id);
    expect(events[0].id).not.toBe(events[1].id);
  });

  it("marks the events as owned so a re-sync can replace them", () => {
    expect(events[0].extendedProperties?.private.retopSync).toBe("1");
  });
});

describe("university events in the iCal export", () => {
  it("writes them as all-day events", () => {
    const ics = generateICalFile({
      events: [
        { title: "Hackathon", date: "2026-07-03", category: "Event", organizer: " VIT" },
      ],
    });

    expect(ics).toContain("DTSTART;VALUE=DATE:20260703");
    expect(ics).toContain("DTEND;VALUE=DATE:20260704");
    expect(ics).toContain("SUMMARY:Hackathon");

    const [event] = parseICalToGoogleEvents(ics);
    expect(event.start).toEqual({ date: "2026-07-03" });
    expect(event.end).toEqual({ date: "2026-07-04" });
  });
});

/** Records the Calendar API calls a sync makes, with canned responses. */
const mockCalendarApi = (options: {
  existingCalendar?: boolean;
  ownedEventIds?: string[];
}) => {
  const calls: { method: string; url: string; body?: any }[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input);
    const method = init.method || "GET";
    calls.push({
      method,
      url,
      body: init.body ? JSON.parse(init.body) : undefined,
    });

    const json = (data: any) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    if (url.includes("/users/me/calendarList?") && method === "GET") {
      return json({
        items: options.existingCalendar
          ? [{ id: "cal-1", summary: "retop - 22BCE1234" }]
          : [{ id: "other", summary: "Personal" }],
      });
    }
    if (url.endsWith("/users/me/calendarList") && method === "POST") {
      return json({ id: "cal-new" });
    }
    if (url.includes("/events?") && method === "GET") {
      return json({
        items: (options.ownedEventIds || []).map((id) => ({ id })),
      });
    }
    if (url.includes("/events/") && method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    return json({ id: "evt" });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

describe("syncing to Google Calendar", () => {
  it("creates the calendar, writes the events and reports the result", async () => {
    const api = mockCalendarApi({ existingCalendar: false });
    try {
      const result = await syncICalToGoogleCalendar({
        token: "tok",
        ics: ICS,
        regNo: "22BCE1234",
      });

      expect(result.calendarName).toBe("retop - 22BCE1234");
      expect(result.calendarId).toBe("cal-new");
      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.removed).toBe(0);

      const create = api.calls.find(
        (c) => c.method === "POST" && c.url.endsWith("/users/me/calendarList"),
      );
      expect(create?.body.summary).toBe("retop - 22BCE1234");

      const insert = api.calls.find(
        (c) => c.method === "POST" && c.url.endsWith("/events"),
      );
      expect(insert?.body.summary).toBe("Theory of Computation");
      expect(insert?.body.recurrence).toContain(
        "RRULE:FREQ=WEEKLY;UNTIL=20260601T235959Z",
      );
    } finally {
      api.restore();
    }
  });

  it("reuses the existing calendar and updates events in place", async () => {
    const known = parseICalToGoogleEvents(ICS);
    const api = mockCalendarApi({
      existingCalendar: true,
      ownedEventIds: [known[0].id, "stale-event"],
    });
    try {
      const result = await syncICalToGoogleCalendar({
        token: "tok",
        ics: ICS,
        regNo: "22BCE1234",
      });

      expect(result.calendarId).toBe("cal-1");
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      // The event that is no longer in the schedule is removed.
      expect(result.removed).toBe(1);

      const patch = api.calls.find((c) => c.method === "PATCH");
      expect(patch?.url).toContain(known[0].id);
      // The id is immutable, so it is not part of an update body.
      expect(patch?.body.id).toBeUndefined();

      const del = api.calls.find((c) => c.method === "DELETE");
      expect(del?.url).toContain("stale-event");
    } finally {
      api.restore();
    }
  });
});
