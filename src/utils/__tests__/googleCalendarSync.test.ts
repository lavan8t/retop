import { afterAll, beforeAll, describe, expect, it } from "bun:test";

/**
 * End-to-end check of the Calendar sync: the real background worker drives
 * the real Calendar API client against a local mock of the Google Calendar
 * API, so URLs, methods, headers and payloads are all exercised over HTTP.
 */

interface Recorded {
  method: string;
  path: string;
  auth: string | null;
  body: any;
}

let server: ReturnType<typeof Bun.serve>;
let port = 0;
let calls: Recorded[] = [];
let existingCalendar = false;
let ownedIds: string[] = [];

/**
 * The test runner registers a DOM, which replaces the global Response with a
 * browser one that the server refuses. Take the native class from Bun.fetch.
 */
const NativeResponse = (await Bun.fetch("data:application/json,%7B%7D"))
  .constructor as any;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;
      const auth = req.headers.get("authorization");
      const raw = await req.text();
      const body = raw ? JSON.parse(raw) : undefined;
      calls.push({ method, path: url.pathname + url.search, auth, body });

      const json = (data: any) =>
        new NativeResponse(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });

      if (method === "GET" && url.pathname === "/calendar/v3/users/me/calendarList") {
        return json({
          items: existingCalendar
            ? [{ id: "cal-existing", summary: "retop - 22BCE1234" }]
            : [{ id: "cal-other", summary: "Personal" }],
        });
      }
      if (method === "POST" && url.pathname === "/calendar/v3/users/me/calendarList") {
        return json({ id: "cal-created", summary: body.summary });
      }
      if (method === "GET" && url.pathname.endsWith("/events") && url.pathname.includes("/calendars/")) {
        return json({ items: ownedIds.map((id) => ({ id })) });
      }
      if (method === "DELETE") return new NativeResponse(null, { status: 204 });
      return json({ id: "evt" });
    },
  });
  port = server.port!;
});

afterAll(() => {
  server?.stop(true);
});

/** Minimal chrome stub so the real worker module can boot. */
const makeChromeStub = (initialManifest: any) => {
  const listeners: ((msg: any, sender: any, respond: (r: any) => void) => void)[] =
    [];
  const stub: any = {
    manifest: initialManifest,
    runtime: {
      id: "retop-test",
      onInstalled: { addListener: () => {} },
      onMessage: {
        addListener: (fn: any) => listeners.push(fn),
      },
      getManifest: () => stub.manifest,
      getURL: (p: string) => `chrome-extension://retop-test/${p}`,
      lastError: undefined,
    },
    action: { onClicked: { addListener: () => {} } },
    downloads: { onDeterminingFilename: { addListener: () => {} } },
    identity: {
      getAuthToken: async (details: any) => ({
        token: details?.interactive ? "token-interactive" : "token-cached",
        grantedScopes: ["https://www.googleapis.com/auth/calendar"],
      }),
    },
    windows: {
      getAll: async () => [],
      update: async () => {},
    },
    storage: {
      local: {
        get: (_k: any, cb: any) => cb?.({}),
        set: (_k: any, cb: any) => cb?.(),
        remove: (_k: any, cb: any) => cb?.(),
      },
    },
  };
  return { stub, listeners };
};

const sendMessage = (listeners: any[], message: any): Promise<any> =>
  new Promise((resolve) => {
    listeners[0](message, { origin: "https://vtop.vit.ac.in" }, resolve);
  });

describe("background worker Google Calendar sync", () => {
  let listeners: any[];
  let chromeStub: any;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(async () => {
    originalFetch = globalThis.fetch;
    const { stub, listeners: l } = makeChromeStub({
      oauth2: { client_id: "123.apps.googleusercontent.com" },
    });
    (globalThis as any).chrome = stub;
    chromeStub = stub;
    listeners = l;

    // Point the Calendar API at the local mock, keeping the real code path.
    // Bun.fetch is used because the test runner registers a DOM (and with it a
    // strict XHR-based fetch) that refuses plain http.
    globalThis.fetch = (async (input: any, init: any) => {
      const url = String(input);
      if (url.startsWith("https://www.googleapis.com/")) {
        return Bun.fetch(
          `http://127.0.0.1:${port}${url.replace(
            "https://www.googleapis.com",
            "",
          )}`,
          init,
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    await import("../../background");
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).chrome;
  });

  it("creates the calendar, writes the events and reports the result", async () => {
    calls = [];
    existingCalendar = false;
    ownedIds = [];

    const res = await sendMessage(listeners, {
      action: "GOOGLE_CALENDAR_SYNC",
      regNo: "22BCE1234",
      ics: [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:BCSE101-20260105T090000-Monday@retop",
        "DTSTART;TZID=Asia/Kolkata:20260105T090000",
        "DTEND;TZID=Asia/Kolkata:20260105T095000",
        "RRULE:FREQ=WEEKLY;UNTIL=20260601T235959Z",
        "EXDATE;TZID=Asia/Kolkata:20260202T090000",
        "SUMMARY:Theory of Computation",
        "LOCATION:AB1-305",
        "BEGIN:VALARM",
        "TRIGGER:-PT10M",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    });

    expect(res.success).toBe(true);
    expect(res.calendarName).toBe("retop - 22BCE1234");
    expect(res.total).toBe(1);
    expect(res.created).toBe(1);

    // The calendar was created with the reg-no name.
    const create = calls.find(
      (c) => c.method === "POST" && c.path === "/calendar/v3/users/me/calendarList",
    );
    expect(create?.body.summary).toBe("retop - 22BCE1234");
    expect(create?.body.timeZone).toBe("Asia/Kolkata");

    // Every API call carried the OAuth token.
    for (const call of calls) {
      expect(call.auth).toBe("Bearer token-cached");
    }

    // The event was inserted with the recurrence rules intact.
    const insert = calls.find(
      (c) => c.method === "POST" && c.path.endsWith("/events"),
    );
    expect(insert?.body.summary).toBe("Theory of Computation");
    expect(insert?.body.location).toBe("AB1-305");
    expect(insert?.body.start).toEqual({
      dateTime: "2026-01-05T09:00:00",
      timeZone: "Asia/Kolkata",
    });
    expect(insert?.body.recurrence).toEqual([
      "RRULE:FREQ=WEEKLY;UNTIL=20260601T235959Z",
      "EXDATE;TZID=Asia/Kolkata:20260202T090000",
    ]);
    expect(insert?.body.reminders.overrides[0].minutes).toBe(10);
    expect(insert?.body.extendedProperties.private.retopSync).toBe("1");
  });

  it("reuses an existing calendar, patches known events and drops stale ones", async () => {
    calls = [];
    existingCalendar = true;

    // Discover the id the first sync would have used.
    ownedIds = [];
    const first = await sendMessage(listeners, {
      action: "GOOGLE_CALENDAR_SYNC",
      regNo: "22BCE1234",
      ics: [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:exam-BCSE101-20260301T090000@retop",
        "DTSTART;TZID=Asia/Kolkata:20260301T090000",
        "DTEND;TZID=Asia/Kolkata:20260301T110000",
        "SUMMARY:[EXAM] Theory of Computation (BCSE101)",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    });
    const insertedId = calls.find((c) => c.method === "POST" && c.path.endsWith("/events"))?.body
      .id;

    // Now pretend that event plus a stale one already exist.
    ownedIds = [insertedId, "stale-event-id"];
    calls = [];

    const res = await sendMessage(listeners, {
      action: "GOOGLE_CALENDAR_SYNC",
      regNo: "22BCE1234",
      ics: [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:exam-BCSE101-20260301T090000@retop",
        "DTSTART;TZID=Asia/Kolkata:20260301T090000",
        "DTEND;TZID=Asia/Kolkata:20260301T110000",
        "SUMMARY:[EXAM] Theory of Computation (BCSE101)",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    });

    expect(res.success).toBe(true);
    expect(res.calendarId).toBe("cal-existing");
    expect(res.updated).toBe(1);
    expect(res.created).toBe(0);
    expect(res.removed).toBe(1);

    // No calendar was created this time.
    expect(
      calls.some((c) => c.method === "POST" && c.path === "/calendar/v3/users/me/calendarList"),
    ).toBe(false);

    // The known event was patched, not inserted.
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.path).toContain(insertedId);
    expect(patch?.body.id).toBeUndefined();

    // The stale event was deleted.
    const del = calls.find((c) => c.method === "DELETE");
    expect(del?.path).toContain("stale-event-id");
  });

  it("reports a clear error when the build has no OAuth client configured", async () => {
    chromeStub.manifest = {
      oauth2: { client_id: "REPLACE-ME.apps.googleusercontent.com" },
    };

    const res = await sendMessage(listeners, {
      action: "GOOGLE_CALENDAR_SYNC",
      regNo: "22BCE1234",
      ics: "BEGIN:VCALENDAR\nEND:VCALENDAR",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("GOOGLE_CALENDAR.md");
  });
});
