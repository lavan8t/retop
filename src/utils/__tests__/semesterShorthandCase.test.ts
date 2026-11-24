import { describe, expect, it } from 'bun:test';
import { formatSemesterShorthand } from '../formatting';

describe('formatSemesterShorthand label casing', () => {
  it('writes common terms in sentence case', () => {
    expect(formatSemesterShorthand('Fall 2026-2027')).toBe('Fall 26-27');
    expect(formatSemesterShorthand('FALL 2026-2027')).toBe('Fall 26-27');
    expect(formatSemesterShorthand('WINTER 2026-2027')).toBe('Winter 26-27');
    expect(formatSemesterShorthand('Summer 2025-2026')).toBe('Summer 25-26');
    expect(formatSemesterShorthand('Tri 2026-2027')).toBe('Tri 26-27');
  });

  it('keeps the parenthetical tag casing', () => {
    expect(formatSemesterShorthand('FALL 2026-2027 (INDUSTRY)')).toBe(
      'Fall 26-27 (Ind)',
    );
    expect(formatSemesterShorthand('Fall 2026-2027 (LLM)')).toBe(
      'Fall 26-27 (LLM)',
    );
  });

  it('sentence-cases an unknown term when a year is present', () => {
    expect(formatSemesterShorthand('special TERM 2026-2027')).toBe(
      'Special 26-27',
    );
    expect(formatSemesterShorthand('')).toBe('');
  });
});
