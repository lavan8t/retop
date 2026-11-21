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
