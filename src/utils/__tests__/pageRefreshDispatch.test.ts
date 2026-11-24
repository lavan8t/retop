import { describe, expect, it } from 'bun:test';
import { dispatchPageRefresh, PAGE_REFRESH_EVENTS } from '../routes';

const allEvents = Object.values(PAGE_REFRESH_EVENTS).filter(
  (name): name is string => Boolean(name),
);

describe('shell reload dispatch', () => {
  it('notifies only the open page (assignments) with its detail', () => {
    const seen: { name: string; detail: unknown }[] = [];
    const handlers = allEvents.map((name) => {
      const handler = (event: Event) =>
        seen.push({ name, detail: (event as CustomEvent).detail });
      window.addEventListener(name, handler);
      return { name, handler };
    });

    try {
      const event = dispatchPageRefresh('digitalAssignments', {
        sem: 'FALL26',
      });
      expect(event).toBe('retop-refresh-digital-assignments');
      expect(seen).toEqual([
        {
          name: 'retop-refresh-digital-assignments',
          detail: { sem: 'FALL26' },
        },
      ]);
    } finally {
      handlers.forEach(({ name, handler }) =>
        window.removeEventListener(name, handler),
      );
    }
  });

  it('does not fall back to an account-wide sync for a non-page view', () => {
    const seen: string[] = [];
    const handler = (event: Event) => seen.push(event.type);
    allEvents.forEach((name) => window.addEventListener(name, handler));
    try {
      expect(dispatchPageRefresh('dashboard')).toBeNull();
      expect(seen).toEqual([]);
    } finally {
      allEvents.forEach((name) => window.removeEventListener(name, handler));
    }
  });
});
