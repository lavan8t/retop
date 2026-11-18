import { describe, expect, test } from 'bun:test';
import { getPageTitle, isFullWidthView } from '../appShell';

describe('app shell rules', () => {
  test('page titles come from the active route, not from search', () => {
    expect(getPageTitle('dashboard')).toBe('Home');
    expect(getPageTitle('timetable')).toBe('Timetable');
    expect(getPageTitle('grades')).toBe('Grades & History');
    expect(getPageTitle('content', 'Bank Info')).toBe('Bank Info');
    expect(getPageTitle('content')).toBe('Legacy View');
    expect(getPageTitle('unknown')).toBe('');
  });

  test('only the course page opts out of the readable measure', () => {
    expect(isFullWidthView('coursePage')).toBe(true);
    expect(isFullWidthView('marks')).toBe(false);
  });
});
