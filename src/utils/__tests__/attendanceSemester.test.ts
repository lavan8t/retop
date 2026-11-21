import { describe, expect, it, beforeEach } from 'bun:test';
import {
  attendanceSemesterKey,
  currentAuthId,
  readLastAttendanceSemester,
  writeLastAttendanceSemester,
} from '../attendanceSemester';

describe('attendance semester persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('scopes the storage key by registration number', () => {
    expect(attendanceSemesterKey('26BEE7068')).toBe('retop_att_sem_26BEE7068');
    expect(attendanceSemesterKey('21BCE0001')).toBe('retop_att_sem_21BCE0001');
    expect(attendanceSemesterKey('26BEE7068')).not.toBe(
      attendanceSemesterKey('21BCE0001'),
    );
  });

  it('round-trips the last picked semester for one user', () => {
    expect(readLastAttendanceSemester('26BEE7068')).toBeNull();
    writeLastAttendanceSemester('26BEE7068', 'VL20262701');
    expect(readLastAttendanceSemester('26BEE7068')).toBe('VL20262701');
  });

  it('isolates the last pick between users', () => {
    writeLastAttendanceSemester('26BEE7068', 'VL20262701');
    writeLastAttendanceSemester('21BCE0001', 'VL20252401');
    expect(readLastAttendanceSemester('26BEE7068')).toBe('VL20262701');
    expect(readLastAttendanceSemester('21BCE0001')).toBe('VL20252401');
  });

  it('reads the active registration number from storage', () => {
    expect(currentAuthId()).toBe('');
    localStorage.setItem('retop_lastAuthId', '26BEE7068');
    expect(currentAuthId()).toBe('26BEE7068');
    localStorage.setItem('retop_active_user', '21BCE0001');
    expect(currentAuthId()).toBe('21BCE0001');
  });

  it('ignores empty semester writes', () => {
    writeLastAttendanceSemester('26BEE7068', '');
    expect(readLastAttendanceSemester('26BEE7068')).toBeNull();
  });
});
