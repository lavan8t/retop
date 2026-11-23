import { describe, expect, it } from 'bun:test';
import { isViewAvailableOnCampus } from '../routes';

describe('campus-scoped page availability', () => {
  it('only exposes biometric on VIT-AP', () => {
    expect(isViewAvailableOnCampus('biometric', 'vitap')).toBe(true);
    expect(isViewAvailableOnCampus('biometric', 'vellore')).toBe(false);
    expect(isViewAvailableOnCampus('biometric', 'chennai')).toBe(false);
  });

  it('keeps every other view available everywhere', () => {
    for (const campus of ['vitap', 'vellore', 'chennai']) {
      expect(isViewAvailableOnCampus('dashboard', campus)).toBe(true);
      expect(isViewAvailableOnCampus('examSchedule', campus)).toBe(true);
      expect(isViewAvailableOnCampus('attendance', campus)).toBe(true);
    }
  });
});
