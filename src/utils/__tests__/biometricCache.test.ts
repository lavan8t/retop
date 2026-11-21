import { describe, expect, it, beforeEach } from 'bun:test';
import {
  biometricCacheKey,
  isPastDate,
  readBiometricCache,
  recentPastDates,
  toIsoDate,
  writeBiometricCache,
} from '../biometricCache';
import { BiometricPunch } from '../../types/vtop';

const NOW = new Date(2026, 10, 21, 13, 0, 0); // 2026-11-21, local time

const punch = (time: string): BiometricPunch => ({
  slNo: '1',
  punchDate: '20/11/2026',
  punchTime: time,
  venue: 'AB2-301-FACE',
});

describe('biometric cache date rules', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('formats a local date as zero-padded yyyy-mm-dd', () => {
    expect(toIsoDate(new Date(2026, 0, 2, 23, 30))).toBe('2026-01-02');
  });

  it('treats only strictly past dates as cacheable', () => {
    expect(isPastDate('2026-11-20', NOW)).toBe(true);
    expect(isPastDate('2026-11-21', NOW)).toBe(false);
    expect(isPastDate('2026-11-22', NOW)).toBe(false);
  });

  it('builds a registration-scoped cache key', () => {
    expect(biometricCacheKey('26BEE7068', '2026-11-20')).toBe(
      'retop_biometric_26BEE7068_2026-11-20',
    );
  });

  it('lists recent past days newest-first without including today', () => {
    expect(recentPastDates(3, NOW)).toEqual([
      '2026-11-20',
      '2026-11-19',
      '2026-11-18',
    ]);
  });

  it('crosses month/year boundaries correctly', () => {
    expect(recentPastDates(3, new Date(2026, 2, 1, 9))).toEqual([
      '2026-02-28',
      '2026-02-27',
      '2026-02-26',
    ]);
  });
});

describe('biometric cache read/write', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('caches a past date and reads it back (cache-first)', async () => {
    const punches = [punch('08:47'), punch('15:28')];
    await writeBiometricCache('26BEE7068', '2026-11-20', punches, NOW);
    expect(await readBiometricCache('26BEE7068', '2026-11-20', NOW)).toEqual(
      punches,
    );
  });

  it('never writes today, even if asked to', async () => {
    await writeBiometricCache('26BEE7068', '2026-11-21', [punch('08:47')], NOW);
    expect(localStorage.getItem('retop_biometric_26BEE7068_2026-11-21')).toBe(
      null,
    );
    expect(await readBiometricCache('26BEE7068', '2026-11-21', NOW)).toBe(null);
  });

  it('ignores a stale key for today if one somehow exists', async () => {
    localStorage.setItem(
      'retop_biometric_26BEE7068_2026-11-21',
      JSON.stringify([punch('08:47')]),
    );
    expect(await readBiometricCache('26BEE7068', '2026-11-21', NOW)).toBe(null);
  });

  it('ignores malformed cached values', async () => {
    localStorage.setItem(
      'retop_biometric_26BEE7068_2026-11-20',
      JSON.stringify({ nope: true }),
    );
    expect(await readBiometricCache('26BEE7068', '2026-11-20', NOW)).toBe(null);
  });

  it('scopes cached data by registration number', async () => {
    await writeBiometricCache('26BEE7068', '2026-11-20', [punch('08:47')], NOW);
    expect(await readBiometricCache('21BCE1234', '2026-11-20', NOW)).toBe(null);
  });
});
