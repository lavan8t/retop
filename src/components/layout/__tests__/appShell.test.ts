import { describe, expect, test } from 'bun:test';
import { NAV_DESTINATIONS, getPageTitle, isFullWidthView } from '../appShell';

describe('app shell rules', () => {
  test('exposes ten distinct primary destinations', () => {
    expect(NAV_DESTINATIONS).toHaveLength(10);
    expect(new Set(NAV_DESTINATIONS.map((d) => d.view)).size).toBe(10);
  });

  test('titles come from the active route, never from search', () => {
    expect(getPageTitle('dashboard')).toBe('Home');
    expect(getPageTitle('timetable')).toBe('Timetable');
    expect(getPageTitle('content', 'Bank Info')).toBe('Bank Info');
    expect(getPageTitle('unknown')).toBe('');
  });

  test('only the course page opts out of the readable measure', () => {
    expect(isFullWidthView('coursePage')).toBe(true);
    expect(isFullWidthView('marks')).toBe(false);
  });
});
