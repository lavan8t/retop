import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  GCAL_ACCOUNT_KEY,
  GCAL_ENABLED_KEY,
  GCAL_HASH_KEY,
  GCAL_ID_MAP_KEY,
  type CalendarDraft,
} from '../google-calendar';

/**
 * End-to-end check of the Calendar sync: the real background worker drives the
 * real REST client against a local mock of the Google APIs.
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
let email = 'student@gmail.com';

// The test runner registers a DOM, whose Response is not accepted by Bun.serve.
const NativeResponse = (await Bun.fetch('data:application/json,%7B%7D'))
  .constructor as any;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const raw = await req.text();
      const body = raw ? JSON.parse(raw) : undefined;
      calls.push({
        method: req.method,
        path: url.pathname + url.search,
        auth: req.headers.get('authorization'),
        body,
      });
      const json = (data: any) =>
        new NativeResponse(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.pathname === '/oauth2/v3/userinfo') return json({ email });
      if (
        url.pathname === '/calendar/v3/calendars/primary/events' &&
        req.method === 'POST'
      ) {
        return json({ id: `g-${calls.length}` });
      }
      if (url.pathname.startsWith('/calendar/v3/calendars/primary/events/')) {
        return req.method === 'DELETE'
          ? new NativeResponse(null, { status: 204 })
          : json({ id: url.pathname.split('/').pop() });
      }
      return json({});
    },
  });
  port = server.port!;
});

afterAll(() => {
  server?.stop(true);
});

const makeChromeStub = () => {
  const listeners: ((
    msg: any,
    sender: any,
    respond: (r: any) => void,
  ) => void)[] = [];
  const store: Record<string, any> = {};
  const tokenCalls: any[] = [];
  const stub: any = {
    manifest: { oauth2: { client_id: '123.apps.googleusercontent.com' } },
    runtime: {
      id: 'retop-test',
      onInstalled: { addListener: () => {} },
      onMessage: { addListener: (fn: any) => listeners.push(fn) },
      getManifest: () => stub.manifest,
      getURL: (p: string) => `chrome-extension://retop-test/${p}`,
      lastError: undefined,
    },
    action: { onClicked: { addListener: () => {} } },
    downloads: { onDeterminingFilename: { addListener: () => {} } },
    identity: {
      getAuthToken: async (details: any) => {
        tokenCalls.push(details);
        return {
          token: details.interactive ? 'token-interactive' : 'token-cached',
          grantedScopes: ['https://www.googleapis.com/auth/calendar.events'],
        };
      },
    },
    windows: { getAll: async () => [], update: async () => {} },
    storage: {
      local: {
        get: (keys: any, cb: any) => {
          const wanted = Array.isArray(keys) ? keys : Object.keys(store);
          cb?.(
            Object.fromEntries(
              wanted.filter((k) => k in store).map((k) => [k, store[k]]),
            ),
          );
        },
        set: (data: any, cb: any) => {
          Object.assign(store, data);
          cb?.();
        },
        remove: (key: any, cb: any) => {
          delete store[key];
          cb?.();
        },
      },
    },
  };
  return { stub, listeners, store, tokenCalls };
};

const sendMessage = (listeners: any[], message: any): Promise<any> =>
  new Promise((resolve) => {
    listeners[0](message, { origin: 'https://vtop.vit.ac.in' }, resolve);
  });

const draft = (id: string, title = `Class ${id}`): CalendarDraft => ({
  vtopEventId: `tt|${id}|Monday|A1|CSE101`,
  title,
  start: '2026-11-23T08:00:00',
  end: '2026-11-23T08:50:00',
  description:
    'Slot: A1\nType: Theory\nFaculty: Dr Rao\nCode: CSE101\nLTPJC: 3 0 0 0 3',
  location: 'AB1-101',
  recurrence: ['FREQ=WEEKLY;BYDAY=MO'],
});

describe('background worker Google Calendar sync', () => {
  let listeners: any[];
  let chromeStub: any;
  let store: Record<string, any>;
  let tokenCalls: any[];
  let originalFetch: typeof globalThis.fetch;

  beforeAll(async () => {
    originalFetch = globalThis.fetch;
    const s = makeChromeStub();
    (globalThis as any).chrome = s.stub;
    chromeStub = s.stub;
    listeners = s.listeners;
    store = s.store;
    tokenCalls = s.tokenCalls;

    globalThis.fetch = (async (input: any, init: any) => {
      const url = String(input);
      if (url.startsWith('https://www.googleapis.com/')) {
        return Bun.fetch(
          `http://127.0.0.1:${port}${url.replace('https://www.googleapis.com', '')}`,
          init,
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    await import('../../background');
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).chrome;
  });

  it('requires an explicit interactive account connection', async () => {
    calls = [];
    tokenCalls.length = 0;
    const blocked = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_SYNC',
      drafts: [draft('a')],
    });
    expect(blocked.success).toBe(false);
    expect(blocked.error).toBe('Connect Google Account to begin.');
    expect(calls).toHaveLength(0);

    email = 'student@gmail.com';
    const connected = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_CONNECT',
    });
    expect(connected.success).toBe(true);
    expect(connected.account).toBe('student@gmail.com');
    expect(store[GCAL_ACCOUNT_KEY]).toBe('student@gmail.com');
    expect(store[GCAL_ENABLED_KEY]).toBe(true);
    expect(tokenCalls.at(-1)).toMatchObject({
      interactive: true,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const status = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_STATUS',
    });
    expect(status).toMatchObject({
      success: true,
      connected: true,
      account: 'student@gmail.com',
    });
  });

  it('rejects VIT student accounts like the app', async () => {
    email = 'student@vitstudent.ac.in';
    const res = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_CONNECT',
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('personal Google account');

    email = 'student@gmail.com';
    await sendMessage(listeners, { action: 'GOOGLE_CALENDAR_CONNECT' });
  });

  it('pushes drafts to the primary calendar with the app payload', async () => {
    calls = [];
    const res = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_SYNC',
      drafts: [draft('a'), draft('b')],
    });

    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);
    expect(res.created).toBe(2);
    expect(res.total).toBe(2);

    for (const call of calls) expect(call.auth).toBe('Bearer token-cached');
    const insert = calls.find(
      (c) =>
        c.method === 'POST' &&
        c.path === '/calendar/v3/calendars/primary/events',
    );
    expect(insert?.body).toEqual({
      summary: 'Class a',
      description: draft('a').description,
      location: 'AB1-101',
      start: { dateTime: '2026-11-23T08:00:00', timeZone: 'Asia/Kolkata' },
      end: { dateTime: '2026-11-23T08:50:00', timeZone: 'Asia/Kolkata' },
      recurrence: ['FREQ=WEEKLY;BYDAY=MO'],
    });
    expect(insert?.body.reminders).toBeUndefined();
    expect(insert?.body.extendedProperties).toBeUndefined();
    expect(Object.keys(store[GCAL_ID_MAP_KEY])).toHaveLength(2);
    expect(store[GCAL_HASH_KEY]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('skips a repeated sync with an unchanged source hash', async () => {
    calls = [];
    const res = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_SYNC',
      drafts: [draft('a'), draft('b')],
    });
    expect(res.success).toBe(true);
    expect(res.changed).toBe(false);
    expect(res.created).toBe(0);
    expect(res.updated).toBe(0);
    expect(res.removed).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('patches changed events and deletes stale ones without duplicating', async () => {
    calls = [];
    const knownId = Object.values(store[GCAL_ID_MAP_KEY])[0] as string;
    const res = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_SYNC',
      drafts: [draft('a', 'Renamed class')],
    });

    expect(res.success).toBe(true);
    expect(res.updated).toBe(1);
    expect(res.removed).toBe(1);
    expect(Object.keys(store[GCAL_ID_MAP_KEY])).toHaveLength(1);

    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch?.path).toContain(knownId);
    expect(patch?.body.summary).toBe('Renamed class');
    expect(patch?.body.id).toBeUndefined();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
  });

  it('reports a clear error when the build has no OAuth client configured', async () => {
    chromeStub.manifest = {
      oauth2: { client_id: 'REPLACE-ME.apps.googleusercontent.com' },
    };
    const res = await sendMessage(listeners, {
      action: 'GOOGLE_CALENDAR_SYNC',
      drafts: [draft('a')],
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('GOOGLE_CALENDAR.md');
    chromeStub.manifest = {
      oauth2: { client_id: '123.apps.googleusercontent.com' },
    };
  });
});
