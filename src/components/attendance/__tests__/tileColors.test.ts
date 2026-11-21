import { describe, expect, test } from 'bun:test';
import { tileCategoryFor, tileStyleFor } from '../ClassHistory';

describe('attendance tile colour categories', () => {
  test('maps Android status strings to the four tile categories', () => {
    expect(tileCategoryFor('Present')).toBe('present');
    expect(tileCategoryFor('Present (Late)')).toBe('present');
    expect(tileCategoryFor('Absent')).toBe('absent');
    expect(tileCategoryFor('On Duty')).toBe('other');
    expect(tileCategoryFor('On Leave')).toBe('other');
    expect(tileCategoryFor('Excused')).toBe('other');
    expect(tileCategoryFor('Medical Leave')).toBe('other');
    expect(tileCategoryFor('Upcoming')).toBe('upcoming');
    expect(tileCategoryFor('')).toBe('other');
  });

  test('tile styles are token-only so light/dark hexes stay in CSS', () => {
    expect(tileStyleFor('Present')).toEqual({
      backgroundColor: 'var(--att-present-tile)',
      color: 'var(--att-on-present-tile)',
    });
    expect(tileStyleFor('Absent')).toEqual({
      backgroundColor: 'var(--att-absent-tile)',
      color: 'var(--att-on-absent-tile)',
    });
    expect(tileStyleFor('On Duty')).toEqual({
      backgroundColor: 'var(--att-other-tile)',
      color: 'var(--att-on-other-tile)',
    });
    expect(tileStyleFor('Upcoming')).toEqual({
      backgroundColor: 'var(--att-upcoming-tile)',
      color: 'var(--att-on-upcoming-tile)',
    });
    for (const status of ['Present', 'Absent', 'Excused', 'Upcoming']) {
      for (const value of Object.values(tileStyleFor(status))) {
        expect(value?.startsWith('var(')).toBe(true);
      }
    }
  });
});
