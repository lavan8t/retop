import { describe, expect, it } from 'bun:test';
import { formatSyncAge } from '../formatting';

describe('formatSyncAge (reload tooltip)', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime();

  it('has no age when a page has never synced', () => {
    expect(formatSyncAge(undefined, now)).toBe('Not synced yet');
    expect(formatSyncAge(0, now)).toBe('Not synced yet');
  });

  it('formats minutes, hours and days', () => {
    expect(formatSyncAge(now - 30_000, now)).toBe('Synced just now');
    expect(formatSyncAge(now - 60_000, now)).toBe('Synced 1m ago');
    expect(formatSyncAge(now - 59 * 60_000, now)).toBe('Synced 59m ago');
    expect(formatSyncAge(now - 2 * 60 * 60_000, now)).toBe('Synced 2h ago');
    expect(formatSyncAge(now - 3 * 24 * 60 * 60_000, now)).toBe(
      'Synced 3d ago',
    );
  });

  it('never reports a negative age for a future timestamp', () => {
    expect(formatSyncAge(now + 5_000, now)).toBe('Synced just now');
  });
});
