import { describe, expect, it } from 'bun:test';
import {
  canonicalSemesterId,
  formatSemesterLabel,
  isSameSemester,
} from '../semesterIdentity';

describe('semester identity', () => {
  it('canonicalizes VTOP semester IDs once', () => {
    expect(canonicalSemesterId('VL20262701')).toBe('vl2026271');
    expect(canonicalSemesterId('VL2026271')).toBe('vl2026271');
    expect(canonicalSemesterId('')).toBe('');
  });

  it('compares semesters through the canonical key', () => {
    expect(isSameSemester('VL20262701', 'VL2026271')).toBe(true);
    expect(isSameSemester('vl20262701', 'VL2026271')).toBe(true);
    expect(isSameSemester('VL20262701', 'VL20262702')).toBe(false);
    expect(isSameSemester('', 'VL20262701')).toBe(false);
    expect(isSameSemester('VL20262701', '')).toBe(false);
  });

  it('keeps display-label cleanup separate from identity', () => {
    expect(formatSemesterLabel('Fall 2025-2026 &amp; Winter (VLR)')).toBe(
      'Fall 2025-2026 & Winter',
    );
    expect(formatSemesterLabel('  Summer   2026 - CHN ')).toBe('Summer 2026');
  });
});
