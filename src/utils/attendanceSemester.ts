/**
 * Last-picked attendance semester, scoped by registration number so one
 * signed-in student's choice never leaks into another's.
 */

export const attendanceSemesterKey = (authId: string): string =>
  `retop_att_sem_${authId || 'anon'}`;

/** The active registration number, the same source the rest of the app uses. */
export function currentAuthId(): string {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem('retop_active_user') ||
    localStorage.getItem('retop_lastAuthId') ||
    ''
  ).trim();
}

/** Fallback owner for offline/no-login data; long enough to stay a cache prefix. */
export const ANONYMOUS_ACCOUNT = 'anon_account';

/** The one account scope used by caches and calendar keys when offline. */
export function currentCacheAccount(): string {
  return currentAuthId() || ANONYMOUS_ACCOUNT;
}

/** Scopes a legacy localStorage preference to the current account. */
export const scopedPreferenceKey = (legacyKey: string): string =>
  `${legacyKey}-${currentCacheAccount()}`;

export function readLastAttendanceSemester(authId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(attendanceSemesterKey(authId)) || null;
}

export function writeLastAttendanceSemester(
  authId: string,
  semId: string,
): void {
  if (typeof localStorage === 'undefined' || !semId) return;
  localStorage.setItem(attendanceSemesterKey(authId), semId);
}
